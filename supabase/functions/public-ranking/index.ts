import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = (req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "").trim();
    if (!apiKey) return json({ error: "Missing x-api-key" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();
    const requesterUserId = String(body.requester_user_id ?? "").trim();
    const targetUserId = String(body.target_user_id ?? "").trim();

    if (action !== "promote" && action !== "demote") {
      return json({ error: "action must be 'promote' or 'demote'" }, 400);
    }
    if (!requesterUserId || !targetUserId) {
      return json({ error: "requester_user_id and target_user_id are required" }, 400);
    }
    if (requesterUserId === targetUserId) {
      return json({ error: "You can't rank yourself" }, 403);
    }

    // Look up workspace by hashed API key
    const { data: wsIdData } = await supabase.rpc("internal_workspace_id_by_api_key", { _api_key: apiKey });
    const wsId = wsIdData as string | null;
    if (!wsId) return json({ error: "Invalid API key" }, 401);

    const { data: wsRow } = await supabase
      .from("workspaces")
      .select("id, owner_id, roblox_group_id")
      .eq("id", wsId)
      .maybeSingle();
    const { data: secretsRow } = await supabase.rpc("internal_get_workspace_secrets", { _workspace_id: wsId });
    const secrets = (Array.isArray(secretsRow) ? secretsRow[0] : secretsRow) || {};
    const ws: any = wsRow ? { ...wsRow, roblox_api_key: secrets.roblox_api_key } : null;

    if (!ws) return json({ error: "Invalid API key" }, 401);
    if (!ws.roblox_api_key || !ws.roblox_group_id) {
      return json({ error: "Roblox Open Cloud API key or group ID not configured for this workspace" }, 400);
    }

    const robloxKey = String(ws.roblox_api_key).trim();
    const groupId = String(ws.roblox_group_id).trim();

    // Permission check: is requester the workspace owner, or a member with manage_members?
    let hasPerm = false;

    // Find requester's verified_users -> user_id, then check ownership
    const { data: reqVerified } = await supabase
      .from("verified_users")
      .select("user_id")
      .eq("roblox_user_id", requesterUserId)
      .maybeSingle();

    if (reqVerified?.user_id && reqVerified.user_id === ws.owner_id) {
      hasPerm = true;
    }

    // Find membership row in this workspace
    const { data: reqMember } = await supabase
      .from("workspace_members")
      .select("id, role_id")
      .eq("workspace_id", ws.id)
      .eq("roblox_user_id", requesterUserId)
      .maybeSingle();

    if (!hasPerm && reqMember) {
      // Per-member explicit permission grant
      const { data: explicit } = await supabase
        .from("workspace_permissions")
        .select("id")
        .eq("workspace_id", ws.id)
        .eq("member_id", reqMember.id)
        .eq("permission", "manage_members")
        .maybeSingle();
      if (explicit) hasPerm = true;

      // Role-based permission
      if (!hasPerm && reqMember.role_id) {
        const { data: role } = await supabase
          .from("workspace_roles")
          .select("permissions")
          .eq("id", reqMember.role_id)
          .maybeSingle();
        const perms = Array.isArray(role?.permissions) ? role!.permissions as string[] : [];
        if (perms.includes("manage_members")) hasPerm = true;
      }
    }

    if (!hasPerm) {
      return json({ error: "Requester does not have ranking permission in this workspace" }, 403);
    }

    // Fetch all Roblox group roles (paginated)
    async function fetchAllRoles(): Promise<any[]> {
      let all: any[] = [];
      let token: string | null = null;
      for (let i = 0; i < 20; i++) {
        let url = `https://apis.roblox.com/cloud/v2/groups/${groupId}/roles?maxPageSize=50`;
        if (token) url += `&pageToken=${token}`;
        const r = await fetch(url, { headers: { "x-api-key": robloxKey } });
        if (!r.ok) throw new Error(`Failed to fetch group roles: ${await r.text()}`);
        const d = await r.json();
        all = all.concat(d.groupRoles || []);
        if (!d.nextPageToken) break;
        token = d.nextPageToken;
      }
      return all;
    }

    const roles = await fetchAllRoles();
    // Roles excluding Guest (rank 0), sorted ascending by rank
    const ladder = roles
      .filter((r: any) => (r.rank ?? 0) > 0)
      .sort((a: any, b: any) => (a.rank ?? 0) - (b.rank ?? 0));

    // Get target membership
    const targetMembRes = await fetch(
      `https://apis.roblox.com/cloud/v2/groups/${groupId}/memberships?filter=user=='users/${targetUserId}'&maxPageSize=1`,
      { headers: { "x-api-key": robloxKey } },
    );
    if (!targetMembRes.ok) {
      return json({ error: "Failed to look up target in group" }, 502);
    }
    const targetMembData = await targetMembRes.json();
    const targetMembership = targetMembData.groupMemberships?.[0];
    if (!targetMembership) return json({ error: "Target user is not in the Roblox group" }, 404);

    const targetRoleId = String(targetMembership.role || "").split("/").pop();
    const currentIdx = ladder.findIndex((r: any) => String(r.id || "").split("/").pop() === targetRoleId);
    if (currentIdx === -1) return json({ error: "Target's current rank is not promotable" }, 404);

    const newIdx = action === "promote" ? currentIdx + 1 : currentIdx - 1;
    if (newIdx < 0 || newIdx >= ladder.length) {
      return json({ error: `No rank to ${action} into — target is already at the ${action === "promote" ? "top" : "bottom"}` }, 404);
    }

    const currentRole = ladder[currentIdx];
    const newRole = ladder[newIdx];

    // Rank protection: requester must strictly outrank both target's current AND new rank (even owner — can't rank above self)
    const reqMembRes = await fetch(
      `https://apis.roblox.com/cloud/v2/groups/${groupId}/memberships?filter=user=='users/${requesterUserId}'&maxPageSize=1`,
      { headers: { "x-api-key": robloxKey } },
    );
    let reqRole: any = null;
    if (reqMembRes.ok) {
      const reqMembData = await reqMembRes.json();
      const reqMembership = reqMembData.groupMemberships?.[0];
      const reqRoleId = String(reqMembership?.role || "").split("/").pop();
      reqRole = ladder.find((r: any) => String(r.id || "").split("/").pop() === reqRoleId);
    }
    const isOwner = reqVerified?.user_id === ws.owner_id;
    if (!isOwner) {
      if (!reqRole) {
        return json({ error: "You must be in the Roblox group to rank others" }, 403);
      }
      if ((currentRole.rank ?? 0) >= (reqRole.rank ?? 0)) {
        return json({ error: "You can't rank someone at or above your own rank" }, 403);
      }
      if ((newRole.rank ?? 0) >= (reqRole.rank ?? 0)) {
        return json({ error: "You can't rank a user to a position equal to or above your own" }, 403);
      }
    }

    const newRoleId = String(newRole.id || "").split("/").pop();
    const patchRes = await fetch(`https://apis.roblox.com/cloud/v2/${targetMembership.path}`, {
      method: "PATCH",
      headers: { "x-api-key": robloxKey, "Content-Type": "application/json" },
      body: JSON.stringify({ role: `groups/${groupId}/roles/${newRoleId}` }),
    });
    if (!patchRes.ok) {
      const t = await patchRes.text();
      return json({ error: "Roblox rejected the rank change", details: t }, 502);
    }

    // Log to member_logs against the target's workspace_member (if they're in the workspace)
    try {
      const { data: targetMember } = await supabase
        .from("workspace_members")
        .select("id, roblox_username")
        .eq("workspace_id", ws.id)
        .eq("roblox_user_id", targetUserId)
        .maybeSingle();

      const { data: reqVu } = await supabase
        .from("verified_users")
        .select("roblox_username")
        .eq("roblox_user_id", requesterUserId)
        .maybeSingle();
      const authorName = reqVu?.roblox_username || `Roblox#${requesterUserId}`;

      if (targetMember) {
        await supabase.from("member_logs").insert({
          workspace_id: ws.id,
          member_id: targetMember.id,
          author_id: reqVerified?.user_id ?? ws.owner_id,
          author_name: authorName,
          log_type: action === "promote" ? "promotion" : "demotion",
          content: `${action === "promote" ? "Promoted" : "Demoted"} from ${currentRole.displayName || currentRole.name} to ${newRole.displayName || newRole.name} via in-game !${action}`,
        });
      }
    } catch (logErr) {
      console.error("public-ranking log error:", logErr);
    }

    return json({
      success: true,
      action,
      target: { userId: Number(targetUserId) },
      from: { rank: currentRole.rank, name: currentRole.displayName || currentRole.name },
      to:   { rank: newRole.rank,     name: newRole.displayName     || newRole.name },
    });
  } catch (err: any) {
    console.error("public-ranking error:", err);
    return json({ error: err?.message || "Internal server error" }, 500);
  }
});
