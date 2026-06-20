import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Runs on a 1-minute cron. For every active partner_portals row, ensures the
// corresponding subdomain is attached on Vercel. Adding is idempotent — Vercel
// returns `domain_already_in_use` when it's already attached.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERCEL_API = "https://api.vercel.com";
const ROOT_DOMAIN = "fluxcore.works";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const projectId = Deno.env.get("VERCEL_PROJECT_ID");
    const teamId = Deno.env.get("VERCEL_TEAM_ID");

    // Idempotent and read-mostly — any caller bearing the project anon or
    // service-role key is allowed. Unauthenticated callers are rejected.
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const authHeader = req.headers.get("authorization") || "";
    const presented = authHeader.replace(/^Bearer\s+/i, "");
    if (presented !== serviceRoleKey && presented !== anonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!vercelToken || !projectId) {
      return new Response(JSON.stringify({ error: "Vercel not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";

    const sb = createClient(supabaseUrl, serviceRoleKey);
    const { data: portals } = await sb
      .from("partner_portals")
      .select("subdomain, status")
      .in("status", ["active", "dormant"]);

    let attached = 0, alreadyOk = 0, failed = 0;
    for (const p of portals || []) {
      const sub = String(p.subdomain || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (!sub) continue;
      const fullDomain = `${sub}.${ROOT_DOMAIN}`;
      try {
        const res = await fetch(`${VERCEL_API}/v10/projects/${projectId}/domains${teamQuery}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: fullDomain }),
        });
        if (res.ok) { attached++; continue; }
        const data = await res.json().catch(() => ({}));
        const code = data?.error?.code;
        if (code === "domain_already_in_use" || code === "domain_already_exists") {
          alreadyOk++;
        } else {
          failed++;
          console.error(`subdomain-sweeper: ${fullDomain} -> ${res.status} ${code}`);
        }
      } catch (e) {
        failed++;
        console.error(`subdomain-sweeper exception for ${fullDomain}`, e);
      }
    }

    return new Response(JSON.stringify({
      success: true, total: portals?.length || 0, attached, alreadyOk, failed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("subdomain-sweeper error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
