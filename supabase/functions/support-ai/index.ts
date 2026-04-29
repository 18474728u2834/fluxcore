import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { ticket_id, message, user_id } = await req.json();

    if (!ticket_id || !message) {
      return new Response(JSON.stringify({ error: "Missing ticket_id or message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ticket context
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("subject, message, status")
      .eq("id", ticket_id)
      .single();

    // Fetch previous messages for context
    const { data: prevMessages } = await supabase
      .from("support_messages")
      .select("content, roblox_username")
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: true })
      .limit(10);

    const context = (prevMessages || []).map(m => `${m.roblox_username}: ${m.content}`).join("\n");

    // Check if user is asking for staff help
    const needsStaff = /staff|human|agent|novavoff|real person|escalat/i.test(message);

    if (needsStaff) {
      // Actually mark the ticket as escalated and assign to Novavoff
      await supabase
        .from("support_tickets")
        .update({ status: "escalated", assigned_to: "Novavoff", updated_at: new Date().toISOString() })
        .eq("id", ticket_id);

      return new Response(JSON.stringify({
        success: true,
        ai_response: "✅ Your ticket has been escalated to Novavoff (Fluxcore staff). They'll review it shortly. Add any extra details below to help them resolve it faster.",
        escalated: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to generate response
    if (!lovableApiKey) {
      return new Response(JSON.stringify({
        success: true,
        ai_response: "Thanks for your message! Our support team will review this shortly. If you need immediate help, type 'staff' to connect with a team member.",
        escalated: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are Fluxcore's AI support assistant. You help users with questions about the Fluxcore platform — a Roblox group management tool with features like activity tracking, shift scheduling, role management, Roblox group ranking, documents/policies, and Discord integration.

Be helpful, concise, and friendly. If you can't answer something or the user needs a human, suggest they type "staff" to escalate to the team (Novavoff).

Ticket subject: ${ticket?.subject || "N/A"}
Original message: ${ticket?.message || "N/A"}
Previous conversation:
${context}`,
          },
          { role: "user", content: message },
        ],
      }),
    });

    if (!aiResponse.ok) {
      return new Response(JSON.stringify({
        success: true,
        ai_response: "Thanks for reaching out! Our team will review your ticket soon. Type 'staff' to speak with a team member directly.",
        escalated: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "I'm here to help! Could you provide more details about your issue?";

    return new Response(JSON.stringify({
      success: true,
      ai_response: reply,
      escalated: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Support AI error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
