import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const categoryColor = (category: string) =>
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, workspace_id } = body ?? {};

    if (!workspace_id) return json({ error: "Missing workspace_id" }, 400);

    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .select("name, discord_webhook_url, game_url")
      .eq("id", workspace_id)
      .maybeSingle();

    if (wsErr) {
      console.error("workspaces lookup failed:", wsErr);
      return json({ error: "Workspace lookup failed" }, 500);
    }
    if (!ws) return json({ error: "Workspace not found" }, 404);
    if (!ws.discord_webhook_url) {
      return json({ error: "Discord webhook not configured" }, 400);
    }

    const sendEmbed = async (embeds: unknown[]) => {
      const res = await fetch(ws.discord_webhook_url!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Discord webhook failed:", res.status, errText);
        return { ok: false, status: res.status, error: errText };
      }
      return { ok: true };
    };

    // Session reminder (5 min before)
    if (action === "send_reminder") {
      const { session_title, session_time, host_name, category } = body;

      const fields: any[] = [
        { name: "🕐 Time", value: formatTime(session_time), inline: true },
        { name: "👤 Host", value: host_name || "TBA", inline: true },
        { name: "📂 Type", value: category || "Shift", inline: true },
      ];
      if (ws.game_url) fields.push({ name: "🎮 Game", value: `[Click to join](${ws.game_url})`, inline: false });

      const result = await sendEmbed([{
        title: `⏰ ${category || "Shift"} Starting Soon`,
        description: `**${session_title}** starts in 5 minutes!`,
        color: categoryColor(category),
        fields,
        footer: { text: `${ws.name} · Fluxcore` },
        timestamp: new Date().toISOString(),
      }]);

      if (!result.ok) return json({ error: "Discord webhook failed", details: result.error }, 502);
      return json({ success: true });
    }

    // Session created announcement
    if (action === "session_created") {
      const { session_title, session_time, host_name, category, recurring, recurring_days, recurring_time, description } = body;

      const fields: any[] = [];
      if (recurring_days && recurring_days.length) {
        fields.push({
          name: "🔁 Repeats",
          value: `${recurring_days.join(", ")} at ${recurring_time || "scheduled time"}`,
          inline: false,
        });
      } else if (recurring && recurring !== "none") {
        fields.push({ name: "🔁 Repeats", value: recurring, inline: true });
      } else {
        fields.push({ name: "🕐 When", value: formatTime(session_time), inline: false });
      }
      fields.push({ name: "👤 Host", value: host_name || "TBA", inline: true });
      fields.push({ name: "📂 Type", value: category || "Shift", inline: true });
      if (ws.game_url) fields.push({ name: "🎮 Game", value: `[Click to join](${ws.game_url})`, inline: false });

      const result = await sendEmbed([{
        title: `📅 New ${category || "Session"} Scheduled`,
        description: `**${session_title}**${description ? `\n\n${description}` : ""}`,
        color: categoryColor(category),
        fields,
        footer: { text: `${ws.name} · Fluxcore` },
        timestamp: new Date().toISOString(),
      }]);

      if (!result.ok) return json({ error: "Discord webhook failed", details: result.error }, 502);
      return json({ success: true });
    }

    // Test webhook
    if (action === "test") {
      const result = await sendEmbed([{
        title: "✅ Fluxcore Connected",
        description: "Your Discord webhook is working! Session reminders and announcements will be sent here.",
        color: 0x06b6d4,
        footer: { text: `${ws.name} · Fluxcore` },
        timestamp: new Date().toISOString(),
      }]);
      if (!result.ok) return json({ error: "Test failed", details: result.error }, 502);
      return json({ success: true, message: "Test message sent!" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("discord-notify error:", err);
    return json({ error: "Internal server error", details: String(err) }, 500);
  }
});
