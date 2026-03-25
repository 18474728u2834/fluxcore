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

  try {
    const { username, emojiCode, gamepassId } = await req.json();

    if (!username || !emojiCode || !gamepassId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Resolve username to Roblox user ID
    const usernameRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
    });

    const usernameData = await usernameRes.json();
    const robloxUser = usernameData?.data?.[0];

    if (!robloxUser) {
      return new Response(JSON.stringify({
        success: false,
        bioMatch: false,
        hasGamepass: false,
        error: "Roblox user not found. Check your username.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const robloxUserId = robloxUser.id.toString();
    const robloxUsername = robloxUser.name;

    // Step 2: Check bio for emoji code
    const profileRes = await fetch(`https://users.roblox.com/v1/users/${robloxUserId}`);
    const profileData = await profileRes.json();
    const bio = profileData?.description || "";
    const bioMatch = bio.startsWith(emojiCode);

    // Step 3: Check gamepass ownership
    let hasGamepass = false;
    try {
      const gpRes = await fetch(
        `https://inventory.roblox.com/v1/users/${robloxUserId}/items/GamePass/${gamepassId}`
      );
      const gpData = await gpRes.json();
      hasGamepass = Array.isArray(gpData?.data) && gpData.data.length > 0;
    } catch {
      // If inventory API fails, gamepass check fails
      hasGamepass = false;
    }

    // Step 4: If both pass, save verification to DB
    if (bioMatch && hasGamepass) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("verified_users").upsert({
            user_id: user.id,
            roblox_user_id: robloxUserId,
            roblox_username: robloxUsername,
            has_gamepass: true,
          }, { onConflict: "user_id" });
        }
      }
    }

    return new Response(JSON.stringify({
      success: bioMatch && hasGamepass,
      bioMatch,
      hasGamepass,
      robloxUserId,
      robloxUsername,
      error: !bioMatch
        ? "Bio emoji verification failed. Make sure the emojis are at the very start of your bio."
        : !hasGamepass
        ? "Gamepass not found. Please purchase the required gamepass."
        : null,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Verification error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
