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
    const allowed = new Set(
      [
        serviceRoleKey,
        Deno.env.get("SUPABASE_ANON_KEY"),
        Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
        Deno.env.get("SUPABASE_PUBLISHABLE_OR_ANON_KEY"),
      ].filter(Boolean) as string[],
    );
    const authHeader = req.headers.get("authorization") || "";
    const presented = authHeader.replace(/^Bearer\s+/i, "") || req.headers.get("apikey") || "";
    if (!allowed.has(presented)) {
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

    // --- Prune orphans: any *.fluxcore.works attached to the project that no
    // longer has a matching partner_portals row gets detached from Vercel.
    const wanted = new Set(
      (portals || [])
        .map((p) => String(p.subdomain || "").toLowerCase().replace(/[^a-z0-9-]/g, ""))
        .filter(Boolean)
        .map((s) => `${s}.${ROOT_DOMAIN}`),
    );

    let pruned = 0, pruneFailed = 0;
    const pruneList: string[] = [];
    try {
      const listUrl = `${VERCEL_API}/v9/projects/${projectId}/domains${teamQuery}${teamQuery ? "&" : "?"}limit=100`;
      const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${vercelToken}` } });
      const listData = await listRes.json().catch(() => ({}));
      const all: any[] = listData?.domains || [];
      for (const d of all) {
        const name = String(d?.name || "").toLowerCase();
        // Only touch single-level subdomains of the root; never the apex or wildcard.
        if (!name.endsWith(`.${ROOT_DOMAIN}`)) continue;
        const label = name.slice(0, -(ROOT_DOMAIN.length + 1));
        if (!label || label.includes(".") || label === "*") continue;
        if (wanted.has(name)) continue;
        const del = await fetch(
          `${VERCEL_API}/v9/projects/${projectId}/domains/${encodeURIComponent(name)}${teamQuery}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${vercelToken}` } },
        );
        if (del.ok || del.status === 404) { pruned++; pruneList.push(name); }
        else { pruneFailed++; console.error(`subdomain-sweeper prune failed ${name} -> ${del.status}`); }
      }
    } catch (e) {
      console.error("subdomain-sweeper prune exception", e);
    }

    return new Response(JSON.stringify({
      success: true, total: portals?.length || 0, attached, alreadyOk, failed,
      pruned, pruneFailed, prunedDomains: pruneList,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("subdomain-sweeper error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
