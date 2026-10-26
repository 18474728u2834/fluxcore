import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const WHOP = "https://api.whop.com/api/v1";

async function grantPro(admin: any, workspaceId: string, paymentId: string | null) {
  await admin.from("workspaces").update({ pro: true, pro_since: new Date().toISOString(), pro_payment_id: paymentId }).eq("id", workspaceId);
  await admin.from("nexus_v4_beta_access").upsert({ workspace_id: workspaceId, note: "Fluxcore Pro" }, { onConflict: "workspace_id" });
}

// Looks through recent paid Whop payments for this plan and returns the one tagged with this workspace.
async function findPaidPayment(workspaceId: string): Promise<string | null> {
  const key = Deno.env.get("WHOP_API_KEY");
  const plan = Deno.env.get("WHOP_PLAN_ID")!;
  let after: string | null = null;
  for (let page = 0; page < 5; page++) {
    const qs = new URLSearchParams({ first: "100", include_free: "true", direction: "desc" });
    qs.append("plan_ids", plan);
    qs.append("statuses", "paid");
    if (after) qs.set("after", after);
    const res = await fetch(`${WHOP}/payments?${qs}`, { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) { console.error("Whop payments list", res.status, await res.text()); return null; }
    const body = await res.json();
    for (const p of body.data ?? []) {
      if (p?.metadata?.workspace_id === workspaceId) return p.id ?? "whop";
    }
    if (!body.page_info?.has_next_page) break;
    after = body.page_info.end_cursor;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action === "verify" ? "verify" : "checkout";
    const workspaceId = String(body?.workspace_id ?? "");
    const returnUrl = typeof body?.return_url === "string" && body.return_url.startsWith("http") ? body.return_url : undefined;
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) return json({ error: "Invalid workspace" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ws } = await admin.from("workspaces").select("id, owner_id, pro").eq("id", workspaceId).maybeSingle();
    if (!ws || ws.owner_id !== user.id) return json({ error: "Only the workspace owner can buy Pro" }, 403);

    if (action === "verify") {
      if (ws.pro) return json({ pro: true });
      const paymentId = await findPaidPayment(workspaceId);
      if (paymentId) { await grantPro(admin, workspaceId, paymentId); return json({ pro: true }); }
      return json({ pro: false });
    }

    if (ws.pro) return json({ error: "This workspace already has Pro" }, 400);

    const res = await fetch(`${WHOP}/checkout_configurations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("WHOP_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: Deno.env.get("WHOP_PLAN_ID"),
        metadata: { workspace_id: workspaceId, user_id: user.id },
        ...(returnUrl ? { redirect_url: returnUrl } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.purchase_url) {
      console.error("Whop checkout error", res.status, data);
      return json({ error: "Couldn't start checkout" }, 502);
    }
    return json({ url: data.purchase_url });
  } catch (e) {
    console.error(e);
    return json({ error: "Server error" }, 500);
  }
});
