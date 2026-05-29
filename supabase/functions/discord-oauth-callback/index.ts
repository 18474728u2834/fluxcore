import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const safeOrigin = (v: string | null) => {
  if (!v) return "";
  try { return new URL(v).origin; } catch { return ""; }
};

const randomToken = () => {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const clientId = Deno.env.get("DISCORD_CLIENT_ID");
  const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const redirectUri = `${supabaseUrl}/functions/v1/discord-oauth-callback`;

  if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("[Discord OAuth] Missing env");
    const o = safeOrigin(url.searchParams.get("origin"));
    return o ? Response.redirect(`${o}/#/login?error=discord_config`, 302)
             : new Response("Discord OAuth not configured", { status: 500, headers: corsHeaders });
  }

  // Step 1: start
  if (url.searchParams.get("start") === "1") {
    const origin = safeOrigin(url.searchParams.get("origin"));
    if (!origin) return new Response("Missing origin", { status: 400, headers: corsHeaders });
    const state = btoa(JSON.stringify({ nonce: crypto.randomUUID(), origin }));
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "identify",
      state,
      prompt: "none",
    });
    return Response.redirect(`https://discord.com/api/oauth2/authorize?${params}`, 302);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return new Response("Missing code/state", { status: 400, headers: corsHeaders });
  }

  let origin: string;
  try {
    const parsed = JSON.parse(atob(state));
    origin = safeOrigin(parsed.origin);
    if (!origin) throw new Error("bad origin");
  } catch (e) {
    console.error("[Discord OAuth] State parse:", e);
    return new Response("Invalid state", { status: 400, headers: corsHeaders });
  }

  try {
    // Step 2: token exchange
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error("[Discord OAuth] Token failed:", tokenRes.status, tokenText);
      return Response.redirect(`${origin}/#/login?error=discord_token`, 302);
    }
    const tokenData = JSON.parse(tokenText);

    // Step 3: identify
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) {
      console.error("[Discord OAuth] /users/@me failed:", await userRes.text());
      return Response.redirect(`${origin}/#/login?error=discord_userinfo`, 302);
    }
    const discordUser = await userRes.json();
    const discordUserId = String(discordUser.id);
    const discordUsername = discordUser.username || `user${discordUserId}`;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Step 4: look up existing link
    const { data: linked, error: linkedErr } = await admin
      .from("verified_users")
      .select("user_id")
      .eq("discord_user_id", discordUserId)
      .maybeSingle();

    if (linkedErr) {
      console.error("[Discord OAuth] Lookup err:", linkedErr);
    }

    if (linked?.user_id) {
      // Refresh username
      await admin
        .from("verified_users")
        .update({ discord_username: discordUsername })
        .eq("user_id", linked.user_id);

      // Get email to issue magic link
      const { data: userInfo } = await admin.auth.admin.getUserById(linked.user_id);
      const email = userInfo?.user?.email;
      if (!email) {
        return Response.redirect(`${origin}/#/login?error=discord_no_email`, 302);
      }
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkErr || !linkData?.properties?.hashed_token) {
        console.error("[Discord OAuth] Magic link err:", linkErr);
        return Response.redirect(`${origin}/#/login?error=discord_session`, 302);
      }
      const tokenHash = linkData.properties.hashed_token;
      const cb = `${origin}/#/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&email=${encodeURIComponent(email)}`;
      return Response.redirect(cb, 302);
    }

    // Step 5: not linked → create pending link, send to /link-discord
    const linkToken = randomToken();
    const { error: insErr } = await admin.from("discord_pending_links").insert({
      token: linkToken,
      discord_user_id: discordUserId,
      discord_username: discordUsername,
    });
    if (insErr) {
      console.error("[Discord OAuth] Pending insert err:", insErr);
      return Response.redirect(`${origin}/#/login?error=discord_pending`, 302);
    }

    const dest = `${origin}/#/link-discord?link_token=${encodeURIComponent(linkToken)}&discord_name=${encodeURIComponent(discordUsername)}`;
    return Response.redirect(dest, 302);
  } catch (err) {
    console.error("[Discord OAuth] Error:", err);
    return Response.redirect(`${origin}/#/login?error=discord_server`, 302);
  }
});
