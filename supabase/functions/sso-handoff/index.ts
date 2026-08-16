import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Only fluxcore.works and its subdomains (plus localhost/preview for dev) may receive a handoff.
const isAllowedOrigin = (value: string) => {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return false;
    const h = u.hostname;
    return (
      h === "fluxcore.works" ||
      h.endsWith(".fluxcore.works") ||
      h.endsWith(".lovable.app") ||
      h === "localhost" ||
      h === "127.0.0.1"
    );
  } catch {
    return false;
  }
};

const randomToken = () => {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const action = body?.action;

  if (action === "create") {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "not_authenticated" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "not_authenticated" }, 401);

    const returnOrigin = String(body?.return_origin || "");
    if (!isAllowedOrigin(returnOrigin)) return json({ error: "bad_origin" }, 400);

    const token = randomToken();
    const { error: insErr } = await admin.from("sso_handoff_tokens").insert({
      token,
      user_id: userData.user.id,
      return_origin: new URL(returnOrigin).origin,
    });
    if (insErr) {
      console.error("[SSO] insert error", insErr);
      return json({ error: "create_failed" }, 500);
    }
    return json({ token });
  }

  if (action === "exchange") {
    const token = String(body?.token || "");
    if (!token) return json({ error: "missing_token" }, 400);

    const { data: row } = await admin
      .from("sso_handoff_tokens")
      .select("id, user_id, expires_at, consumed_at")
      .eq("token", token)
      .maybeSingle();

    if (!row) return json({ error: "invalid_token" }, 400);
    if (row.consumed_at) return json({ error: "already_used" }, 400);
    if (new Date(row.expires_at).getTime() < Date.now()) return json({ error: "expired" }, 400);

    const { error: consumeErr } = await admin
      .from("sso_handoff_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("consumed_at", null);
    if (consumeErr) return json({ error: "already_used" }, 400);

    const { data: userInfo } = await admin.auth.admin.getUserById(row.user_id);
    const email = userInfo?.user?.email;
    if (!email) return json({ error: "no_email" }, 400);

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("[SSO] link error", linkErr);
      return json({ error: "session_failed" }, 500);
    }

    // Best-effort cleanup of stale rows
    admin.from("sso_handoff_tokens").delete().lt("expires_at", new Date(Date.now() - 3600_000).toISOString());

    return json({ token_hash: linkData.properties.hashed_token, email });
  }

  return json({ error: "unknown_action" }, 400);
});
