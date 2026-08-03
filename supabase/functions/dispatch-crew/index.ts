// Flight Dispatch — assign crew roles for a scheduled session occurrence and
// DM the assigned member on Discord (if their Discord account is linked).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sendDm(discordUserId: string, content: string) {
  if (!BOT_TOKEN) return "Discord bot token not configured";
  const chRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: discordUserId }),
  });
  if (!chRes.ok) return `DM channel failed [${chRes.status}]: ${await chRes.text()}`;
  const ch = await chRes.json();
  const msgRes = await fetch(`https://discord.com/api/v10/channels/${ch.id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!msgRes.ok) return `DM send failed [${msgRes.status}]: ${await msgRes.text()}`;
  return null;
}

async function isInLinkedGuild(discordUserId: string, guildIds: string[]) {
  if (!BOT_TOKEN) return false;
  for (const gid of guildIds) {
    const res = await fetch(`https://discord.com/api/v10/guilds/${gid}/members/${discordUserId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    if (res.ok) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Not authenticated" }, 401);
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      workspace_id,
      session_id,
      occurrence_at,
      assignments, // [{ roblox_username, member_id, crew_role }]
      notify = true,
    } = body ?? {};

    if (!workspace_id || !session_id || !occurrence_at || !Array.isArray(assignments)) {
      return json({ error: "workspace_id, session_id, occurrence_at and assignments are required" }, 400);
    }

    const { data: allowed } = await admin.rpc("internal_member_has_permission", {
      _user_id: user.id,
      _workspace_id: workspace_id,
      _permission: "flight_dispatch",
    });
    if (!allowed) return json({ error: "You don't have the Flight Dispatcher permission" }, 403);

    const { data: actor } = await admin
      .from("verified_users").select("roblox_username").eq("user_id", user.id).maybeSingle();

    const { data: session } = await admin
      .from("scheduled_sessions")
      .select("id, title, category, workspace_id, game_url, route_number, origin, destination")
      .eq("id", session_id).eq("workspace_id", workspace_id).maybeSingle();
    if (!session) return json({ error: "Session not found" }, 404);

    const { data: ws } = await admin
      .from("workspaces").select("name").eq("id", workspace_id).maybeSingle();

    const { data: guilds } = await admin
      .from("workspace_discord_guilds").select("guild_id").eq("workspace_id", workspace_id);
    const guildIds = ((guilds as any[]) || []).map((g) => String(g.guild_id));

    const when = new Date(occurrence_at);
    const results: any[] = [];

    for (const a of assignments) {
      const username = String(a?.roblox_username || "").trim();
      const crewRole = String(a?.crew_role || "").trim();
      if (!username || !crewRole) continue;

      const { data: row, error: upErr } = await admin
        .from("session_crew_assignments")
        .upsert({
          workspace_id,
          session_id,
          occurrence_at: when.toISOString(),
          member_id: a?.member_id ?? null,
          roblox_username: username,
          crew_role: crewRole,
          assigned_by: user.id,
          assigned_by_name: actor?.roblox_username ?? null,
        }, { onConflict: "session_id,occurrence_at,roblox_username" })
        .select("id")
        .single();

      if (upErr) {
        results.push({ roblox_username: username, ok: false, error: upErr.message });
        continue;
      }

      let dmError: string | null = "No linked Discord account";
      if (notify) {
        let discordUserId: string | null = null;
        if (a?.member_id) {
          const { data: member } = await admin
            .from("workspace_members").select("user_id, discord_user_id").eq("id", a.member_id).maybeSingle();
          if (member?.user_id) {
            const { data: link } = await admin
              .from("discord_links").select("discord_user_id")
              .eq("workspace_id", workspace_id).eq("user_id", member.user_id).maybeSingle();
            discordUserId = link?.discord_user_id ?? null;
          }
          // Fallback: a Discord ID assigned manually by staff. Only DM it when
          // that user is actually in a guild this workspace has the bot in.
          if (!discordUserId && (member as any)?.discord_user_id) {
            const manual = String((member as any).discord_user_id);
            if (guildIds.length === 0) {
              dmError = "No Discord server linked to this workspace";
            } else if (await isInLinkedGuild(manual, guildIds)) {
              discordUserId = manual;
            } else {
              dmError = "That Discord user isn't in the linked Discord server";
            }
          }
        }

        if (discordUserId) {
          const lines = [
            `**${ws?.name || "Fluxcore"} — crew assignment**`,
            "",
            `You have been assigned as **${crewRole}** for **${session.route_number ? session.route_number + " · " : ""}${session.title}**.`,
            `When: <t:${Math.floor(when.getTime() / 1000)}:F>`,
          ];
          if (session.origin || session.destination) {
            lines.push(`Route: ${session.origin || "—"} to ${session.destination || "—"}`);
          }
          if (session.game_url) lines.push(`Game: ${session.game_url}`);
          lines.push("", `Dispatched by ${actor?.roblox_username || "a dispatcher"}.`);
          dmError = await sendDm(discordUserId, lines.join("\n"));
        }

        await admin.from("session_crew_assignments").update({
          notified_at: dmError ? null : new Date().toISOString(),
          notify_error: dmError,
        }).eq("id", row.id);
      }

      results.push({ roblox_username: username, ok: true, notified: notify && !dmError, notify_error: dmError });
    }

    return json({ success: true, results });
  } catch (err) {
    console.error("dispatch-crew error", err);
    return json({ error: (err as Error).message || "Unexpected error" }, 500);
  }
});
