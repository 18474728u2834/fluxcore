// Translates UI strings via Lovable AI Gateway.
// Stateless: client caches results in localStorage per-language.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  es: "Spanish", fr: "French", de: "German", "pt-BR": "Brazilian Portuguese",
  pt: "Portuguese", zh: "Simplified Chinese", "zh-TW": "Traditional Chinese",
  ja: "Japanese", ko: "Korean", ru: "Russian", tr: "Turkish", ar: "Arabic",
  no: "Norwegian", sv: "Swedish", da: "Danish", nl: "Dutch", it: "Italian",
  pl: "Polish", fi: "Finnish", uk: "Ukrainian", cs: "Czech", el: "Greek",
  he: "Hebrew", hi: "Hindi", id: "Indonesian", th: "Thai", vi: "Vietnamese",
  ro: "Romanian", hu: "Hungarian",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { strings, lang } = await req.json();
    if (!Array.isArray(strings) || !lang || lang === "en") {
      return new Response(JSON.stringify({ translations: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langName = LANG_NAMES[lang] || lang;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // Build numbered list — keep source order, ask for JSON map back
    const numbered = strings.map((s: string, i: number) => `${i}: ${s}`).join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a UI translator. Translate the given English UI strings into ${langName}.
RULES:
- Preserve placeholders like {name}, {{var}}, %s, and HTML tags exactly.
- Keep brand names (Fluxcore, Roblox, Discord, Premium) untranslated.
- Keep length similar — these go in buttons/labels.
- Return ONLY a valid JSON object: {"0": "translation", "1": "translation", ...}
- No markdown, no explanation.`,
          },
          { role: "user", content: numbered },
        ],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limit", translations: {} }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) throw new Error(`AI gateway: ${res.status}`);

    const data = await res.json();
    let content: string = data.choices?.[0]?.message?.content || "{}";
    // Strip code fences if model added them
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

    let parsed: Record<string, string> = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    // Map back to source string -> translation
    const translations: Record<string, string> = {};
    for (const [idx, val] of Object.entries(parsed)) {
      const i = parseInt(idx, 10);
      if (!Number.isNaN(i) && strings[i] && typeof val === "string") {
        translations[strings[i]] = val;
      }
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-batch error:", e);
    return new Response(JSON.stringify({ error: String(e), translations: {} }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
