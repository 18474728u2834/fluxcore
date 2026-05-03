import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FLUXCORE_PREMIUM_GAMEPASS_ID = "1816876657";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id } = await req.json();
    if (!workspace_id || typeof workspace_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing workspace_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load workspace + verify caller is the owner
    const { data: ws } = await admin
      .from("workspaces")
      .select("id, owner_id, premium, premium_until")
      .eq("id", workspace_id)
      .maybeSingle();

    if (!ws) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ws.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not owner" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the owner's Roblox user id
    const { data: verified } = await admin
      .from("verified_users")
      .select("roblox_user_id")
      .eq("user_id", ws.owner_id)
      .maybeSingle();

    if (!verified?.roblox_user_id) {
      return new Response(JSON.stringify({ premium: !!ws.premium, owns: false, reason: "owner_not_verified" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Roblox inventory for the gamepass
    let owns = false;
    try {
      const r = await fetch(
        `https://inventory.roblox.com/v1/users/${verified.roblox_user_id}/items/GamePass/${FLUXCORE_PREMIUM_GAMEPASS_ID}`
      );
      const j = await r.json();
      owns = Array.isArray(j?.data) && j.data.length > 0;
    } catch (_e) {
      owns = false;
    }

    // Don't downgrade premium granted manually with a future premium_until
    const hasFutureGrant = ws.premium && ws.premium_until && new Date(ws.premium_until) > new Date();

    if (owns) {
      // Grant lifetime premium (no premium_until needed for gamepass)
      await admin.from("workspaces")
        .update({ premium: true, premium_until: null })
        .eq("id", workspace_id);
    } else if (!hasFutureGrant) {
      await admin.from("workspaces")
        .update({ premium: false })
        .eq("id", workspace_id);
    }

    return new Response(JSON.stringify({ premium: owns || !!hasFutureGrant, owns }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-premium error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
