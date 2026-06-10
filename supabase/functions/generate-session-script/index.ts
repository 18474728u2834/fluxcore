// Generates a Roblox ModuleScript + Handler Script for a session template
// using Lovable AI (Gemini multimodal). Accepts a description, structured
// fields, and optional reference screenshots of the user's session template.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Field {
  key: string;
  label: string;
  example?: string;
}

interface Payload {
  session_name: string;
  description: string;
  fields: Field[];        // e.g. [{key:"host",label:"Host"},{key:"time",label:"Time"},{key:"link",label:"Game Link"}]
  game_link?: string;
  ping_role_id?: string;  // optional discord role to ping
  notes?: string;
  images?: string[];      // data URLs
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as Payload;
    if (!body?.session_name || !Array.isArray(body.fields)) {
      return new Response(JSON.stringify({ error: "Missing session_name or fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fieldList = body.fields
      .map(f => `- ${f.label} (key: ${f.key})${f.example ? ` — example: "${f.example}"` : ""}`)
      .join("\n");

    const system = `You are a senior Roblox Lua developer. You generate clean, production-ready code for a SESSION ANNOUNCEMENT system using the Fluxcore Sessions API.

You must return STRICT JSON in this exact shape (no markdown fences):
{
  "module_script": "<full Lua code for a ModuleScript>",
  "handler_script": "<full Lua code for a Script>",
  "instructions": "<short markdown setup instructions for the user>"
}

The module script defines a SessionTemplate table with the user's fields. The handler script (placed in ServerScriptService) polls the Fluxcore Sessions API every 60s, formats the current session using the module's template, and posts it to a Discord webhook (uses HttpService).

Always use HttpService:RequestAsync. Use rich Discord embeds. Resolve placeholders like {host}, {time}, {link} from session data. Be defensive (pcall, missing-field fallbacks). Code must be copy-paste runnable.`;

    const userText = `Session name: ${body.session_name}
Description: ${body.description || "(none)"}
Game link: ${body.game_link || "(none)"}
Discord role to ping: ${body.ping_role_id || "(none)"}
Extra notes: ${body.notes || "(none)"}

Fields to include in the template (these become placeholders in the embed):
${fieldList}

${body.images?.length ? "Reference screenshots of the desired session announcement template are attached. Match the layout/wording style as closely as possible." : ""}`;

    const content: any[] = [{ type: "text", text: userText }];
    for (const img of (body.images || []).slice(0, 4)) {
      content.push({ type: "image_url", image_url: { url: img } });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI error: " + t }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Strip code fences if present
      const stripped = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(stripped);
    }

    return new Response(JSON.stringify({
      module_script: parsed.module_script || "",
      handler_script: parsed.handler_script || "",
      instructions: parsed.instructions || "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
