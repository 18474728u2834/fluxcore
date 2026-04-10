import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  console.log("[OAuth] Callback hit. code present:", !!code, "state present:", !!state);

  if (!code || !state) {
    return new Response("Missing code or state parameter", { status: 400 });
  }

  // Parse state
  let origin: string;
  let codeVerifier: string | undefined;
  try {
    const parsed = JSON.parse(atob(state));
    origin = parsed.origin;
    codeVerifier = parsed.code_verifier;
    console.log("[OAuth] Parsed state. origin:", origin, "has code_verifier:", !!codeVerifier);
  } catch (e) {
    console.error("[OAuth] Failed to parse state:", e);
    return new Response("Invalid state parameter", { status: 400 });
  }

  const clientId = Deno.env.get("ROBLOX_CLIENT_ID");
  const clientSecret = Deno.env.get("ROBLOX_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("[OAuth] Missing env vars:", {
      clientId: !!clientId, clientSecret: !!clientSecret,
      supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey,
    });
    return Response.redirect(`${origin}/#/login?error=server_config_error`, 302);
  }

  const redirectUri = `${supabaseUrl}/functions/v1/roblox-oauth-callback`;
  console.log("[OAuth] redirect_uri:", redirectUri);

  try {
    // ---- Step 1: Exchange code for tokens ----
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    // Add PKCE code_verifier if present
    if (codeVerifier) {
      tokenParams.set("code_verifier", codeVerifier);
    }

    console.log("[OAuth] Exchanging code for token...");

    const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams,
    });

    const tokenText = await tokenRes.text();
    console.log("[OAuth] Token response status:", tokenRes.status);

    if (!tokenRes.ok) {
      console.error("[OAuth] Token exchange failed:", tokenText);
      return Response.redirect(`${origin}/#/login?error=token_exchange_failed`, 302);
    }

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      console.error("[OAuth] Token response not JSON:", tokenText);
      return Response.redirect(`${origin}/#/login?error=token_parse_failed`, 302);
    }

    if (!tokenData.access_token) {
      console.error("[OAuth] No access_token in response:", tokenData);
      return Response.redirect(`${origin}/#/login?error=no_access_token`, 302);
    }

    console.log("[OAuth] Got access token successfully");

    // ---- Step 2: Get Roblox user info ----
    const userInfoRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfoText = await userInfoRes.text();
    console.log("[OAuth] UserInfo status:", userInfoRes.status);

    if (!userInfoRes.ok) {
      console.error("[OAuth] UserInfo failed:", userInfoText);
      return Response.redirect(`${origin}/#/login?error=userinfo_failed`, 302);
    }

    let userInfo: any;
    try {
      userInfo = JSON.parse(userInfoText);
    } catch {
      console.error("[OAuth] UserInfo not JSON:", userInfoText);
      return Response.redirect(`${origin}/#/login?error=userinfo_parse_failed`, 302);
    }

    const robloxUserId = userInfo.sub;
    const robloxUsername = userInfo.preferred_username || userInfo.name || `User${robloxUserId}`;

    if (!robloxUserId) {
      console.error("[OAuth] No sub in userinfo:", userInfo);
      return Response.redirect(`${origin}/#/login?error=no_user_id`, 302);
    }

    console.log("[OAuth] Roblox user:", robloxUsername, "id:", robloxUserId);

    // ---- Step 3: Create/find Supabase user ----
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
    const email = `${robloxUserId}@roblox.fluxcore.app`;

    // Check verified_users first
    const { data: existingVerified } = await adminSupabase
      .from("verified_users")
      .select("user_id")
      .eq("roblox_user_id", robloxUserId)
      .maybeSingle();

    let userId: string;

    if (existingVerified?.user_id) {
      userId = existingVerified.user_id;
      console.log("[OAuth] Found existing verified user:", userId);
      // Update username
      await adminSupabase
        .from("verified_users")
        .update({ roblox_username: robloxUsername })
        .eq("user_id", userId);
    } else {
      // Try create new user
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { roblox_user_id: robloxUserId, roblox_username: robloxUsername },
      });

      if (createError) {
        // User might already exist - find by email
        const { data: listData } = await adminSupabase.auth.admin.listUsers();
        const found = listData?.users?.find((u: any) => u.email === email);
        if (found) {
          userId = found.id;
          console.log("[OAuth] Found existing auth user:", userId);
        } else {
          console.error("[OAuth] Failed to create user:", createError);
          return Response.redirect(`${origin}/#/login?error=user_create_failed`, 302);
        }
      } else {
        userId = newUser.user!.id;
        console.log("[OAuth] Created new user:", userId);
      }

      // Upsert verified_users
      await adminSupabase.from("verified_users").upsert({
        user_id: userId,
        roblox_user_id: robloxUserId,
        roblox_username: robloxUsername,
        has_gamepass: false,
      }, { onConflict: "user_id" });
    }

    // Update metadata
    await adminSupabase.auth.admin.updateUserById(userId, {
      user_metadata: { roblox_user_id: robloxUserId, roblox_username: robloxUsername },
    });

    // ---- Step 4: Generate magic link ----
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData) {
      console.error("[OAuth] Magic link error:", linkError);
      return Response.redirect(`${origin}/#/login?error=session_failed`, 302);
    }

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) {
      console.error("[OAuth] No hashed_token in link data");
      return Response.redirect(`${origin}/#/login?error=session_failed`, 302);
    }

    console.log("[OAuth] Success! Redirecting user to callback");

    const callbackUrl = `${origin}/#/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&email=${encodeURIComponent(email)}`;
    return Response.redirect(callbackUrl, 302);

  } catch (err) {
    console.error("[OAuth] Unexpected error:", err);
    return Response.redirect(`${origin}/#/login?error=server_error`, 302);
  }
});
