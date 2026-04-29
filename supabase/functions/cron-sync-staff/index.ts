// Runs every minute via pg_cron.
// For each workspace with a Roblox API key + group:
//  - For each existing workspace_role that has a roblox_role_id mapped:
//      list group members at that rank, INSERT any missing as workspace_members
//        (user_id NULL — they become a real member when they sign in & verify)
//  - For each workspace_member with a roblox_group_rank:
//      re-check their current Roblox rank; if their rank no longer maps to ANY
//      Fluxcore role -> remove them (auto-demote/kick)
// Also: prune activity_events older than 30 days.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

async function listGroupMembersAtRole(apiKey: string, groupId: string, roleId: string) {
  // Open Cloud v2 — list memberships filtered by role
  const out: { userId: string }[] = [];
  let pageToken: string | null = null;
  let safety = 0;
  do {
    const url = new URL(`https://apis.roblox.com/cloud/v2/groups/${groupId}/memberships`);
    url.searchParams.set("filter", `role=='groups/${groupId}/roles/${roleId}'`);
    url.searchParams.set("maxPageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), { headers: { "x-api-key": apiKey } });
    if (!res.ok) break;
    const j = await res.json();
    for (const m of j.groupMemberships || []) {
      const uid = String(m.user || "").split("/").pop();
      if (uid) out.push({ userId: uid });
    }
    pageToken = j.nextPageToken || null;
    safety++;
  } while (pageToken && safety < 20);
  return out;
}

async function fetchUsernames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const map: Record<string, string> = {};
  // Roblox users batch endpoint
  try {
    const res = await fetch("https://users.roblox.com/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: userIds.map((u) => Number(u)), excludeBannedUsers: false }),
    });
    if (res.ok) {
      const j = await res.json();
      for (const u of j.data || []) map[String(u.id)] = u.name;
    }
  } catch (_) { /* ignore */ }
  return map;
}

async function fetchUserCurrentRoleInGroup(apiKey: string, groupId: string, userId: string): Promise<string | null> {
  const res = await fetch(
    `https://apis.roblox.com/cloud/v2/groups/${groupId}/memberships?filter=user=='users/${userId}'&maxPageSize=1`,
    { headers: { "x-api-key": apiKey } },
  );
  if (!res.ok) return null;
  const j = await res.json();
  const m = j.groupMemberships?.[0];
  if (!m) return null;
  return String(m.role || "").split("/").pop() || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  const summary: Record<string, any> = { workspaces: 0, added: 0, removed: 0, pruned_events: 0 };

  try {
    // 1) Prune activity_events older than 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: deletedCount } = await sb
      .from("activity_events")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);
    summary.pruned_events = deletedCount || 0;

    // 2) Workspaces with a configured group + API key + auto_rank_enabled
    const { data: workspaces } = await sb
      .from("workspaces")
      .select("id, roblox_group_id, roblox_api_key, auto_rank_enabled")
      .not("roblox_api_key", "is", null)
      .not("roblox_group_id", "is", null)
      .eq("auto_rank_enabled", true);

    for (const ws of workspaces || []) {
      summary.workspaces++;
      const groupId = ws.roblox_group_id as string;
      const apiKey = ws.roblox_api_key as string;

      // Roles with mapping
      const { data: roles } = await sb
        .from("workspace_roles")
        .select("id, name, roblox_role_id")
        .eq("workspace_id", ws.id)
        .not("roblox_role_id", "is", null);
      if (!roles || roles.length === 0) continue;

      const roleByRobloxId = new Map<string, { id: string; name: string }>();
      for (const r of roles) roleByRobloxId.set(r.roblox_role_id as string, { id: r.id, name: r.name });

      // Existing members keyed by roblox_user_id
      const { data: members } = await sb
        .from("workspace_members")
        .select("id, roblox_user_id, role_id, user_id")
        .eq("workspace_id", ws.id);
      const memberByUid = new Map<string, any>();
      for (const m of members || []) memberByUid.set(String(m.roblox_user_id), m);

      // 2a) ADD missing staff per mapped role
      for (const r of roles) {
        const inRole = await listGroupMembersAtRole(apiKey, groupId, r.roblox_role_id as string);
        const missing: string[] = [];
        for (const { userId } of inRole) {
          if (!memberByUid.has(userId)) missing.push(userId);
        }
        if (missing.length > 0) {
          const names = await fetchUsernames(missing);
          const rows = missing.map((uid) => ({
            workspace_id: ws.id,
            roblox_user_id: uid,
            roblox_username: names[uid] || `User${uid}`,
            role: r.name,
            role_id: r.id,
            verified: false,
            user_id: null,
          })).filter(r => r.roblox_username); // Ensure we don't insert empty/failed lookups
          
          if (rows.length > 0) {
            const { error: insErr, count } = await sb
              .from("workspace_members")
              .insert(rows, { count: "exact" });
            if (!insErr) summary.added += count || rows.length;
          }
        }
      }

      // 2b) REMOVE members whose current Roblox rank is NOT in the mapping
      const toCheck = (members || []).slice(0, 50);
      for (const m of toCheck) {
        try {
          const currentRoleId = await fetchUserCurrentRoleInGroup(apiKey, groupId, String(m.roblox_user_id));
          // Not in group OR rank not mapped -> remove
          const stillStaff = currentRoleId && roleByRobloxId.has(currentRoleId);
          if (!stillStaff) {
            await sb.from("workspace_members").delete().eq("id", m.id);
            summary.removed++;
          } else {
            // Sync role if changed
            const target = roleByRobloxId.get(currentRoleId!)!;
            if (target.id !== m.role_id) {
              await sb.from("workspace_members").update({
                role_id: target.id,
                role: target.name,
                updated_at: new Date().toISOString(),
              }).eq("id", m.id);
            }
          }
        } catch (_) { /* skip individual failures */ }
      }
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("cron-sync-staff error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error", summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
