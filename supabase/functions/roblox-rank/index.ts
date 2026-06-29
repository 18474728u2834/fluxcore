import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    // Trusted-service path: edge functions (Discord bot, cron) may call this
    // with the service-role key. They supply `actor_user_id` in the body to
    // identify the human on whose behalf the action runs.
    const isServiceCall = token === serviceRoleKey;
    const sbUserClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    let reqUser: { id: string } | null = null;
    if (isServiceCall) {
      const actorId = (await req.clone().json().catch(() => ({})))?.actor_user_id;
      if (actorId) reqUser = { id: actorId };
    } else {
      const { data: { user } } = await sbUserClient.auth.getUser();
      reqUser = user as any;
      if (!reqUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const { action, workspace_id, roblox_user_id, role_id } = body;

    const { data: wsRow } = await supabase
      .from("workspaces")
      .select("roblox_group_id, owner_id")
      .eq("id", workspace_id)
      .single();
    const { data: secretsRow } = await supabase.rpc("internal_get_workspace_secrets", { _workspace_id: workspace_id });
    const secrets = (Array.isArray(secretsRow) ? secretsRow[0] : secretsRow) || {};
    const ws: any = wsRow ? { ...wsRow, roblox_api_key: secrets.roblox_api_key } : null;

    if (!ws?.roblox_api_key || !ws?.roblox_group_id) {
      return new Response(JSON.stringify({ error: "Roblox API key or Group ID not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: caller must own the workspace or have manage_members permission
    const isOwner = reqUser && ws.owner_id === reqUser.id;
    if (!isOwner) {
      const { data: hasPerm } = isServiceCall
        ? await supabase.rpc("internal_member_has_permission", {
            _user_id: reqUser!.id, _workspace_id: workspace_id, _permission: "manage_members",
          })
        : await sbUserClient.rpc("has_workspace_permission", {
            _workspace_id: workspace_id, _permission: "manage_members",
          });
      if (!hasPerm) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Trim whitespace/newlines from pasted API key (common cause of "Unsupported authorization method")
    ws.roblox_api_key = String(ws.roblox_api_key).trim();
    ws.roblox_group_id = String(ws.roblox_group_id).trim();

    // Helper: fetch ALL roles with pagination
    async function fetchAllRoles(): Promise<any[]> {
      let allRoles: any[] = [];
      let pageToken: string | null = null;

      for (let i = 0; i < 20; i++) {
        let url = `https://apis.roblox.com/cloud/v2/groups/${ws!.roblox_group_id}/roles?maxPageSize=50`;
        if (pageToken) url += `&pageToken=${pageToken}`;

        const res = await fetch(url, {
          headers: { "x-api-key": ws!.roblox_api_key! },
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Roblox API error:", errText);
          throw new Error(`Failed to fetch roles: ${errText}`);
        }

        const data = await res.json();
        const roles = data.groupRoles || [];
        allRoles = allRoles.concat(roles);

        if (!data.nextPageToken) break;
        pageToken = data.nextPageToken;
      }

      return allRoles;
    }

    // Action: get_roles
    if (action === "get_roles") {
      try {
        const roles = await fetchAllRoles();
        return new Response(JSON.stringify({ success: true, roles }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Action: set_rank - with rank protection
    if (action === "set_rank") {
      if (!roblox_user_id || !role_id) {
        return new Response(JSON.stringify({ error: "Missing roblox_user_id or role_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rank protection: prevent ranking above yourself (unless owner)
      if (reqUser && reqUser.id !== ws.owner_id) {
        // Get the requesting user's Roblox ID
        const { data: reqVerified } = await supabase
          .from("verified_users")
          .select("roblox_user_id")
          .eq("user_id", reqUser.id)
          .maybeSingle();

        if (reqVerified?.roblox_user_id) {
          try {
            const allRoles = await fetchAllRoles();
            const targetRole = allRoles.find((r: any) => {
              const rid = r.id?.split("/").pop();
              return rid === role_id;
            });

            // Get requester's current rank in the group
            const reqMemberRes = await fetch(
              `https://apis.roblox.com/cloud/v2/groups/${ws.roblox_group_id}/memberships?filter=user=='users/${reqVerified.roblox_user_id}'&maxPageSize=1`,
              { headers: { "x-api-key": ws.roblox_api_key! } }
            );
            if (reqMemberRes.ok) {
              const reqMemberData = await reqMemberRes.json();
              const reqMembership = reqMemberData.groupMemberships?.[0];
              if (reqMembership) {
                const reqRoleId = reqMembership.role?.split("/").pop();
                const reqRole = allRoles.find((r: any) => r.id?.split("/").pop() === reqRoleId);

                if (targetRole && reqRole && targetRole.rank >= reqRole.rank) {
                  return new Response(JSON.stringify({ error: "You cannot assign a rank equal to or above your own" }), {
                    status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
                  });
                }
              }
            }
          } catch (e) {
            console.error("Rank protection check failed:", e);
          }
        }
      }

      const listRes = await fetch(
        `https://apis.roblox.com/cloud/v2/groups/${ws.roblox_group_id}/memberships?filter=user=='users/${roblox_user_id}'&maxPageSize=1`,
        { headers: { "x-api-key": ws.roblox_api_key } }
      );

      if (!listRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to find user in group" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const listData = await listRes.json();
      const membership = listData.groupMemberships?.[0];
      if (!membership) {
        return new Response(JSON.stringify({ error: "User not found in Roblox group" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const membershipPath = membership.path;
      const patchRes = await fetch(
        `https://apis.roblox.com/cloud/v2/${membershipPath}`,
        {
          method: "PATCH",
          headers: {
            "x-api-key": ws.roblox_api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: `groups/${ws.roblox_group_id}/roles/${role_id}`,
          }),
        }
      );

      if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error("Rank change failed:", errText);
        return new Response(JSON.stringify({ error: "Failed to change rank", details: errText }), {
          status: patchRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Rank updated successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: import_roles - paginated import
    if (action === "import_roles") {
      try {
        const roles = await fetchAllRoles();
        let imported = 0;

        for (let i = 0; i < roles.length; i++) {
          const role = roles[i];
          const rankId = role.id?.split("/").pop();
          if (role.rank === 0) continue; // Skip Guest

          const roleName = role.displayName || role.name || `Rank ${role.rank}`;

          const { data: existing } = await supabase
            .from("workspace_roles")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("name", roleName)
            .maybeSingle();

          if (!existing) {
            await supabase.from("workspace_roles").insert({
              workspace_id,
              name: roleName,
              position: role.rank || i,
              color: "#6366f1",
              permissions: [],
              roblox_role_id: rankId || null,
            });
            imported++;
          }
        }

        return new Response(JSON.stringify({ success: true, imported, total: roles.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "Import failed" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Action: step_rank — bump the target up or down by exactly one rank in
    // the Roblox group ladder. Used by the in-app "Demotion" logbook entry.
    if (action === "promote_one" || action === "demote_one" || action === "promote" || action === "demote") {
      const stepAction = action.endsWith("_one") ? action : `${action}_one`;
      let targetUserId: string | undefined = body.roblox_user_id;
      const targetUsername: string | undefined = body.target_username;
      if (!targetUserId && targetUsername) {
        try {
          const r = await fetch("https://users.roblox.com/v1/usernames/users", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usernames: [targetUsername], excludeBannedUsers: false }),
          });
          const j = await r.json();
          targetUserId = j?.data?.[0]?.id ? String(j.data[0].id) : undefined;
        } catch (_) { /* ignore */ }
      }
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "Missing roblox_user_id or target_username (user not found)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Normalize so the existing logic below treats it as promote_one/demote_one
      (body as any).roblox_user_id = targetUserId;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _action = stepAction; // kept for clarity
      const allRoles = await fetchAllRoles();
      const ladder = allRoles
        .filter((r: any) => (r.rank ?? 0) > 0)
        .sort((a: any, b: any) => (a.rank ?? 0) - (b.rank ?? 0));
      const memRes = await fetch(
        `https://apis.roblox.com/cloud/v2/groups/${ws.roblox_group_id}/memberships?filter=user=='users/${targetUserId}'&maxPageSize=1`,
        { headers: { "x-api-key": ws.roblox_api_key } },
      );
      if (!memRes.ok) {
        return new Response(JSON.stringify({ error: "Target not found in Roblox group" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const memData = await memRes.json();
      const membership = memData.groupMemberships?.[0];
      if (!membership) {
        return new Response(JSON.stringify({ error: "Target not found in Roblox group" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const curRoleId = String(membership.role || "").split("/").pop();
      const curIdx = ladder.findIndex((r: any) => String(r.id || "").split("/").pop() === curRoleId);
      if (curIdx === -1) {
        return new Response(JSON.stringify({ error: "Current rank not in promotable ladder" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const nextIdx = action === "promote_one" ? curIdx + 1 : curIdx - 1;
      if (nextIdx < 0 || nextIdx >= ladder.length) {
        return new Response(JSON.stringify({ error: `Cannot ${action.replace("_one", "")} further` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const newRole = ladder[nextIdx];
      const newRoleId = String(newRole.id || "").split("/").pop();
      const patchRes = await fetch(`https://apis.roblox.com/cloud/v2/${membership.path}`, {
        method: "PATCH",
        headers: { "x-api-key": ws.roblox_api_key, "Content-Type": "application/json" },
        body: JSON.stringify({ role: `groups/${ws.roblox_group_id}/roles/${newRoleId}` }),
      });
      if (!patchRes.ok) {
        const t = await patchRes.text();
        return new Response(JSON.stringify({ error: "Roblox rejected the rank change", details: t }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        success: true,
        from: { rank: ladder[curIdx].rank, name: ladder[curIdx].displayName || ladder[curIdx].name },
        to:   { rank: newRole.rank, name: newRole.displayName || newRole.name },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
