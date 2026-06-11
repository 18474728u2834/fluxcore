// Quota auto-check — runs on a schedule (pg_cron). For every workspace with
// quota_log_mode != 'none', evaluates each quota and either posts a Discord
// embed (mode = 'webhook') or inserts member_logs warnings (mode = 'warning').
// Idempotent: avoids re-warning a member for the same quota within a single
// period by deduping against existing 'warning' rows since the period start.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function periodSince(period: string): string {
  const now = new Date();
  if (period === "daily")  now.setUTCDate(now.getUTCDate() - 1);
  else if (period === "weekly") now.setUTCDate(now.getUTCDate() - 7);
  else if (period === "monthly") now.setUTCMonth(now.getUTCMonth() - 1);
  else now.setUTCDate(now.getUTCDate() - 7);
  return now.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary: Array<{ workspace: string; mode: string; missed: number; warned: number }> = [];

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

    const { data: members } = await supabase
      .from("workspace_members")
      .select("id, user_id, roblox_username, roblox_user_id, role_id")
      .eq("workspace_id", ws.id);
    if (!members?.length) continue;

    const misses: Record<string, { member: any; entries: { q: any; current: number }[] }> = {};

    for (const q of quotas) {
      const since = periodSince(q.period);
      const filtered = q.role_id ? members.filter((m: any) => m.role_id === q.role_id) : members;

      for (const m of filtered) {
        let current = 0;
        if (q.quota_type === "sessions") {
          const { count } = await supabase
            .from("scheduled_sessions")
            .select("*", { count: "exact", head: true })
            .eq("workspace_id", ws.id)
            .or(`host_name.eq.${m.roblox_username},co_host_name.eq.${m.roblox_username},trainer_name.eq.${m.roblox_username}`)
            .gte("scheduled_at", since);
          current = count || 0;
        } else {
          const { data: ses } = await supabase
            .from("activity_sessions")
            .select("duration_seconds")
            .eq("workspace_id", ws.id)
            .eq("roblox_user_id", m.roblox_user_id)
            .gte("joined_at", since);
          current = Math.round((ses || []).reduce((s: number, x: any) => s + (x.duration_seconds || 0), 0) / 60);
        }
        if (current < q.target_value) {
          if (!misses[m.id]) misses[m.id] = { member: m, entries: [] };
          misses[m.id].entries.push({ q, current });
        }
      }
    }

    const missList = Object.values(misses);
    if (!missList.length) { summary.push({ workspace: ws.name, mode, missed: 0, warned: 0 }); continue; }

    let warned = 0;

    if (mode === "warning") {
      // Dedupe: skip members who already received a quota warning this period
      // (using the shortest period among the failed quotas as the window).
      const periodOrder: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };
      const rows: any[] = [];
      for (const { member, entries } of missList) {
        const shortest = entries
          .map((e) => e.q.period)
          .sort((a, b) => (periodOrder[a] || 7) - (periodOrder[b] || 7))[0];
        const sinceDedupe = periodSince(shortest);
        const { data: existing } = await supabase
          .from("member_logs")
          .select("id")
          .eq("workspace_id", ws.id)
          .eq("member_id", member.id)
          .eq("log_type", "warning")
          .eq("author_name", "Quota Check")
          .gte("created_at", sinceDedupe)
          .limit(1);
        if (existing && existing.length) continue;
        rows.push({
          workspace_id: ws.id,
          member_id: member.id,
          author_id: (member.user_id ?? (ws as any).owner_id) as string,
          author_name: "Quota Check",
          log_type: "warning",
          content: "Missed quota: " + entries.map((e) => `${e.q.title} (${e.current}/${e.q.target_value})`).join(", "),
        });
      }
      if (rows.length) {
        const { error } = await supabase.from("member_logs").insert(rows);
        if (!error) warned = rows.length;
      }
    } else if (mode === "webhook") {
      const lines = missList.map(({ member, entries }) =>
        `• **${member.roblox_username}** — ${entries.map((e) => `${e.q.title} (${e.current}/${e.q.target_value})`).join(", ")}`,
      );
      const embed = {
        title: `⚠️ Quota Report — ${ws.name}`,
        description: lines.join("\n").slice(0, 4000),
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

    summary.push({ workspace: ws.name, mode, missed: missList.length, warned });
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
