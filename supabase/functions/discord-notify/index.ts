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
type AdvancedField = { name?: string; value?: string; inline?: boolean };
type AdvancedEmbed = {
  author?: { name?: string; url?: string; icon_url?: string };
  title?: string;
  url?: string;
  description?: string;
  color?: string;
  fields?: AdvancedField[];
  image_url?: string;
  thumbnail_url?: string;
  footer?: { text?: string; icon_url?: string };
  timestamp?: boolean;
};
type Template = {
  category: string;
  use_embed: boolean;
  title: string;
  description: string;
  color: string;
  image_url: string | null;
  image_position: "middle" | "bottom";
  link_mode: "embedded" | "plain";
  link_label: string;
  link_position: "field" | "description" | "below";
  show_claims: boolean;
  show_host: boolean;
  show_time: boolean;
  plain_message: string | null;
  advanced_mode?: boolean;
  content?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  embeds?: AdvancedEmbed[] | null;
};

const FOOTER_TEXT = "Fluxcore Systems";

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

const hexToInt = (hex?: string | null, fallback = 0x22c55e) => {
  if (!hex) return fallback;
  const m = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return fallback;
  return parseInt(m, 16);
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

const dayKeys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayToken = (value: string) => {
  const clean = String(value).trim().toLowerCase();
  if (/^\d+$/.test(clean)) return dayKeys[Number(clean) % 7].toLowerCase();
  return clean.slice(0, 3);
};
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
    return days.flatMap((day) => {
      if (!wanted.has(dayKeys[day.getUTCDay()].toLowerCase())) return [];
      const occ = new Date(day);
      occ.setUTCHours(base.getUTCHours(), base.getUTCMinutes(), 0, 0);
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

const sendDiscord = async (webhookUrl: string, payload: Record<string, unknown>) => {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) return { ok: true as const };
  return { ok: false as const, status: res.status, error: await res.text() };
};

const inviteInfo = (workspace: WorkspaceRow, portal?: PortalRow) => {
  const base = portal?.subdomain ? `https://${portal.subdomain}.fluxcore.works` : "https://fluxcore.works";
  return { base, url: workspace.invite_code ? `${base}/#/join/${workspace.invite_code}` : null };
};

const defaultTemplate = (category: string): Template => ({
  category,
  use_embed: true,
  title: "🟢 {category} Starting Now",
  description: "**{title}** is starting!",
  color: category === "Training" ? "#f59e0b" : category === "Event" ? "#8b5cf6" : "#22c55e",
  image_url: null,
  image_position: "bottom",
  link_mode: "embedded",
  link_label: "Click to join",
  link_position: "field",
  show_claims: true,
  show_host: true,
  show_time: true,
  plain_message: "🟢 **{title}** ({category}) is starting now! {link}",
});

const fillTemplate = (text: string, ctx: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (_, k) => (ctx[k] ?? ""));

const buildPayloadFromTemplate = (
  template: Template,
  ctx: { title: string; category: string; host: string; time: string; claims: string; link: string; workspace: string; rawLink: string; invite: string },
): Record<string, unknown> => {
  const link = ctx.link;

  if (!template.use_embed) {
    const content = fillTemplate(template.plain_message || "{title} starting now {link}", ctx);
    // Plain mode still attaches a tiny footer-only embed for "Fluxcore Systems"
    return { content, embeds: [{ footer: { text: FOOTER_TEXT }, color: hexToInt(template.color) }] };
  }

  let description = fillTemplate(template.description, ctx);
  if (template.link_position === "description" && link) description += `\n\n${link}`;

  const fields: any[] = [];
  if (template.show_time) fields.push({ name: "🕐 Starts", value: ctx.time, inline: true });
  if (template.show_host) fields.push({ name: "👤 Host", value: ctx.host || "TBA", inline: true });
  fields.push({ name: "📂 Type", value: ctx.category, inline: true });
  if (template.show_claims) fields.push({ name: "✅ Claims", value: ctx.claims, inline: false });
  if (template.link_position === "field" && link) fields.push({ name: "🎮 Game", value: link, inline: false });
  if (ctx.invite) fields.push({ name: "🔗 Staff portal", value: ctx.invite, inline: false });

  const embed: Record<string, unknown> = {
    title: fillTemplate(template.title, ctx),
    description,
    color: hexToInt(template.color, categoryColor(template.category)),
    fields,
    footer: { text: FOOTER_TEXT },
    timestamp: new Date().toISOString(),
  };

  if (template.image_url) {
    if (template.image_position === "middle") (embed as any).thumbnail = { url: template.image_url };
    else (embed as any).image = { url: template.image_url };
  }

  const payload: Record<string, unknown> = { embeds: [embed] };
  if (template.link_position === "below" && link) payload.content = link;
  return payload;
};

const buildAdvancedPayload = (
  template: Template,
  ctx: Record<string, string>,
  occurrenceIso: string,
): Record<string, unknown> => {
  const fill = (s?: string | null) => (s ? fillTemplate(s, ctx) : "");
  const embedsIn = Array.isArray(template.embeds) ? template.embeds : [];
  const embedsOut: Record<string, unknown>[] = embedsIn.slice(0, 10).map((e) => {
    const out: Record<string, unknown> = {};
    const title = fill(e.title); if (title) out.title = title;
    const url = fill(e.url); if (url) out.url = url;
    const description = fill(e.description); if (description) out.description = description;
    out.color = hexToInt(e.color, categoryColor(template.category));
    const fields = (e.fields || [])
      .map((f) => ({ name: fill(f.name), value: fill(f.value), inline: !!f.inline }))
      .filter((f) => f.name && f.value).slice(0, 25);
    if (fields.length) out.fields = fields;
    if (e.image_url) out.image = { url: fill(e.image_url) || e.image_url };
    if (e.thumbnail_url) out.thumbnail = { url: fill(e.thumbnail_url) || e.thumbnail_url };
    if (e.footer?.text || e.footer?.icon_url) {
      const f: Record<string, unknown> = {};
      if (e.footer.text) f.text = fill(e.footer.text);
      if (e.footer.icon_url) f.icon_url = e.footer.icon_url;
      out.footer = f;
    }
    if (e.author?.name || e.author?.icon_url) {
      const a: Record<string, unknown> = {};
      if (e.author.name) a.name = fill(e.author.name);
      if (e.author.url) a.url = fill(e.author.url);
      if (e.author.icon_url) a.icon_url = e.author.icon_url;
      out.author = a;
    }
    if (e.timestamp) out.timestamp = occurrenceIso;
    return out;
  });

  // Always brand the LAST embed footer with "Fluxcore Systems"
  if (embedsOut.length) {
    const last = embedsOut[embedsOut.length - 1] as Record<string, unknown>;
    const existing = (last.footer as Record<string, unknown> | undefined) || {};
    last.footer = { ...existing, text: FOOTER_TEXT };
  } else {
    embedsOut.push({ footer: { text: FOOTER_TEXT }, color: hexToInt(template.color) });
  }

  const payload: Record<string, unknown> = { embeds: embedsOut };
  const content = fill(template.content || "");
  if (content) payload.content = content;
  if (template.username) payload.username = template.username;
  if (template.avatar_url) payload.avatar_url = template.avatar_url;
  return payload;
};

const getTemplate = async (supabase: ReturnType<typeof createClient>, workspaceId: string, category: string): Promise<Template> => {
  const cat = ["Shift", "Training", "Event"].includes(category) ? category : "Shift";
  const { data } = await supabase
    .from("webhook_templates")
    .select("category, use_embed, title, description, color, image_url, image_position, link_mode, link_label, link_position, show_claims, show_host, show_time, plain_message, advanced_mode, content, username, avatar_url, embeds")
    .eq("workspace_id", workspaceId)
    .eq("category", cat)
    .maybeSingle();
  if (data) return data as unknown as Template;
  return defaultTemplate(cat);
};

const sendSessionStarting = async (
  supabase: ReturnType<typeof createClient>,
  workspace: WorkspaceRow,
  portal: PortalRow | undefined,
  session: Pick<SessionRow, "title" | "category" | "host_name" | "game_url">,
  occurrenceIso: string,
  slots: Slot[],
) => {
  if (!workspace.discord_webhook_url) return { ok: false as const, error: "Discord webhook not configured" };
  const category = session.category || "Shift";
  const template = await getTemplate(supabase, workspace.id, category);
  const invite = inviteInfo(workspace, portal);
  const gameUrl = session.game_url || workspace.game_url || "";
  const host = firstAssignee(slots, session.host_name) || "TBA";
  const link = gameUrl
    ? (template.link_mode === "embedded" ? `[${template.link_label || "Click to join"}](${gameUrl})` : gameUrl)
    : "";

  const ctx = {
    title: session.title,
    category,
    host,
    time: formatTime(occurrenceIso),
    claims: assignmentSummary(slots),
    link,
    rawLink: gameUrl,
    workspace: workspace.name,
    invite: invite.url ? `[${invite.base.replace("https://", "")}](${invite.url})` : "",
  };

  const payload = template.advanced_mode
    ? buildAdvancedPayload(template, ctx, occurrenceIso)
    : buildPayloadFromTemplate(template, ctx);
  return sendDiscord(workspace.discord_webhook_url, payload);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await safeJson(req);
    const action = body?.action || "dispatch_due_sessions";
    const workspaceId = body?.workspace_id || null;

    const authHeader = req.headers.get("authorization") || "";

    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;

    if (!isServiceRole) {
      // Any non-cron caller: require a valid Supabase JWT + workspace membership
      if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const token = authHeader.replace("Bearer ", "");
      const sbAuth = createClient(supabaseUrl, anonKey);
      const { data: claims, error: claimsErr } = await sbAuth.auth.getClaims(token);
      const uid = claims?.claims?.sub as string | undefined;
      if (claimsErr || !uid) return json({ error: "Unauthorized" }, 401);
      if (!workspaceId) return json({ error: "Missing workspace_id" }, 400);

      const sbUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: ownerCheck } = await sbUser.rpc("is_workspace_owner", { _workspace_id: workspaceId });

      if (action === "dispatch_due_sessions") {
        // Members of the workspace may trigger their own workspace's dispatch
        if (!ownerCheck) {
          const { count } = await supabase
            .from("workspace_members")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspaceId)
            .eq("user_id", uid);
          if (!count) return json({ error: "Forbidden" }, 403);
        }
      } else if (!ownerCheck) {
        return json({ error: "Forbidden" }, 403);
      }
    }


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

      const { data: workspacesBase } = await supabase
        .from("workspaces")
        .select("id, name, game_url, invite_code")
        .in("id", workspaceIds);
      // Resolve each workspace's encrypted webhook via the internal helper
      const workspaces: WorkspaceRow[] = [];
      for (const w of (workspacesBase || [])) {
        const { data: s } = await supabase.rpc("internal_get_workspace_secrets", { _workspace_id: w.id });
        const sec = (Array.isArray(s) ? s[0] : s) as any;
        const url = sec?.discord_webhook_url || null;
        if (!url) continue;
        workspaces.push({ ...(w as any), discord_webhook_url: url });
      }
      const workspaceMap = new Map(workspaces.map((w: WorkspaceRow) => [w.id, w]));

      const { data: portals } = await supabase
        .from("partner_portals")
        .select("workspace_id, subdomain")
        .in("workspace_id", workspaceIds)
        .eq("status", "active");
      const portalMap = new Map((portals || []).map((p: PortalRow) => [p.workspace_id, p]));

      let sent = 0, skipped = 0, failed = 0;
      for (const session of (sessions || []) as SessionRow[]) {
        const workspace = workspaceMap.get(session.workspace_id);
        if (!workspace) { skipped++; continue; }
        for (const occurrence of occurrenceDates(session, now)) {
          if (occurrence < windowStart || occurrence > windowEnd) continue;
          const occurrenceIso = occurrence.toISOString();
          const { error: lockError } = await supabase.from("session_notifications").insert({
            session_id: session.id, workspace_id: session.workspace_id,
            occurrence_at: occurrenceIso, action: "session_starting",
          });
          if (lockError?.code === "23505") { skipped++; continue; }
          if (lockError) { console.error("notification lock failed", lockError); failed++; continue; }

          const result = await sendSessionStarting(supabase, workspace, portalMap.get(session.workspace_id), session, occurrenceIso, effectiveSlots(session, occurrenceIso));
          if (result.ok) sent++;
          else {
            failed++;
            console.error("Discord webhook failed", session.id, result);
            await supabase.from("session_notifications").delete()
              .eq("session_id", session.id).eq("occurrence_at", occurrenceIso).eq("action", "session_starting");
          }
        }
      }
      return json({ success: true, checked: sessions?.length || 0, sent, skipped, failed });
    }

    if (!workspaceId) return json({ error: "Missing workspace_id" }, 400);
    const { data: workspaceBase, error: workspaceError } = await supabase
      .from("workspaces").select("id, name, game_url, invite_code")
      .eq("id", workspaceId).maybeSingle();
    if (workspaceError) throw workspaceError;
    if (!workspaceBase) return json({ error: "Workspace not found" }, 404);
    const { data: wsSecRow } = await supabase.rpc("internal_get_workspace_secrets", { _workspace_id: workspaceId });
    const wsSec = (Array.isArray(wsSecRow) ? wsSecRow[0] : wsSecRow) as any;
    const workspace: any = { ...(workspaceBase as any), discord_webhook_url: wsSec?.discord_webhook_url || null };
    if (!workspace.discord_webhook_url) return json({ error: "Discord webhook not configured" }, 400);

    const { data: portal } = await supabase
      .from("partner_portals").select("workspace_id, subdomain")
      .eq("workspace_id", workspaceId).eq("status", "active").maybeSingle();

    if (action === "test") {
      const category = body?.category || "Shift";
      const result = await sendSessionStarting(supabase, workspace, portal || undefined, {
        title: `Test ${category}`, category, host_name: "Test Host", game_url: workspace.game_url,
      }, new Date().toISOString(), [
        { label: "Host", count: 1, assigned: ["TestHost"] },
        { label: "Co-Host", count: 1, assigned: [null] },
      ]);
      if (!result.ok) return json({ error: "Test failed", details: (result as any).error }, 502);
      return json({ success: true, message: "Test message sent!" });
    }

    if (action === "session_starting" || action === "send_reminder") {
      const occurrenceIso = body?.session_time || new Date().toISOString();
      const result = await sendSessionStarting(supabase, workspace, portal || undefined, {
        title: body?.session_title || "Session",
        category: body?.category || "Shift",
        host_name: body?.host_name || null,
        game_url: body?.game_url || null,
      }, occurrenceIso, []);
      if (!result.ok) return json({ error: "Discord webhook failed", details: (result as any).error }, 502);
      return json({ success: true });
    }

    if (action === "session_created") return json({ success: true, skipped: true });
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("discord-notify error:", err);
    return json({ error: "Internal server error", details: String(err) }, 500);
  }
});
