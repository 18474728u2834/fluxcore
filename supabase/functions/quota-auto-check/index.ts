// Quota auto-check — runs on a schedule (pg_cron). For every workspace with
// quota_log_mode != 'none', evaluates each quota ONLY when its period has just
// ended (daily → previous UTC day; weekly → previous ISO week ending Monday
// 00:00 UTC; monthly → previous calendar month). Either posts a Discord embed
// (mode = 'webhook') or inserts member_logs warnings (mode = 'warning').
// Idempotent: dedupes against existing warnings created since the period start.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Returns the previous full period [start, end) and whether it ended within
// the last 24h (so a once-a-day cron picks it up exactly once).
function previousPeriod(period: string, now = new Date()) {
  let start: Date, end: Date;
  if (period === "daily") {
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    start = new Date(end); start.setUTCDate(start.getUTCDate() - 1);
  } else if (period === "monthly") {
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  } else {
    // weekly (default): week boundary = Monday 00:00 UTC
    const day = now.getUTCDay(); // 0=Sun..6=Sat
    const daysSinceMonday = (day + 6) % 7;
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday));
    start = new Date(end); start.setUTCDate(start.getUTCDate() - 7);
  }
  const justEnded = (now.getTime() - end.getTime()) >= 0 && (now.getTime() - end.getTime()) < 24 * 60 * 60 * 1000;
  return { start, end, justEnded };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1"; // manual test override

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary: Array<{ workspace: string; mode: string; missed: number; warned: number; periods: string[] }> = [];

  const { data: workspaces, error: wsErr } = await supabase
    .from("workspaces")
    .select("id, name, owner_id, quota_log_mode, quota_log_webhook_url")
    .neq("quota_log_mode", "none")
    .not("quota_log_mode", "is", null);

  if (wsErr) {
    return new Response(JSON.stringify({ error: wsErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const ws of workspaces || []) {
    const mode = (ws as any).quota_log_mode as string;
    const webhookUrl = (ws as any).quota_log_webhook_url as string | null;
    if (mode === "webhook" && !webhookUrl) continue;

    const { data: quotas } = await supabase
      .from("workspace_quotas").select("*").eq("workspace_id", ws.id);
    if (!quotas?.length) continue;

    // Only evaluate quotas whose period just ended (or all when force=1).
    const dueQuotas = (quotas as any[]).filter((q) => force || previousPeriod(q.period).justEnded);
    const periodsHit = Array.from(new Set(dueQuotas.map((q) => q.period)));
    if (!dueQuotas.length) {
      summary.push({ workspace: ws.name, mode, missed: 0, warned: 0, periods: [] });
      continue;
    }

    const { data: members } = await supabase
      .from("workspace_members")
      .select("id, user_id, roblox_username, roblox_user_id, role_id")
      .eq("workspace_id", ws.id);
    if (!members?.length) continue;

    // Pre-load department membership for any dept-scoped quotas.
    const deptIds = Array.from(new Set(dueQuotas.map((q: any) => q.department_id).filter(Boolean))) as string[];
    const deptMembers: Record<string, Set<string>> = {};
    if (deptIds.length) {
      const { data: dm } = await supabase
        .from("department_members")
        .select("department_id, member_id")
        .in("department_id", deptIds);
      for (const id of deptIds) deptMembers[id] = new Set();
      (dm || []).forEach((r: any) => deptMembers[r.department_id]?.add(r.member_id));
    }

    const misses: Record<string, { member: any; entries: { q: any; current: number; start: Date; end: Date }[] }> = {};

    for (const q of dueQuotas) {
      const { start, end } = previousPeriod(q.period);
      let filtered = q.role_id ? members.filter((m: any) => m.role_id === q.role_id) : members;
      if (q.department_id) {
        const allowed = deptMembers[q.department_id] || new Set();
        filtered = filtered.filter((m: any) => allowed.has(m.id));
      }


      for (const m of filtered) {
        let current = 0;
        if (q.quota_type === "sessions") {
          const { count } = await supabase
            .from("scheduled_sessions")
            .select("*", { count: "exact", head: true })
            .eq("workspace_id", ws.id)
            .or(`host_name.eq.${m.roblox_username},co_host_name.eq.${m.roblox_username},trainer_name.eq.${m.roblox_username}`)
            .gte("scheduled_at", start.toISOString())
            .lt("scheduled_at", end.toISOString());
          current = count || 0;
        } else {
          const { data: ses } = await supabase
            .from("activity_sessions")
            .select("duration_seconds")
            .eq("workspace_id", ws.id)
            .eq("roblox_user_id", m.roblox_user_id)
            .gte("joined_at", start.toISOString())
            .lt("joined_at", end.toISOString());
          current = Math.round((ses || []).reduce((s: number, x: any) => s + (x.duration_seconds || 0), 0) / 60);
        }
        if (current < q.target_value) {
          if (!misses[m.id]) misses[m.id] = { member: m, entries: [] };
          misses[m.id].entries.push({ q, current, start, end });
        }
      }
    }

    const missList = Object.values(misses);
    if (!missList.length) { summary.push({ workspace: ws.name, mode, missed: 0, warned: 0, periods: periodsHit }); continue; }

    let warned = 0;

    if (mode === "warning") {
      // Dedupe per (member, period): skip if a warning already exists since the period start.
      const rows: any[] = [];
      for (const { member, entries } of missList) {
        // Use the earliest period start among the failed quotas for the dedupe window.
        const earliestStart = entries.reduce((a, b) => (a.start < b.start ? a : b)).start;
        const { data: existing } = await supabase
          .from("member_logs")
          .select("id")
          .eq("workspace_id", ws.id)
          .eq("member_id", member.id)
          .eq("log_type", "warning")
          .eq("author_name", "Quota Check")
          .gte("created_at", earliestStart.toISOString())
          .limit(1);
        if (existing && existing.length) continue;
        rows.push({
          workspace_id: ws.id,
          member_id: member.id,
          author_id: (member.user_id ?? (ws as any).owner_id) as string,
          author_name: "Quota Check",
          log_type: "warning",
          content: "Missed quota: " + entries.map((e) => `${e.q.title} (${e.current}/${e.q.target_value}, ${e.q.period})`).join(", "),
        });
      }
      if (rows.length) {
        const { error } = await supabase.from("member_logs").insert(rows);
        if (!error) warned = rows.length;
      }
    } else if (mode === "webhook") {
      const lines = missList.map(({ member, entries }) =>
        `• **${member.roblox_username}** — ${entries.map((e) => `${e.q.title} (${e.current}/${e.q.target_value}, ${e.q.period})`).join(", ")}`,
      );
      const embed = {
        title: `⚠️ Quota Report — ${ws.name}`,
        description: `Periods ended: ${periodsHit.join(", ")}\n\n${lines.join("\n")}`.slice(0, 4000),
        color: 0xf59e0b,
        footer: { text: "Fluxcore Systems · Automatic check" },
        timestamp: new Date().toISOString(),
      };
      try {
        const res = await fetch(webhookUrl!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] }),
        });
        if (res.ok) warned = missList.length;
      } catch { /* ignore */ }
    }

    summary.push({ workspace: ws.name, mode, missed: missList.length, warned, periods: periodsHit });
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
