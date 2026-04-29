import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const safeRedirectOrigin = (value: string | null) => {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return "";
  }
};

const createCodeVerifier = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const createCodeChallenge = async (verifier: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const clientId = Deno.env.get("ROBLOX_CLIENT_ID");
  const clientSecret = Deno.env.get("ROBLOX_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const redirectUri = `${supabaseUrl}/functions/v1/roblox-oauth-callback`;

  if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) {
    const origin = safeRedirectOrigin(url.searchParams.get("origin"));
    console.error("[OAuth] Missing env:", { c: !!clientId, s: !!clientSecret, u: !!supabaseUrl, k: !!serviceRoleKey });
    return origin ? Response.redirect(`${origin}/#/login?error=config`, 302) : new Response("OAuth is not configured", { status: 500, headers: corsHeaders });
  }

  if (url.pathname.endsWith("/start")) {
    const origin = safeRedirectOrigin(url.searchParams.get("origin"));
    if (!origin) return new Response("Missing origin", { status: 400, headers: corsHeaders });

    const codeVerifier = createCodeVerifier();
    const codeChallenge = await createCodeChallenge(codeVerifier);
    const state = btoa(JSON.stringify({ nonce: crypto.randomUUID(), origin, code_verifier: codeVerifier }));
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "openid profile",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return Response.redirect(`https://apis.roblox.com/oauth/v1/authorize?${params}`, 302);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  console.log("[OAuth] Callback received. method:", req.method, "code:", !!code, "state:", !!state);

  if (!code || !state) {
    console.error("[OAuth] Missing code or state. Full URL:", req.url);
    return new Response("Missing code or state", { status: 400, headers: corsHeaders });
  }

  let origin: string;
  let codeVerifier: string | undefined;
  try {
    const decoded = atob(state);
    console.log("[OAuth] Decoded state:", decoded);
    const parsed = JSON.parse(decoded);
    origin = safeRedirectOrigin(parsed.origin);
    codeVerifier = parsed.code_verifier;
    if (!origin) throw new Error("Missing safe origin");
  } catch (e) {
    console.error("[OAuth] State parse error:", e);
    return new Response("Invalid state", { status: 400, headers: corsHeaders });
  }

  try {
    // Step 1: Token exchange - Roblox requires Basic Auth for confidential clients
    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    if (codeVerifier) {
      tokenBody.set("code_verifier", codeVerifier);
    }

    console.log("[OAuth] Token exchange. redirect_uri:", redirectUri);

    const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: tokenBody,
    });

    const tokenText = await tokenRes.text();
    console.log("[OAuth] Token status:", tokenRes.status, "body:", tokenText.substring(0, 200));

    if (!tokenRes.ok) {
      console.error("[OAuth] Token failed:", tokenText);
      return Response.redirect(`${origin}/#/login?error=token_exchange_failed`, 302);
    }

    const tokenData = JSON.parse(tokenText);
    if (!tokenData.access_token) {
      console.error("[OAuth] No access_token:", tokenData);
      return Response.redirect(`${origin}/#/login?error=no_token`, 302);
    }

    // Step 2: Get user info
    const userRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userText = await userRes.text();
    console.log("[OAuth] UserInfo status:", userRes.status);

    if (!userRes.ok) {
      console.error("[OAuth] UserInfo failed:", userText);
      return Response.redirect(`${origin}/#/login?error=userinfo_failed`, 302);
    }

    const userInfo = JSON.parse(userText);
    const robloxUserId = String(userInfo.sub);
    const robloxUsername = userInfo.preferred_username || userInfo.name || `User${robloxUserId}`;

    if (!robloxUserId) {
      return Response.redirect(`${origin}/#/login?error=no_user_id`, 302);
    }

    console.log("[OAuth] User:", robloxUsername, "id:", robloxUserId);

    // Step 3: Find or create Supabase user
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const email = `${robloxUserId}@roblox.fluxcore.app`;

    const { data: existing } = await admin
      .from("verified_users")
      .select("user_id")
      .eq("roblox_user_id", robloxUserId)
      .maybeSingle();

    let userId: string;

    if (existing?.user_id) {
      userId = existing.user_id;
      await admin.from("verified_users")
        .update({ roblox_username: robloxUsername })
        .eq("user_id", userId);
    } else {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { roblox_user_id: robloxUserId, roblox_username: robloxUsername },
      });

      if (createErr) {
        // User exists in auth but not verified_users
        const { data: listData } = await admin.auth.admin.listUsers();
        const found = listData?.users?.find((u: any) => u.email === email);
        if (found) {
          userId = found.id;
        } else {
          console.error("[OAuth] Create user failed:", createErr);
          return Response.redirect(`${origin}/#/login?error=create_failed`, 302);
        }
      } else {
        userId = newUser.user!.id;
      }

      await admin.from("verified_users").upsert({
        user_id: userId,
        roblox_user_id: robloxUserId,
        roblox_username: robloxUsername,
        has_gamepass: false,
      }, { onConflict: "user_id" });
    }

    await admin.auth.admin.updateUserById(userId, {
      user_metadata: { roblox_user_id: robloxUserId, roblox_username: robloxUsername },
    });

    // Step 4: Generate magic link token
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkErr || !linkData) {
      console.error("[OAuth] Link error:", linkErr);
      return Response.redirect(`${origin}/#/login?error=session_failed`, 302);
    }

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) {
      console.error("[OAuth] No hashed_token");
      return Response.redirect(`${origin}/#/login?error=no_hash`, 302);
    }

    console.log("[OAuth] Success, redirecting to callback");
    const callback = `${origin}/#/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&email=${encodeURIComponent(email)}`;
    return Response.redirect(callback, 302);

  } catch (err) {
    console.error("[OAuth] Error:", err);
    return Response.redirect(`${origin}/#/login?error=server_error`, 302);
  }
});
