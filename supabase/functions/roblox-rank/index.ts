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

    const body = await req.json();
    const { action, workspace_id, roblox_user_id, role_id } = body;

    const { data: ws } = await supabase
      .from("workspaces")
      .select("roblox_api_key, roblox_group_id")
      .eq("id", workspace_id)
      .single();

    if (!ws?.roblox_api_key || !ws?.roblox_group_id) {
      return new Response(JSON.stringify({ error: "Roblox API key or Group ID not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Helper: fetch ALL roles with pagination
    async function fetchAllRoles(): Promise<any[]> {
      let allRoles: any[] = [];
      let pageToken: string | null = null;
      
      for (let i = 0; i < 20; i++) { // max 20 pages safety
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

    // Action: set_rank
    if (action === "set_rank") {
      if (!roblox_user_id || !role_id) {
        return new Response(JSON.stringify({ error: "Missing roblox_user_id or role_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
