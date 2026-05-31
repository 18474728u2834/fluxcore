import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Slot = { label?: string; count?: number; assigned?: (string | null)[] };
type SessionRow = {
  id: string;
  workspace_id: string;
  title: string;
  category: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  recurring: string | null;
  recurring_days: string[] | null;
  recurring_time: string | null;
  status: string;
  host_name: string | null;
  game_url: string | null;
  slots: Slot[] | null;
  occurrence_assignments: Record<string, (string | null)[][]> | null;
};
type WorkspaceRow = { id: string; name: string; discord_webhook_url: string | null; game_url: string | null; invite_code: string | null };
type PortalRow = { workspace_id: string; subdomain: string | null };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeJson = async (req: Request) => {
  try { return await req.json(); } catch (_) { return {}; }
};

const categoryColor = (category?: string | null) =>
  category === "Training" ? 0xf59e0b : category === "Event" ? 0x8b5cf6 : 0x22c55e;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

const dayKeys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayToken = (value: string) => value.trim().slice(0, 3).toLowerCase();
const isMeaningfulName = (value?: string | null) => Boolean(value && value.trim() && value !== "Unassigned");

const occurrenceDates = (session: SessionRow, now = new Date()) => {
  const base = new Date(session.scheduled_at);
  const days = [-1, 0, 1].map((offset) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  });

  if (session.recurring_days?.length) {
    const wanted = new Set(session.recurring_days.map(dayToken));
    const [hour, minute] = (session.recurring_time || `${base.getUTCHours()}:${base.getUTCMinutes()}`)
      .split(":")
      .map((part) => Number(part));
    return days.flatMap((day) => {
      if (!wanted.has(dayKeys[day.getUTCDay()].toLowerCase())) return [];
      const occ = new Date(day);
      occ.setUTCHours(Number.isFinite(hour) ? hour : base.getUTCHours(), Number.isFinite(minute) ? minute : base.getUTCMinutes(), 0, 0);
      return occ >= base ? [occ] : [];
    });
  }

  if (session.recurring === "weekly") {
    return days.flatMap((day) => {
      if (day.getUTCDay() !== base.getUTCDay()) return [];
      const occ = new Date(day);
      occ.setUTCHours(base.getUTCHours(), base.getUTCMinutes(), 0, 0);
      return occ >= base ? [occ] : [];
    });
  }

  if (session.recurring === "daily") {
    return days.flatMap((day) => {
      const occ = new Date(day);
      occ.setUTCHours(base.getUTCHours(), base.getUTCMinutes(), 0, 0);
      return occ >= base ? [occ] : [];
    });
  }

  return [base];
};

const effectiveSlots = (session: SessionRow, occurrenceIso: string): Slot[] => {
  const base = Array.isArray(session.slots) ? session.slots : [];
  const override = session.occurrence_assignments?.[occurrenceIso];
  const recurring = Boolean(session.recurring || session.recurring_days?.length);
  return base.map((slot, idx) => {
    const count = Math.max(1, Number(slot.count || slot.assigned?.length || 1));
    const assigned = Array.isArray(override?.[idx])
      ? [...override[idx]]
      : recurring
        ? Array(count).fill(null)
        : Array.isArray(slot.assigned) ? [...slot.assigned] : Array(count).fill(null);
    while (assigned.length < count) assigned.push(null);
    assigned.length = count;
    return { ...slot, count, assigned };
  });
};

const firstAssignee = (slots: Slot[], fallback?: string | null) =>
  slots.flatMap((slot) => slot.assigned || []).find(isMeaningfulName) || (isMeaningfulName(fallback) ? fallback : null);

const assignmentSummary = (slots: Slot[]) => {
  const lines = slots
    .map((slot) => {
      const names = (slot.assigned || []).filter(isMeaningfulName) as string[];
      return names.length ? `**${slot.label || "Role"}:** ${names.join(", ")}` : null;
    })
    .filter(Boolean) as string[];
  return lines.length ? lines.join("\n").slice(0, 1000) : "No claims yet";
};

const sendDiscord = async (webhookUrl: string, embeds: unknown[]) => {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds }),
  });
  if (res.ok) return { ok: true };
  return { ok: false, status: res.status, error: await res.text() };
};

const inviteInfo = (workspace: WorkspaceRow, portal?: PortalRow) => {
  const base = portal?.subdomain ? `https://${portal.subdomain}.fluxcore.works` : "https://fluxcore.works";
  return {
    base,
    url: workspace.invite_code ? `${base}/#/join/${workspace.invite_code}` : null,
  };
};

const sendSessionStarting = async (
  workspace: WorkspaceRow,
  portal: PortalRow | undefined,
  session: Pick<SessionRow, "title" | "category" | "host_name" | "game_url">,
  occurrenceIso: string,
  slots: Slot[],
) => {
  if (!workspace.discord_webhook_url) return { ok: false, error: "Discord webhook not configured" };
  const invite = inviteInfo(workspace, portal);
  const gameUrl = session.game_url || workspace.game_url;
  const host = firstAssignee(slots, session.host_name) || "TBA";
  const fields: any[] = [
    { name: "🕐 Starts", value: formatTime(occurrenceIso), inline: true },
    { name: "👤 Host", value: host, inline: true },
    { name: "📂 Type", value: session.category || "Shift", inline: true },
    { name: "✅ Claims", value: assignmentSummary(slots), inline: false },
  ];
  if (gameUrl) fields.push({ name: "🎮 Game", value: `[Click to join](${gameUrl})`, inline: false });
  if (invite.url) fields.push({ name: "🔗 Join staff portal", value: `[${invite.base.replace("https://", "")}](${invite.url})`, inline: false });

  return sendDiscord(workspace.discord_webhook_url, [{
    title: `🟢 ${session.category || "Shift"} Starting Now`,
    description: `**${session.title}** is starting!`,
    color: categoryColor(session.category),
    fields,
    footer: { text: `${workspace.name} · Fluxcore` },
    timestamp: new Date().toISOString(),
  }]);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await safeJson(req);
    const action = body?.action || "dispatch_due_sessions";
    const workspaceId = body?.workspace_id || null;

    if (action === "dispatch_due_sessions") {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 3 * 60_000);
      const windowEnd = new Date(now.getTime() + 75_000);
      let query = supabase
        .from("scheduled_sessions")
        .select("id, workspace_id, title, category, scheduled_at, duration_minutes, recurring, recurring_days, recurring_time, status, host_name, game_url, slots, occurrence_assignments")
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true })
        .range(0, 4999);
      if (workspaceId) query = query.eq("workspace_id", workspaceId);

      const { data: sessions, error: sessionsError } = await query;
      if (sessionsError) throw sessionsError;

      const workspaceIds = [...new Set(((sessions || []) as SessionRow[]).map((s) => s.workspace_id))];
      if (!workspaceIds.length) return json({ success: true, checked: 0, sent: 0, skipped: 0, failed: 0 });

      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id, name, discord_webhook_url, game_url, invite_code")
        .in("id", workspaceIds)
        .not("discord_webhook_url", "is", null);
      const workspaceMap = new Map((workspaces || []).map((w: WorkspaceRow) => [w.id, w]));

      const { data: portals } = await supabase
        .from("partner_portals")
        .select("workspace_id, subdomain")
        .in("workspace_id", workspaceIds)
        .eq("status", "active");
      const portalMap = new Map((portals || []).map((p: PortalRow) => [p.workspace_id, p]));

      let sent = 0;
      let skipped = 0;
      let failed = 0;
      for (const session of (sessions || []) as SessionRow[]) {
        const workspace = workspaceMap.get(session.workspace_id);
        if (!workspace) { skipped++; continue; }
        for (const occurrence of occurrenceDates(session, now)) {
          if (occurrence < windowStart || occurrence > windowEnd) continue;
          const occurrenceIso = occurrence.toISOString();
          const { error: lockError } = await supabase.from("session_notifications").insert({
            session_id: session.id,
            workspace_id: session.workspace_id,
            occurrence_at: occurrenceIso,
            action: "session_starting",
          });
          if (lockError?.code === "23505") { skipped++; continue; }
          if (lockError) { console.error("notification lock failed", lockError); failed++; continue; }

          const result = await sendSessionStarting(workspace, portalMap.get(session.workspace_id), session, occurrenceIso, effectiveSlots(session, occurrenceIso));
          if (result.ok) sent++;
          else {
            failed++;
            console.error("Discord webhook failed", session.id, result);
            await supabase.from("session_notifications").delete()
              .eq("session_id", session.id)
              .eq("occurrence_at", occurrenceIso)
              .eq("action", "session_starting");
          }
        }
      }

      return json({ success: true, checked: sessions?.length || 0, sent, skipped, failed, window_start: windowStart.toISOString(), window_end: windowEnd.toISOString() });
    }

    if (!workspaceId) return json({ error: "Missing workspace_id" }, 400);
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id, name, discord_webhook_url, game_url, invite_code")
      .eq("id", workspaceId)
      .maybeSingle();
    if (workspaceError) throw workspaceError;
    if (!workspace) return json({ error: "Workspace not found" }, 404);
    if (!workspace.discord_webhook_url) return json({ error: "Discord webhook not configured" }, 400);

    const { data: portal } = await supabase
      .from("partner_portals")
      .select("workspace_id, subdomain")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .maybeSingle();

    if (action === "test") {
      const result = await sendDiscord(workspace.discord_webhook_url, [{
        title: "✅ Fluxcore Connected",
        description: "Your Discord webhook is working. Session start alerts will be sent here automatically.",
        color: 0x06b6d4,
        footer: { text: `${workspace.name} · Fluxcore` },
        timestamp: new Date().toISOString(),
      }]);
      if (!result.ok) return json({ error: "Test failed", details: result.error }, 502);
      return json({ success: true, message: "Test message sent!" });
    }

    if (action === "session_starting" || action === "send_reminder") {
      const occurrenceIso = body?.session_time || new Date().toISOString();
      const result = await sendSessionStarting(workspace, portal || undefined, {
        title: body?.session_title || "Session",
        category: body?.category || "Shift",
        host_name: body?.host_name || null,
        game_url: body?.game_url || null,
      }, occurrenceIso, []);
      if (!result.ok) return json({ error: "Discord webhook failed", details: result.error }, 502);
      return json({ success: true });
    }

    if (action === "session_created") return json({ success: true, skipped: true });
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("discord-notify error:", err);
    return json({ error: "Internal server error", details: String(err) }, 500);
  }
});
