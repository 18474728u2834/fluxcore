import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const url = new URL(req.url);

  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      console.error("Missing code or state", { code: !!code, state: !!state });
      return new Response("Missing code or state", { status: 400 });
    }

    try {
      let origin: string;
      let codeVerifier: string;
      try {
        const parsed = JSON.parse(atob(state));
        origin = parsed.origin;
        codeVerifier = parsed.code_verifier;
      } catch (e) {
        console.error("Failed to parse state:", e);
        return new Response("Invalid state", { status: 400 });
      }

      const clientId = Deno.env.get("ROBLOX_CLIENT_ID");
      const clientSecret = Deno.env.get("ROBLOX_CLIENT_SECRET");
      const supabaseUrl = Deno.env.get("SUPABASE_URL");

      if (!clientId || !clientSecret || !supabaseUrl) {
        console.error("Missing env vars:", {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          hasSupabaseUrl: !!supabaseUrl,
        });
        return Response.redirect(`${origin}/#/login?error=server_config_error`, 302);
      }

      const redirectUri = `${supabaseUrl}/functions/v1/roblox-oauth-callback`;
      console.log("Token exchange with redirect_uri:", redirectUri);

      // Build token request body
      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      });
      if (codeVerifier) {
        tokenBody.set("code_verifier", codeVerifier);
      }

      console.log("Sending token request to Roblox...");

      const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenBody,
      });

      const tokenText = await tokenRes.text();
      console.log("Token response status:", tokenRes.status);
      console.log("Token response body:", tokenText);

      let tokenData: any;
      try {
        tokenData = JSON.parse(tokenText);
      } catch {
        console.error("Failed to parse token response as JSON:", tokenText);
        return Response.redirect(`${origin}/#/login?error=token_parse_failed`, 302);
      }

      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("Token exchange failed:", tokenData);
        return Response.redirect(`${origin}/#/login?error=token_exchange_failed`, 302);
      }

      // Get user info
      const userInfoRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` },
      });

      const userInfo = await userInfoRes.json();
      console.log("User info response:", JSON.stringify(userInfo));

      if (!userInfoRes.ok || !userInfo.sub) {
        console.error("User info failed:", userInfo);
        return Response.redirect(`${origin}/#/login?error=userinfo_failed`, 302);
      }

      const robloxUserId = userInfo.sub;
      const robloxUsername = userInfo.preferred_username || userInfo.name || `User${robloxUserId}`;

      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

      const email = `${robloxUserId}@roblox.fluxcore.app`;

      // Check if user already exists in verified_users
      const { data: existingVerified } = await adminSupabase
        .from("verified_users")
        .select("user_id")
        .eq("roblox_user_id", robloxUserId)
        .maybeSingle();

      let userId: string;

      if (existingVerified?.user_id) {
        userId = existingVerified.user_id;
        await adminSupabase
          .from("verified_users")
          .update({ roblox_username: robloxUsername })
          .eq("user_id", userId);
      } else {
        // Try to create a new user
        const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { roblox_user_id: robloxUserId, roblox_username: robloxUsername },
        });

        if (createError) {
          // User might already exist
          const { data: listData } = await adminSupabase.auth.admin.listUsers();
          const found = listData?.users?.find((u: any) => u.email === email);
          if (found) {
            userId = found.id;
          } else {
            console.error("Failed to create user:", createError);
            throw createError;
          }
        } else {
          userId = newUser.user!.id;
        }

        await adminSupabase.from("verified_users").upsert({
          user_id: userId,
          roblox_user_id: robloxUserId,
          roblox_username: robloxUsername,
          has_gamepass: false,
        }, { onConflict: "user_id" });
      }

      // Update user metadata
      await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: { roblox_user_id: robloxUserId, roblox_username: robloxUsername },
      });

      // Generate magic link token
      const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (linkError || !linkData) {
        console.error("Magic link error:", linkError);
        throw linkError || new Error("Failed to generate session link");
      }

      const tokenHash = linkData.properties?.hashed_token;
      console.log("Successfully generated magic link, redirecting user");

      const callbackUrl = `${origin}/#/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&email=${encodeURIComponent(email)}`;
      return Response.redirect(callbackUrl, 302);

    } catch (err) {
      console.error("OAuth callback error:", err);
      const fallbackOrigin = (() => {
        try { return JSON.parse(atob(url.searchParams.get("state")!)).origin; } catch { return ""; }
      })();
      return Response.redirect(`${fallbackOrigin}/#/login?error=server_error`, 302);
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
