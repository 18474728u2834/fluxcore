import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, workspace_id } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "Missing workspace_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workspace with discord_webhook_url
    const { data: ws } = await supabase
      .from("workspaces")
      .select("discord_webhook_url")
      .eq("id", workspace_id)
      .single();

    if (!ws?.discord_webhook_url) {
      return new Response(JSON.stringify({ error: "Discord webhook not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send session reminder
    if (action === "send_reminder") {
      const { session_title, session_time, host_name, category } = body;

      const embed = {
        embeds: [{
          title: `📋 ${category || "Shift"} Starting Soon`,
          description: `**${session_title}** starts in 5 minutes!`,
          color: category === "Training" ? 0xf59e0b : category === "Event" ? 0x8b5cf6 : 0x22c55e,
          fields: [
            { name: "Time", value: new Date(session_time).toLocaleString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" }), inline: true },
            { name: "Host", value: host_name || "TBA", inline: true },
            { name: "Category", value: category || "Shift", inline: true },
          ],
          footer: { text: "Fluxcore Session Reminder" },
          timestamp: new Date().toISOString(),
        }],
      };

      const res = await fetch(ws.discord_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(embed),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Discord webhook failed:", errText);
        return new Response(JSON.stringify({ error: "Discord webhook failed", details: errText }), {
          status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test webhook
    if (action === "test") {
      const embed = {
        embeds: [{
          title: "✅ Fluxcore Connected",
          description: "Your Discord webhook is working! Session reminders will be sent here.",
          color: 0x7c3aed,
          footer: { text: "Fluxcore" },
          timestamp: new Date().toISOString(),
        }],
      };

      const res = await fetch(ws.discord_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(embed),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: "Test failed", details: errText }), {
          status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Test message sent!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
