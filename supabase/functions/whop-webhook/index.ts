import { createClient } from "npm:@supabase/supabase-js@2";

// Verifies Whop's Standard Webhooks signature (webhook-id, webhook-timestamp, webhook-signature).
async function verify(raw: string, headers: Headers, secret: string): Promise<boolean> {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 600) return false;
  const keyStr = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try { keyBytes = Uint8Array.from(atob(keyStr), (c) => c.charCodeAt(0)); }
  catch { keyBytes = new TextEncoder().encode(secret); }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${raw}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return sigHeader.split(" ").some((p) => p.split(",")[1] === expected);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const raw = await req.text();
  const secret = Deno.env.get("WHOP_WEBHOOK_SECRET") ?? "";
  if (!secret || !(await verify(raw, req.headers, secret))) return new Response("invalid signature", { status: 401 });

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  const type: string = evt.type ?? evt.action ?? "";
  if (!/payment[._]succeeded/.test(type)) return new Response("ignored");

  const d = evt.data ?? {};
  const meta = d.metadata ?? d.checkout_session?.metadata ?? d.membership?.metadata ?? {};
  const workspaceId = meta.workspace_id;
  if (!workspaceId || !/^[0-9a-f-]{36}$/i.test(workspaceId)) return new Response("no workspace", { status: 200 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await admin.from("workspaces").update({ pro: true, pro_since: new Date().toISOString(), pro_payment_id: d.id ?? null }).eq("id", workspaceId);
  await admin.from("nexus_v4_beta_access").upsert({ workspace_id: workspaceId, note: "Fluxcore Pro" }, { onConflict: "workspace_id" });
  return new Response("ok");
});
