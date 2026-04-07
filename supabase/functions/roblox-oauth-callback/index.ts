import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    try {
      let origin: string;
      let codeVerifier: string;
      try {
        const parsed = JSON.parse(atob(state));
        origin = parsed.origin;
        codeVerifier = parsed.code_verifier;
      } catch {
        return new Response("Invalid state", { status: 400 });
      }

      const clientId = Deno.env.get("ROBLOX_CLIENT_ID")!;
      const clientSecret = Deno.env.get("ROBLOX_CLIENT_SECRET")!;
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const redirectUri = `${supabaseUrl}/functions/v1/roblox-oauth-callback`;

      // Exchange code for tokens with PKCE code_verifier
      const tokenBody: Record<string, string> = {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      };
      if (codeVerifier) {
        tokenBody.code_verifier = codeVerifier;
      }

      const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + btoa(`${clientId}:${clientSecret}`),
        },
        body: new URLSearchParams(tokenBody),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("Token exchange failed:", tokenData);
        return Response.redirect(`${origin}/#/login?error=token_exchange_failed`, 302);
      }

      // Get user info
      const userInfoRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` },
      });

      const userInfo = await userInfoRes.json();

      if (!userInfoRes.ok || !userInfo.sub) {
        console.error("User info failed:", userInfo);
        return Response.redirect(`${origin}/#/login?error=userinfo_failed`, 302);
      }

      const robloxUserId = userInfo.sub;
      const robloxUsername = userInfo.preferred_username || userInfo.name || `User${robloxUserId}`;

      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

      const email = `${robloxUserId}@roblox.fluxcore.app`;

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
        const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { roblox_user_id: robloxUserId, roblox_username: robloxUsername },
        });

        if (createError) {
          const { data: listData } = await adminSupabase.auth.admin.listUsers();
          const found = listData?.users?.find((u: any) => u.email === email);
          if (found) {
            userId = found.id;
          } else {
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

      await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: { roblox_user_id: robloxUserId, roblox_username: robloxUsername },
      });

      // Generate magic link
      const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (linkError || !linkData) {
        throw linkError || new Error("Failed to generate session link");
      }

      const tokenHash = linkData.properties?.hashed_token;

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
