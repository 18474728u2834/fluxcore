import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsErr || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const linkToken = typeof body.link_token === "string" ? body.link_token : "";
  if (!linkToken) {
    return new Response(JSON.stringify({ error: "missing_token" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Lookup pending
  const { data: pending } = await admin
    .from("discord_pending_links")
    .select("discord_user_id, discord_username, expires_at")
    .eq("token", linkToken)
    .maybeSingle();

  if (!pending) {
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    await admin.from("discord_pending_links").delete().eq("token", linkToken);
    return new Response(JSON.stringify({ error: "expired" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Must already be Roblox-verified
  const { data: vu } = await admin
    .from("verified_users")
    .select("user_id, discord_user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!vu) {
    return new Response(JSON.stringify({ error: "not_verified" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Ensure this discord id isn't already linked to a different user
  const { data: existingLink } = await admin
    .from("verified_users")
    .select("user_id")
    .eq("discord_user_id", pending.discord_user_id)
    .maybeSingle();
  if (existingLink && existingLink.user_id !== userId) {
    return new Response(JSON.stringify({ error: "discord_already_linked" }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If this user already linked a different discord, reject
  if (vu.discord_user_id && vu.discord_user_id !== pending.discord_user_id) {
    return new Response(JSON.stringify({ error: "user_has_other_discord" }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: updErr } = await admin
    .from("verified_users")
    .update({
      discord_user_id: pending.discord_user_id,
      discord_username: pending.discord_username,
    })
    .eq("user_id", userId);

  if (updErr) {
    console.error("[Discord link] update err", updErr);
    return new Response(JSON.stringify({ error: "update_failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await admin.from("discord_pending_links").delete().eq("token", linkToken);

  return new Response(JSON.stringify({
    ok: true,
    discord_username: pending.discord_username,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
