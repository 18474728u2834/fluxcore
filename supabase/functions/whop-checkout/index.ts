import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const body = await req.json().catch(() => ({}));
    const workspaceId = String(body?.workspace_id ?? "");
    const returnUrl = typeof body?.return_url === "string" && body.return_url.startsWith("http") ? body.return_url : undefined;
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) return json({ error: "Invalid workspace" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ws } = await admin.from("workspaces").select("id, owner_id, pro").eq("id", workspaceId).maybeSingle();
    if (!ws || ws.owner_id !== user.id) return json({ error: "Only the workspace owner can buy Pro" }, 403);
    if (ws.pro) return json({ error: "This workspace already has Pro" }, 400);

    const res = await fetch("https://api.whop.com/api/v2/checkout_sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("WHOP_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: Deno.env.get("WHOP_PLAN_ID"),
        metadata: { workspace_id: workspaceId, user_id: user.id },
        ...(returnUrl ? { redirect_url: returnUrl } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Whop checkout error", res.status, data);
      return json({ error: "Couldn't start checkout" }, 502);
    }
    const planId = Deno.env.get("WHOP_PLAN_ID");
    const checkoutUrl = data.purchase_url ?? `https://whop.com/checkout/${planId}?session=${data.id}`;
    return json({ url: checkoutUrl });
  } catch (e) {
    console.error(e);
    return json({ error: "Server error" }, 500);
  }
});
