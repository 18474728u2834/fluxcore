// Generates a Roblox ModuleScript + Handler Script for an in-game session BOARD
// (SurfaceGui that displays the next/current Fluxcore sessions live).
// Accepts a description, structured fields, board behavior config, and optional
// reference screenshots of the board template.

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

interface BoardConfig {
  count?: number;
  name?: string;
  behavior?: "single" | "multiple_per_part" | "multiple_per_model";
  refresh_seconds?: number;
  show_upcoming?: number;
  empty_state?: "hide" | "no_session_text" | "show_next_anyway";
  empty_text?: string;
  click_action?: "none" | "teleport" | "open_gui" | "copy_link";
  teleport_place_id?: string;
  open_gui_name?: string;
  highlight_live?: boolean;
  live_color?: string;
  countdown?: boolean;
}

interface Payload {
  session_name: string;
  description: string;
  fields: Field[];
  game_link?: string;
  notes?: string;
  images?: string[];
  board?: BoardConfig;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require a valid Supabase JWT to prevent unauthenticated AI credit drain
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: claims, error: claimsErr } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const board = body.board || {};
    const fieldList = body.fields
      .map(f => `- ${f.label} (TextLabel name: "${f.key}")${f.example ? ` — example: "${f.example}"` : ""}`)
      .join("\n");

    const boardSpec = `
BOARD CONFIG (the user answered these questions about their setup — generate code that matches exactly):
- Number of boards in the game: ${board.count ?? 1}
- Board Part / Model name to look for in workspace: "${board.name || "SessionBoard"}"
- When there are multiple boards: ${board.behavior === "multiple_per_model"
        ? "EACH board shows a DIFFERENT upcoming session — board #1 = next, #2 = the one after, etc. Find all parts/models with this name (or numbered SessionBoard1/SessionBoard2...) and assign one upcoming session per board, in order."
        : "ALL boards show the SAME next session (mirrored across every matching part/model)."}
- Refresh interval: ${board.refresh_seconds ?? 30} seconds
- Fetch this many upcoming sessions from the API: ${board.show_upcoming ?? 1}
- When NO session is scheduled: ${
        board.empty_state === "hide"
          ? `set SurfaceGui.Enabled = false on every board`
          : board.empty_state === "show_next_anyway"
            ? `always show the next upcoming session, even if it's far in the future`
            : `set every TextLabel.Text to "${board.empty_text || "No session scheduled"}" and keep SurfaceGui visible`
      }
- Highlight live sessions: ${board.highlight_live
        ? `YES — if a session has already started (date <= now), find a TextLabel named "Status" inside the SurfaceGui (or update every TextLabel TextColor3) and set its color to ${board.live_color || "#22c55e"} and its text to "LIVE NOW"`
        : "no"}
- Countdown: ${board.countdown
        ? `YES — update a TextLabel named "Countdown" every second with a formatted "Starts in MM:SS" / "Starts in HH:MM:SS" string until the session begins, then switch to "LIVE NOW" once it starts`
        : "no countdown"}
- Click action: ${
        board.click_action === "teleport"
          ? `Add a ClickDetector to every board part (or to the PrimaryPart if it's a Model). When clicked, use TeleportService:Teleport(${board.teleport_place_id || "PLACE_ID_NOT_SET"}, player). Use pcall and check the placeId is set.`
          : board.click_action === "open_gui"
            ? `Add a ClickDetector. When clicked, clone game.StarterGui:FindFirstChild("${board.open_gui_name || "SessionInfoGui"}") into the player's PlayerGui (or just set Enabled = true if already there).`
            : board.click_action === "copy_link"
              ? `Add a ClickDetector. Create a RemoteEvent named "SessionBoardClicked" in ReplicatedStorage if missing, and FireClient(player, sessionData) so the client can show the game link.`
              : "none — display-only board"
      }
`.trim();

    const system = `You are a senior Roblox Lua developer. You generate clean, production-ready code for an in-game SESSION BOARD that lives on a Part or Model in workspace with a SurfaceGui containing TextLabels. The board displays live data from the Fluxcore Sessions API.

You MUST follow the BOARD CONFIG verbatim — if the user said "3 boards each showing a different session", the handler MUST find 3 boards (named e.g. SessionBoard, SessionBoard2, SessionBoard3 — or all parts/models named SessionBoard) and assign sessions[1], sessions[2], sessions[3] to them in order. If the user said "click teleports", you MUST add a ClickDetector and TeleportService logic. Do not output generic stubs.

Return STRICT JSON in this exact shape (no markdown fences):
{
  "module_script": "<full Lua code for a ModuleScript>",
  "handler_script": "<full Lua code for a Script>",
  "instructions": "<short markdown setup instructions for the user — include Studio HTTP enablement, where to place each script, what to name the API_KEY, and a checklist of TextLabel names the board needs>"
}

MODULESCRIPT REQUIREMENTS (place in ReplicatedStorage as "SessionBoardConfig"):
- Exports a table with: API_KEY (placeholder "YOUR_WORKSPACE_API_KEY"), ENDPOINT ("https://fluxcore.works/api/v1/sessions?today=true&limit=" .. UPCOMING), BOARD_NAME, REFRESH (seconds), BOARD_COUNT, BEHAVIOR ("mirror" or "per_board"), UPCOMING (number), EMPTY_STATE ("hide" / "text" / "show_next"), EMPTY_TEXT, HIGHLIGHT_LIVE (bool), LIVE_COLOR (Color3), COUNTDOWN (bool), CLICK_ACTION (string), TELEPORT_PLACE_ID, OPEN_GUI_NAME, TEMPLATE (table mapping each user field key → TextLabel name inside SurfaceGui).
- Exports format(session) returning a table { [fieldKey] = displayString } resolved from the API session object (host -> session.host.username, time -> formatted date in EST or user-specified tz, link -> session.game_url, name -> session.name, description -> session.description, slots -> session.slots, tags -> table.concat(session.tags or {}, ", ")) with safe "TBA" fallbacks.
- Exports formatCountdown(targetISO) returning the live countdown string.

HANDLER SCRIPT REQUIREMENTS (place in ServerScriptService):
- require the ModuleScript from ReplicatedStorage.
- Use HttpService:RequestAsync (NOT GetAsync) with method = "GET", url = ENDPOINT, headers = { ["x-api-key"] = cfg.API_KEY, Authorization = "Bearer " .. cfg.API_KEY }. Parse JSON body with HttpService:JSONDecode. Use pcall around the whole network call.
- The Fluxcore Sessions API response shape is { workspace = {...}, sessions = { { id, name, date (ISO string), host = { username, user_id }, game_url, description, slots, tags = {...} }, ... } }. Sort sessions by date ascending and filter out ones already ended (>2h old).
- Locate boards: scan workspace recursively for Parts or Models whose Name == cfg.BOARD_NAME (and BOARD_NAME .. tostring(i) for i=2..count). Gather them into a list.
- Update loop: every cfg.REFRESH seconds, fetch sessions, for each board update every TextLabel inside its SurfaceGui according to cfg.TEMPLATE and the session assigned to it (mirror vs per_board logic per BEHAVIOR). Apply empty_state logic when no sessions.
- If COUNTDOWN: spawn a coroutine that updates the "Countdown" TextLabel every 1 second using formatCountdown.
- If HIGHLIGHT_LIVE: when a session is currently live (started <= now and not ended), set "Status" TextLabel text/color (or fall back to tinting all labels).
- If CLICK_ACTION is teleport/open_gui/copy_link: attach a ClickDetector + handler.
- Wrap every external call in pcall. warn() on failures so server logs are useful. NEVER let the loop die on error.
- The instructions must explicitly mention enabling HttpService.HttpEnabled in Game Settings, replacing the API key, and the exact required TextLabel names from cfg.TEMPLATE.

ABSOLUTE RULES:
- This is NOT a Discord webhook script. Do not import HttpService for webhook posts.
- Do not output stub functions like "-- TODO: implement". Write the FULL implementation per the config.
- Code must be copy-paste runnable.`;

    const userText = `Session board name: ${body.session_name}
Description: ${body.description || "(none)"}
Default game link: ${body.game_link || "(none)"}
Extra notes from user: ${body.notes || "(none)"}

TextLabels the board displays (each "name" should match a TextLabel inside the SurfaceGui):
${fieldList}

${boardSpec}

${body.images?.length ? "Reference screenshots of the board / SurfaceGui are attached. Use them to confirm exact TextLabel names and respect the visual layout." : ""}`;

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
