// Fluxcore License Gate.
// A Roblox server posts its game creator (user or group). We answer whether that
// creator is linked to a Fluxcore account / workspace. Used by the generated
// LicenseGate script: licensed -> protected code runs, unlicensed -> script:Destroy().
import { createClient } from "npm:@supabase/supabase-js@2";
import { guard } from "../_shared/apiGuard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const blocked = guard(req, { name: "license-check", methods: ["POST"], limit: 120, cors: cors });
  if (blocked) return blocked;

  try {
    const body = await req.json().catch(() => ({}));
    const creatorId = String(body.creatorId ?? "").trim();
    const creatorType = String(body.creatorType ?? "User").trim();

    if (!creatorId || !/^\d+$/.test(creatorId)) {
      return json({ licensed: false, reason: "invalid_creator" }, 200);
    }

    if (creatorType.toLowerCase() === "group") {
      const { data: ws } = await admin
        .from("workspaces")
        .select("id, name, owner_id")
        .eq("roblox_group_id", creatorId)
        .limit(1)
        .maybeSingle();

      if (!ws) return json({ licensed: false, reason: "group_not_linked" });

      const { data: owner } = await admin
        .from("verified_users")
        .select("roblox_username")
        .eq("user_id", ws.owner_id)
        .maybeSingle();

      return json({
        licensed: true,
        workspace: ws.name,
        owner: owner?.roblox_username ?? null,
        creator_type: "Group",
      });
    }

    const { data: vu } = await admin
      .from("verified_users")
      .select("user_id, roblox_username")
      .eq("roblox_user_id", creatorId)
      .maybeSingle();

    if (!vu) return json({ licensed: false, reason: "no_fluxcore_account" });

    const { data: ws } = await admin
      .from("workspaces")
      .select("name")
      .eq("owner_id", vu.user_id)
      .limit(1)
      .maybeSingle();

    return json({
      licensed: true,
      workspace: ws?.name ?? null,
      owner: vu.roblox_username,
      creator_type: "User",
    });
  } catch (e) {
    return json({ licensed: false, reason: "server_error", detail: String(e) }, 200);
  }
});
