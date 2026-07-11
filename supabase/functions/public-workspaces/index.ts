import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Returns a small, non-sensitive list of workspaces for the public marquee
// on the landing page. Verified workspaces first, then most recent.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Prefer explicitly featured workspaces chosen by staff in the admin panel.
    const { data: featured, error: featuredErr } = await supabase
      .from("workspaces")
      .select("id, name, roblox_group_id, verified_official, premium")
      .eq("marquee_featured", true)
      .not("roblox_group_id", "is", null)
      .neq("roblox_group_id", "")
      .order("name")
      .limit(30);
    if (featuredErr) throw featuredErr;

    let data = featured ?? [];
    if (data.length === 0) {
      // Fallback: verified/premium/newest so the marquee never looks empty
      const { data: fallback, error } = await supabase
        .from("workspaces")
        .select("id, name, roblox_group_id, verified_official, premium")
        .not("roblox_group_id", "is", null)
        .neq("roblox_group_id", "")
        .order("verified_official", { ascending: false })
        .order("premium", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      data = fallback ?? [];
    }

    return new Response(
      JSON.stringify({ workspaces: data ?? [] }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
