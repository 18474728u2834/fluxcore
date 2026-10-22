import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { workspace_id, return_url } = await req.json();
    if (!workspace_id || typeof workspace_id !== "string") return json({ error: "Missing workspace_id" }, 400);

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ws } = await admin.from("workspaces").select("id, owner_id, pro").eq("id", workspace_id).maybeSingle();
    if (!ws) return json({ error: "Workspace not found" }, 404);
    if (ws.owner_id !== user.id) return json({ error: "Only the workspace owner can buy Pro" }, 403);
    if (ws.pro) return json({ error: "This workspace already has Pro" }, 409);

    const apiKey = Deno.env.get("WHOP_API_KEY");
    const planId = Deno.env.get("WHOP_PLAN_ID");
    if (!apiKey || !planId) return json({ error: "Pro checkout is not configured yet" }, 503);

    const safeReturn = typeof return_url === "string" && /^https:\/\/([a-z0-9-]+\.)*(fluxcore\.works|lovable\.app)(\/|$)/i.test(return_url)
      ? return_url : "https://fluxcore.works/workspaces";

    const r = await fetch("https://api.whop.com/api/v2/checkout_sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId, redirect_url: safeReturn, metadata: { workspace_id, user_id: user.id } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.purchase_url) {
      console.error("whop checkout failed", r.status, j);
      return json({ error: "Could not start checkout" }, 502);
    }
    return json({ url: j.purchase_url });
  } catch (e) {
    console.error("whop-checkout error", e);
    return json({ error: "Internal error" }, 500);
  }
});
