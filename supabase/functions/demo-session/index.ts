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

const DEMO_EMAIL = "demo@fluxcore.works";
const DEMO_WORKSPACE_NAME = "Fluxcore Demo Group";

const FAKE_MEMBERS = [
  { roblox_user_id: "1", roblox_username: "Builderman", role: "Director", rank: 200 },
  { roblox_user_id: "156", roblox_username: "Shedletsky", role: "Manager", rank: 150 },
  { roblox_user_id: "261", roblox_username: "Sorcus", role: "Supervisor", rank: 120 },
  { roblox_user_id: "16", roblox_username: "Matt Dusek", role: "Senior Staff", rank: 100 },
  { roblox_user_id: "1580480", roblox_username: "Stickmasterluke", role: "Staff", rank: 80 },
  { roblox_user_id: "13365322", roblox_username: "Roblox_Demo_Aria", role: "Staff", rank: 80 },
  { roblox_user_id: "2032622", roblox_username: "Demo_Kayla", role: "Trainee", rank: 40 },
  { roblox_user_id: "4241021", roblox_username: "Demo_Marcus", role: "Trainee", rank: 40 },
  { roblox_user_id: "9887665", roblox_username: "Demo_Noah", role: "Trainee", rank: 40 },
  { roblox_user_id: "7712233", roblox_username: "Demo_Ellie", role: "Member", rank: 10 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    // 1. Ensure the demo account exists.
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
    if (existing) {
      userId = existing.id;
    } else {
      const password = crypto.randomUUID() + crypto.randomUUID();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password,
        email_confirm: true,
        user_metadata: { demo: true, roblox_username: "FluxcoreDemo" },
      });
      if (createErr || !created?.user) return json({ error: createErr?.message ?? "demo user failed" }, 500);
      userId = created.user.id;
    }

    // 2. Ensure the demo workspace exists.
    const { data: ws } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .eq("name", DEMO_WORKSPACE_NAME)
      .maybeSingle();

    let workspaceId = ws?.id as string | undefined;
    if (!workspaceId) {
      const { data: newWs, error: wsErr } = await admin
        .from("workspaces")
        .insert({
          name: DEMO_WORKSPACE_NAME,
          owner_id: userId,
          primary_color: "#2f74a8",
          tutorial_completed: true,
          verified_official: true,
        })
        .select("id")
        .single();
      if (wsErr || !newWs) return json({ error: wsErr?.message ?? "demo workspace failed" }, 500);
      workspaceId = newWs.id;
    }

    // 3. Seed the fake roster (only when empty, so demo edits persist for a while).
    const { count } = await admin
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if (!count) {
      await admin.from("workspace_members").insert(
        FAKE_MEMBERS.map((m) => ({
          workspace_id: workspaceId,
          roblox_user_id: m.roblox_user_id,
          roblox_username: m.roblox_username,
          role: m.role,
          roblox_group_rank: m.rank,
          verified: true,
        })),
      );
    }

    // 3b. Suppress first-run prompts for the demo account.
    await admin.from("user_birthdays").upsert(
      { user_id: userId, birthday_month: 6, birthday_day: 12 },
      { onConflict: "user_id" },
    );

    // 4. Mint a real session for the demo account.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: DEMO_EMAIL,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      return json({ error: linkErr?.message ?? "link failed" }, 500);
    }

    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
    });
    if (verifyErr || !verified?.session) return json({ error: verifyErr?.message ?? "session failed" }, 500);

    return json({
      workspace_id: workspaceId,
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
