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
  ping_role_id?: string;  // legacy — unused for board scripts
  notes?: string;
  images?: string[];      // data URLs of the board template / SurfaceGui
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

    const system = `You are a senior Roblox Lua developer. You generate clean, production-ready code for an in-game SESSION BOARD — a physical board/SurfaceGui in a Roblox game that displays the current/next session live to players.

You must return STRICT JSON in this exact shape (no markdown fences):
{
  "module_script": "<full Lua code for a ModuleScript>",
  "handler_script": "<full Lua code for a Script>",
  "instructions": "<short markdown setup instructions for the user>"
}

REQUIREMENTS:
- ModuleScript (place in ReplicatedStorage): exports a config table with API_KEY placeholder ("YOUR_WORKSPACE_API_KEY"), API endpoint "https://fluxcore.works/api/v1/sessions?today=true", refresh interval (default 30s), and a TEMPLATE table mapping each of the user's field keys to the TextLabel name inside the SurfaceGui that should display that value. Also exports a format(session) function that returns a table { fieldKey = "display string" } resolving each field from the Fluxcore Sessions API session object (host -> session.host.username, time -> formatted session.date, link -> session.game_url, name -> session.name, description -> session.description, etc.) with safe fallbacks ("TBA" / "—").
- Handler Script (place in ServerScriptService): finds a part named "SessionBoard" (or model with a SurfaceGui) in workspace, polls the Fluxcore Sessions API via HttpService:RequestAsync every refresh interval, picks the next upcoming session, formats it via the module, and updates each TextLabel inside the SurfaceGui by name based on the TEMPLATE mapping. Show a clear "No session scheduled" state when the array is empty. Use pcall everywhere. Make HttpService.HttpEnabled requirement explicit in instructions.
- Use the actual Fluxcore Sessions API response shape (workspace, sessions[] with id, name, date ISO, host{username}, game_url, description, slots, tags).
- DO NOT generate Discord webhook code. This is for an in-game board, not Discord.
- Code must be copy-paste runnable.`;

    const userText = `Session board name: ${body.session_name}
Description: ${body.description || "(none)"}
Game link (optional default): ${body.game_link || "(none)"}
Extra notes: ${body.notes || "(none)"}

Fields the board displays — each "key" should map to a TextLabel named with the same key (or label) inside the SurfaceGui:
${fieldList}

${body.images?.length ? "Reference screenshots of the desired session board / SurfaceGui layout are attached. Match the TextLabel names and layout style." : ""}`;

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
