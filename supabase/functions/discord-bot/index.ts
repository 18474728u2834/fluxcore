// Discord interactions endpoint. Verifies Ed25519 signature in code; this
// function intentionally deploys with verify_jwt = false because Discord calls
// it with its own signature, not a Supabase JWT.
import { createClient } from "npm:@supabase/supabase-js@2";

const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_ORIGIN = "https://fluxcore.works";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function hex2bytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function verifySignature(req: Request, raw: string): Promise<boolean> {
  const sig = req.headers.get("x-signature-ed25519");
  const ts  = req.headers.get("x-signature-timestamp");
  if (!sig || !ts) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw", hex2bytes(PUBLIC_KEY),
      { name: "Ed25519" } as any, false, ["verify"]
    );
    const data = new TextEncoder().encode(ts + raw);
    return await crypto.subtle.verify({ name: "Ed25519" } as any, key, hex2bytes(sig), data);
  } catch { return false; }
}

function ephemeral(content: string) {
  return new Response(JSON.stringify({ type: 4, data: { content, flags: 64 } }), {
    headers: { "Content-Type": "application/json" },
  });
}

function randomToken(n = 10) {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = ""; const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  for (const b of buf) s += a[b % a.length];
  return s;
}

async function workspaceForGuild(guild_id: string): Promise<string | null> {
  const { data } = await admin.rpc("internal_discord_workspace_for_guild", { _guild_id: guild_id });
  return data ?? null;
}

async function resolveCaller(guild_id: string, discord_user_id: string) {
  const { data } = await admin.rpc("internal_discord_resolve_user", { _guild_id: guild_id, _discord_user_id: discord_user_id });
  const row = Array.isArray(data) ? data[0] : data;
  return row as { user_id: string; workspace_id: string } | null;
}

async function hasPerm(user_id: string, workspace_id: string, perm: string) {
  const { data } = await admin.rpc("internal_member_has_permission", {
    _user_id: user_id, _workspace_id: workspace_id, _permission: perm,
  });
  return !!data;
}

function getOption(opts: any[] | undefined, name: string): any {
  return opts?.find((o: any) => o.name === name)?.value;
}

async function handleCommand(body: any): Promise<Response> {
  const cmd = body.data?.name as string;
  const opts = body.data?.options as any[] | undefined;
  const guild_id = body.guild_id as string | undefined;
  const member = body.member?.user || body.user;
  const discord_user_id = member?.id as string;
  const discord_username = member?.username as string;

  if (!guild_id) return ephemeral("This command must be used in a server.");

  // /verify — always allowed: generates a one-time link the user must click
  if (cmd === "verify") {
    const ws = await workspaceForGuild(guild_id);
    if (!ws) return ephemeral("This server isn't linked to a Fluxcore workspace yet. Ask the owner to install the bot from Fluxcore → Settings → Integrations.");
    const token = randomToken(10);
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await admin.from("discord_command_sessions").insert({
      token, discord_user_id, discord_username, guild_id, workspace_id: ws, expires_at: expires,
    });
    return ephemeral(`🔐 Verify with Fluxcore: ${APP_ORIGIN}/#/discord/verification/${token}\n(Single-use link, expires in 15 minutes. Only you can see this message.)`);
  }

  // Everything else requires the caller to be verified
  const caller = await resolveCaller(guild_id, discord_user_id);
  if (!caller) return ephemeral("You need to verify first. Run `/verify` to link your Fluxcore account.");

  if (cmd === "promote" || cmd === "demote") {
    const ok = await hasPerm(caller.user_id, caller.workspace_id, "promote_members");
    if (!ok) return ephemeral("You don't have permission to run this command.");
    const target = (getOption(opts, "user") as string)?.trim();
    if (!target) return ephemeral("Usage: /" + cmd + " user:<roblox-username>");
    const { data, error } = await admin.functions.invoke("roblox-rank", {
      body: { workspace_id: caller.workspace_id, action: cmd, target_username: target, actor_user_id: caller.user_id },
    });
    if (error) return ephemeral("Failed: " + error.message);
    return ephemeral(`✅ ${cmd === "promote" ? "Promoted" : "Demoted"} ${target}. ${data?.from?.name ? `${data.from.name} → ${data.to?.name}` : ""}`);
  }

  if (cmd === "warn") {
    const ok = await hasPerm(caller.user_id, caller.workspace_id, "manage_members");
    if (!ok) return ephemeral("You don't have permission to issue warnings.");
    const target = getOption(opts, "user") as string;
    const reason = getOption(opts, "reason") as string;
    if (!target || !reason) return ephemeral("Usage: /warn user:<name> reason:<text>");
    const { data: members } = await admin.from("workspace_members")
      .select("id, roblox_username, role").eq("workspace_id", caller.workspace_id).ilike("roblox_username", target).limit(1);
    const m = members?.[0];
    if (!m) return ephemeral(`No member named "${target}" found in this workspace.`);
    await admin.from("member_logs").insert({
      workspace_id: caller.workspace_id, member_id: m.id, action: "Warning", reason,
      actor_user_id: caller.user_id, role_at_time: m.role,
    });
    return ephemeral(`⚠️ Warned ${m.roblox_username}: ${reason}`);
  }

  if (cmd === "lookup") {
    const target = getOption(opts, "user") as string;
    const { data: members } = await admin.from("workspace_members")
      .select("id, roblox_username, role, joined_at").eq("workspace_id", caller.workspace_id).ilike("roblox_username", target).limit(1);
    const m = members?.[0];
    if (!m) return ephemeral(`No member named "${target}" found.`);
    const { count: warns } = await admin.from("member_logs")
      .select("id", { count: "exact", head: true }).eq("member_id", m.id).eq("action", "Warning");
    return ephemeral(`👤 **${m.roblox_username}**\nRank: ${m.role}\nWarnings: ${warns ?? 0}\nJoined: ${m.joined_at?.slice(0, 10) ?? "—"}`);
  }

  // Determine if caller is workspace owner — owners don't have a workspace_members row.
  const { data: wsRow } = await admin.from("workspaces")
    .select("owner_id").eq("id", caller.workspace_id).maybeSingle();
  const isOwner = wsRow?.owner_id === caller.user_id;

  if (cmd === "loa") {
    const start = getOption(opts, "start") as string;
    const end = getOption(opts, "end") as string;
    const reason = getOption(opts, "reason") as string;
    if (!start || !end || !reason) return ephemeral("Usage: /loa start:<YYYY-MM-DD> end:<YYYY-MM-DD> reason:<text>");
    if (isOwner) return ephemeral("Owners don't need to submit LOA requests — you're always considered active.");
    const { data: wm } = await admin.from("workspace_members")
      .select("id").eq("workspace_id", caller.workspace_id).eq("user_id", caller.user_id).limit(1);
    const memberId = wm?.[0]?.id;
    if (!memberId) return ephemeral("Couldn't find your member record.");
    await admin.from("loa_requests").insert({
      workspace_id: caller.workspace_id, member_id: memberId, user_id: caller.user_id,
      start_date: start, end_date: end, reason, status: "pending",
    });
    return ephemeral(`📅 LOA submitted: ${start} → ${end}.`);
  }

  if (cmd === "quota") {
    if (isOwner) return ephemeral("🎯 Owners aren't bound by quotas.");
    const { data: wm } = await admin.from("workspace_members")
      .select("id, role_id").eq("workspace_id", caller.workspace_id).eq("user_id", caller.user_id).limit(1);
    const m = wm?.[0];
    if (!m) return ephemeral("You aren't a member of this workspace.");
    const { data: q } = await admin.from("workspace_quotas")
      .select("*").eq("workspace_id", caller.workspace_id).eq("role_id", m.role_id).limit(1);
    const row = q?.[0];
    if (!row) return ephemeral("No quota configured for your role.");
    return ephemeral(`🎯 Quota for your role: ${row.min_sessions ?? 0} sessions, ${row.min_minutes ?? 0} min/week.`);
  }

  return ephemeral("Unknown command.");
}

const HEALTH_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: HEALTH_CORS });
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "online", service: "discord-bot" }), {
      headers: { ...HEALTH_CORS, "Content-Type": "application/json" },
    });
  }
  if (req.method !== "POST") return new Response("ok", { headers: HEALTH_CORS });
  const raw = await req.text();
  if (!(await verifySignature(req, raw))) {
    return new Response("invalid request signature", { status: 401 });
  }
  let body: any;
  try { body = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  if (body.type === 1) return new Response(JSON.stringify({ type: 1 }), { headers: { "Content-Type": "application/json" } });
  if (body.type === 2) {
    try { return await handleCommand(body); }
    catch (e) { return ephemeral("Error: " + (e as Error).message); }
  }
  return new Response("unhandled", { status: 200 });
});
