import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as b64decode, encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// Whop uses the Standard Webhooks signature scheme.
async function verify(secret: string, id: string, ts: string, body: string, sigHeader: string) {
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const keyBytes = secret.startsWith("whsec_") ? b64decode(secret.slice(6)) : new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  const expected = b64encode(mac);
  return sigHeader.split(" ").some((p) => {
    const v = p.includes(",") ? p.split(",")[1] : p;
    if (v.length !== expected.length) return false;
    let d = 0;
    for (let i = 0; i < v.length; i++) d |= v.charCodeAt(i) ^ expected.charCodeAt(i);
    return d === 0;
  });
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const secret = Deno.env.get("WHOP_WEBHOOK_SECRET");
  if (!secret) return new Response("not configured", { status: 503 });

  const body = await req.text();
  const id = req.headers.get("webhook-id") ?? "";
  const ts = req.headers.get("webhook-timestamp") ?? "";
  const sig = req.headers.get("webhook-signature") ?? "";
  if (!id || !ts || !sig || !(await verify(secret, id, ts, body, sig))) {
    return new Response("invalid signature", { status: 401 });
  }

  let evt: any;
  try { evt = JSON.parse(body); } catch { return new Response("bad json", { status: 400 }); }
  const type: string = evt?.type ?? evt?.action ?? "";
  const data = evt?.data ?? {};
  const workspaceId = data?.metadata?.workspace_id ?? data?.checkout_configuration?.metadata?.workspace_id;
  const paymentId = data?.id ?? id;

  if (!/payment[._]succeeded/.test(type) || !workspaceId) return new Response("ignored");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.from("workspaces")
    .update({ pro: true, pro_since: new Date().toISOString(), pro_payment_id: String(paymentId) })
    .eq("id", workspaceId).eq("pro", false);
  if (error) { console.error("pro grant failed", error); return new Response("error", { status: 500 }); }

  // Pro perk: beta access to new Nexus versions.
  await admin.from("nexus_v4_beta_access")
    .upsert({ workspace_id: workspaceId, note: "Fluxcore Pro" }, { onConflict: "workspace_id", ignoreDuplicates: true });

  return new Response("ok");
});
