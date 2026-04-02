import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // POST: Frontend sends code + origin for exchange
  if (req.method === "POST") {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    };

    try {
      const { code, redirect_uri } = await req.json();

      if (!code || !redirect_uri) {
        return new Response(JSON.stringify({ error: "Missing code or redirect_uri" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const clientId = Deno.env.get("ROBLOX_CLIENT_ID")!;
      const clientSecret = Deno.env.get("ROBLOX_CLIENT_SECRET")!;

      // Exchange code for tokens
      const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + btoa(`${clientId}:${clientSecret}`),
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri,
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("Token exchange failed:", tokenData);
        return new Response(JSON.stringify({ error: "Failed to exchange code", details: tokenData }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Get user info
      const userInfoRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` },
      });

      const userInfo = await userInfoRes.json();

      if (!userInfoRes.ok || !userInfo.sub) {
        console.error("User info failed:", userInfo);
        return new Response(JSON.stringify({ error: "Failed to get user info" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const robloxUserId = userInfo.sub;
      const robloxUsername = userInfo.preferred_username || userInfo.name || `User${robloxUserId}`;

      // Create or find Supabase user
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

      const email = `${robloxUserId}@roblox.fluxcore.app`;

      // Check if user exists
      const { data: existingVerified } = await adminSupabase
        .from("verified_users")
        .select("user_id")
        .eq("roblox_user_id", robloxUserId)
        .maybeSingle();

      let userId: string;

      if (existingVerified?.user_id) {
        userId = existingVerified.user_id;
        // Update username if changed
        await adminSupabase
          .from("verified_users")
          .update({ roblox_username: robloxUsername })
          .eq("user_id", userId);
      } else {
        // Create new user
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

      // Update user metadata
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

      return new Response(JSON.stringify({
        success: true,
        tokenHash,
        email,
        robloxUserId,
        robloxUsername,
      }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (err) {
      console.error("OAuth callback error:", err);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
