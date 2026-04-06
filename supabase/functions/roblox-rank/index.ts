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

    // Get authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, workspace_id, roblox_user_id, role_id } = body;

    // Get workspace with roblox_api_key and group_id
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

    // Action: get_roles - fetch roles from Roblox group
    if (action === "get_roles") {
      const res = await fetch(
        `https://apis.roblox.com/cloud/v2/groups/${ws.roblox_group_id}/roles`,
        { headers: { "x-api-key": ws.roblox_api_key } }
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error("Roblox API error:", errText);
        return new Response(JSON.stringify({ error: "Failed to fetch group roles", details: errText }), {
          status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await res.json();
      return new Response(JSON.stringify({ success: true, roles: data.groupRoles || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: set_rank - promote/demote user
    if (action === "set_rank") {
      if (!roblox_user_id || !role_id) {
        return new Response(JSON.stringify({ error: "Missing roblox_user_id or role_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use Open Cloud API to update membership role
      const res = await fetch(
        `https://apis.roblox.com/cloud/v2/groups/${ws.roblox_group_id}/memberships`,
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

      // The correct endpoint is to list memberships then patch
      // Let's use the proper endpoint
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

    // Action: import_roles - import Roblox group roles into workspace_roles
    if (action === "import_roles") {
      const res = await fetch(
        `https://apis.roblox.com/cloud/v2/groups/${ws.roblox_group_id}/roles`,
        { headers: { "x-api-key": ws.roblox_api_key } }
      );
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch group roles" }), {
          status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await res.json();
      const roles = data.groupRoles || [];

      // Insert roles that don't exist yet
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const rankId = role.id?.split("/").pop();
        // Skip "Guest" role (rank 0)
        if (role.rank === 0) continue;

        // Check if role already exists
        const { data: existing } = await supabase
          .from("workspace_roles")
          .select("id")
          .eq("workspace_id", workspace_id)
          .eq("name", role.displayName || role.name || `Rank ${role.rank}`)
          .maybeSingle();

        if (!existing) {
          await supabase.from("workspace_roles").insert({
            workspace_id,
            name: role.displayName || role.name || `Rank ${role.rank}`,
            position: role.rank || i,
            color: "#6366f1",
            permissions: [],
          });
        }
      }

      return new Response(JSON.stringify({ success: true, imported: roles.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
