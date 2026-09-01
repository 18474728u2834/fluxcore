import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADJECTIVES = [
  "swift", "bright", "calm", "bold", "quiet", "lucky", "wild", "loyal",
  "noble", "clever", "fierce", "gentle", "rapid", "quirky", "vivid", "stoic",
  "sunny", "amber", "cobalt", "crimson", "midnight", "frosty", "stormy", "mellow",
];
const NOUNS = [
  "tiger", "falcon", "panther", "wolf", "otter", "raven", "lynx", "fox",
  "comet", "ember", "harbor", "ridge", "meadow", "summit", "river", "delta",
  "pixel", "vector", "nebula", "atlas", "echo", "lumen", "axiom", "cipher",
];

function randInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function generateCode(): string {
  const num = String(1000 + randInt(9000));
  return `fluxcore-${ADJECTIVES[randInt(ADJECTIVES.length)]}-${NOUNS[randInt(NOUNS.length)]}-${num}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { action, username, checkGamepass, gamepassId } = await req.json();

    if (!username || typeof username !== "string" || !/^[A-Za-z0-9_]{3,20}$/.test(username.trim())) {
      return new Response(JSON.stringify({ error: "Invalid username" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const usernameLower = username.trim().toLowerCase();

    // ---- Issue a server-generated, single-use challenge ----
    if (action === "challenge") {
      const code = generateCode();
      const { error: insErr } = await adminSupabase
        .from("roblox_verification_challenges")
        .insert({ username_lower: usernameLower, code });
      if (insErr) throw insErr;
      return new Response(JSON.stringify({ code }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Verify against the stored challenge (never the client's copy) ----
    const { data: challenge } = await adminSupabase
      .from("roblox_verification_challenges")
      .select("id, code, expires_at, used_at")
      .eq("username_lower", usernameLower)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!challenge) {
      return new Response(JSON.stringify({
        success: false,
        bioMatch: false,
        hasGamepass: false,
        error: "Verification code expired. Please generate a new code and try again.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const emojiCode = challenge.code as string;

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

    // Step 2: Check bio for the server-issued code
    const profileRes = await fetch(`https://users.roblox.com/v1/users/${robloxUserId}`);
    const profileData = await profileRes.json();
    const bio = profileData?.description || "";
    const bioMatch = bio.trim().startsWith(emojiCode);

    if (!bioMatch) {
      return new Response(JSON.stringify({
        success: false,
        bioMatch: false,
        hasGamepass: false,
        error: "Bio emoji verification failed. Make sure the emojis are at the very start of your bio.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Optionally check gamepass
    let hasGamepass = false;
    if (checkGamepass && gamepassId) {
      try {
        const gpRes = await fetch(
          `https://inventory.roblox.com/v1/users/${robloxUserId}/items/GamePass/${gamepassId}`
        );
        const gpData = await gpRes.json();
        hasGamepass = Array.isArray(gpData?.data) && gpData.data.length > 0;
      } catch {
        hasGamepass = false;
      }
    }

    // Step 4: Create or sign in Supabase user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
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
    } else {
      // Create a new Supabase user
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { roblox_user_id: robloxUserId, roblox_username: robloxUsername },
      });

      if (createError) {
        // User might already exist in auth but not in verified_users
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

      // Insert into verified_users
      await adminSupabase.from("verified_users").upsert({
        user_id: userId,
        roblox_user_id: robloxUserId,
        roblox_username: robloxUsername,
        has_gamepass: hasGamepass,
      }, { onConflict: "user_id" });
    }

    // Generate magic link token for client session
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData) {
      throw linkError || new Error("Failed to generate session link");
    }

    // Extract token hash from the link properties
    const tokenHash = linkData.properties?.hashed_token;

    return new Response(JSON.stringify({
      success: true,
      bioMatch: true,
      hasGamepass,
      robloxUserId,
      robloxUsername,
      tokenHash,
      email,
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
