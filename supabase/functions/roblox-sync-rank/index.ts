import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetches a Roblox user's role in the group via Open Cloud
async function fetchGroupRoleId(apiKey: string, groupId: string, robloxUserId: string): Promise<{ roleIdShort: string; rank: number } | null> {
  const res = await fetch(
    `https://apis.roblox.com/cloud/v2/groups/${groupId}/memberships?filter=user=='users/${robloxUserId}'&maxPageSize=1`,
    { headers: { "x-api-key": apiKey } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const m = data.groupMemberships?.[0];
  if (!m) return null;
  const roleId = m.role?.split("/").pop();

  // Get rank by listing roles (cheap; cached by client)
  const rRes = await fetch(
    `https://apis.roblox.com/cloud/v2/groups/${groupId}/roles/${roleId}`,
    { headers: { "x-api-key": apiKey } }
  );
  let rank = 0;
  if (rRes.ok) {
    const rData = await rRes.json();
    rank = rData.rank || 0;
  }
  return { roleIdShort: roleId, rank };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, workspace_id, member_id } = await req.json();

    const { data: ws } = await sb
      .from("workspaces")
      .select("roblox_api_key, roblox_group_id, owner_id")
      .eq("id", workspace_id)
      .single();
    if (!ws?.roblox_api_key || !ws?.roblox_group_id) {
      return new Response(JSON.stringify({ error: "Roblox API key or Group ID not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: auto_join — if caller is in the Roblox group AND a workspace_role maps to their rank, insert membership
    if (action === "auto_join") {
      const { data: verified } = await sb
        .from("verified_users")
        .select("roblox_user_id, roblox_username")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!verified) {
        return new Response(JSON.stringify({ error: "Verify your Roblox account first" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Blacklist check
      const { data: bl } = await sb.from("workspace_blacklist").select("id")
        .eq("workspace_id", workspace_id).eq("roblox_user_id", verified.roblox_user_id).maybeSingle();
      if (bl) {
        return new Response(JSON.stringify({ error: "You are blacklisted from this workspace" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const groupRole = await fetchGroupRoleId(ws.roblox_api_key, ws.roblox_group_id, verified.roblox_user_id);
      if (!groupRole) {
        return new Response(JSON.stringify({ error: "You are not in this Roblox group" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find workspace role with matching roblox_role_id
      const { data: wsRole } = await sb
        .from("workspace_roles")
        .select("id, name")
        .eq("workspace_id", workspace_id)
        .eq("roblox_role_id", groupRole.roleIdShort)
        .maybeSingle();
      if (!wsRole) {
        return new Response(JSON.stringify({ error: "Your group rank is not mapped to a Fluxcore role. Ask the workspace owner to import roles." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Already member?
      const { data: existing } = await sb.from("workspace_members").select("id")
        .eq("workspace_id", workspace_id).eq("user_id", user.id).maybeSingle();
      if (existing) {
        // Sync role
        await sb.from("workspace_members").update({
          role_id: wsRole.id,
          role: wsRole.name,
          roblox_group_rank: groupRole.rank,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        return new Response(JSON.stringify({ success: true, joined: false, synced: true, role_name: wsRole.name }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: insErr } = await sb.from("workspace_members").insert({
        workspace_id,
        user_id: user.id,
        roblox_user_id: verified.roblox_user_id,
        roblox_username: verified.roblox_username,
        role: wsRole.name,
        role_id: wsRole.id,
        roblox_group_rank: groupRole.rank,
        verified: true,
      });
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, joined: true, role_name: wsRole.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: sync_member — pull current Roblox rank for one member, update Fluxcore role
    if (action === "sync_member") {
      const { data: mem } = await sb.from("workspace_members")
        .select("id, roblox_user_id, role_id")
        .eq("id", member_id)
        .eq("workspace_id", workspace_id)
        .maybeSingle();
      if (!mem) {
        return new Response(JSON.stringify({ error: "Member not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const groupRole = await fetchGroupRoleId(ws.roblox_api_key, ws.roblox_group_id, mem.roblox_user_id);
      if (!groupRole) {
        return new Response(JSON.stringify({ success: true, synced: false, reason: "not_in_group" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: wsRole } = await sb.from("workspace_roles")
        .select("id, name")
        .eq("workspace_id", workspace_id)
        .eq("roblox_role_id", groupRole.roleIdShort)
        .maybeSingle();
      if (!wsRole) {
        return new Response(JSON.stringify({ success: true, synced: false, reason: "no_mapping", rank: groupRole.rank }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await sb.from("workspace_members").update({
        role_id: wsRole.id,
        role: wsRole.name,
        roblox_group_rank: groupRole.rank,
        updated_at: new Date().toISOString(),
      }).eq("id", mem.id);
      return new Response(JSON.stringify({ success: true, synced: true, role_name: wsRole.name, rank: groupRole.rank }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: sync_all — sync every member of the workspace
    if (action === "sync_all") {
      // Only owner or manage_members
      const { data: isOwner } = await sb.rpc("is_workspace_owner", { _workspace_id: workspace_id });
      if (!isOwner) {
        const { data: hasPerm } = await sb.rpc("has_workspace_permission", { _workspace_id: workspace_id, _permission: "manage_members" });
        if (!hasPerm) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data: members } = await sb.from("workspace_members")
        .select("id, roblox_user_id").eq("workspace_id", workspace_id);
      const { data: wsRoles } = await sb.from("workspace_roles")
        .select("id, name, roblox_role_id").eq("workspace_id", workspace_id);
      const roleMap = new Map<string, { id: string; name: string }>();
      (wsRoles || []).forEach((r: any) => { if (r.roblox_role_id) roleMap.set(r.roblox_role_id, r); });

      let synced = 0;
      for (const m of (members || [])) {
        try {
          const gr = await fetchGroupRoleId(ws.roblox_api_key, ws.roblox_group_id, m.roblox_user_id);
          if (!gr) continue;
          const target = roleMap.get(gr.roleIdShort);
          if (!target) continue;
          await sb.from("workspace_members").update({
            role_id: target.id, role: target.name, roblox_group_rank: gr.rank, updated_at: new Date().toISOString(),
          }).eq("id", m.id);
          synced++;
        } catch (_) { /* skip */ }
      }
      return new Response(JSON.stringify({ success: true, synced, total: members?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
