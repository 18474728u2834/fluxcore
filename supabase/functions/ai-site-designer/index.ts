// AI Website Designer — turns uploaded screenshots + a written brief (and
// optionally scraped reference sites / web search results) into a full
// Fluxcore site design (theme + sections) that can be edited or published.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FC_GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

async function firecrawl(path: string, payload: unknown, lovableKey: string, fcKey: string) {
  const res = await fetch(`${FC_GATEWAY}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": fcKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as any)?.error || `Firecrawl ${res.status}`);
  return data as any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!lovableApiKey) return json({ error: "AI is not configured" }, 500);

    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const { data: admin } = await supabase
      .from("staff_admins")
      .select("id")
      .eq("user_id", claimsData.claims.sub as string)
      .maybeSingle();
    if (!admin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const brief = String(body?.brief ?? "").slice(0, 4000).trim();
    const target = body?.target === "workspace" ? "workspace" : "landing";
    const images: string[] = Array.isArray(body?.images) ? body.images.slice(0, 4) : [];
    const urls: string[] = Array.isArray(body?.urls)
      ? body.urls.filter((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u)).slice(0, 3)
      : [];
    const searchQuery = String(body?.search ?? "").slice(0, 200).trim();

    if (!brief && !images.length && !urls.length) return json({ error: "Give the AI a brief, an image or a URL" }, 400);

    // ---- Web research (optional) -------------------------------------------
    const research: string[] = [];
    const sources: string[] = [];

    if (firecrawlKey && urls.length) {
      for (const url of urls) {
        try {
          const r = await firecrawl(
            "/scrape",
            { url, formats: ["branding", "summary"], onlyMainContent: true },
            lovableApiKey,
            firecrawlKey,
          );
          const d = r?.data ?? r;
          research.push(
            `REFERENCE SITE ${url}\nBranding: ${JSON.stringify(d?.branding ?? {}).slice(0, 1500)}\nSummary: ${String(d?.summary ?? "").slice(0, 1200)}`,
          );
          sources.push(url);
        } catch (e) {
          research.push(`REFERENCE SITE ${url} could not be read: ${(e as Error).message}`);
        }
      }
    }

    if (firecrawlKey && searchQuery) {
      try {
        const r = await firecrawl("/search", { query: searchQuery, limit: 5 }, lovableApiKey, firecrawlKey);
        const items = (r?.data ?? []) as any[];
        research.push(
          "WEB SEARCH RESULTS:\n" +
            items
              .map((i) => `- ${i.title} (${i.url}): ${String(i.description ?? "").slice(0, 240)}`)
              .join("\n"),
        );
        for (const i of items) if (i?.url) sources.push(i.url);
      } catch (e) {
        research.push(`Web search failed: ${(e as Error).message}`);
      }
    }

    // ---- Generate the design ------------------------------------------------
    const system = `You are a senior product web designer building a page inside Fluxcore (a Roblox group management platform). You output a website design as STRICT JSON — no markdown fences, no commentary.

Shape:
{
  "name": "short design name",
  "ui_label": "brand name shown in the UI",
  "theme": {
    "primary": "#hex", "background": "#hex", "foreground": "#hex", "surface": "#hex",
    "radius": 4-28, "font": "outfit"|"inter"|"mono"|"serif",
    "density": "compact"|"comfortable"|"spacious", "gradient": true|false
  },
  "sections": [ { "type": "...", ...fields } ]
}

Allowed section types and their fields:
- hero: eyebrow, title, subtitle, ctaLabel, ctaHref, secondaryLabel, secondaryHref, align ("left"|"center")
- features: title, subtitle, items[{title,desc}] (3-6 items)
- stats: title, items[{title,desc}] (3-4 items, title is the number)
- text: title, body, align
- cta: title, subtitle, ctaLabel, ctaHref
- faq: title, items[{title,desc}] (3-6)
- logos: title, items[{title,desc:""}]
- image: title, imageUrl

Rules:
- Always start with a hero and end with a cta. Produce 4-7 sections total.
- Colors must be a coherent, accessible palette. Dark backgrounds need light foreground.
- Copy must be specific and human — no filler like "Lorem ipsum" or "Your text here".
- Internal links only: /login, /pricing, /creations, /feedback, /security.
- If reference sites are given, match their vibe (palette, tone, structure) without copying their text verbatim.`;

    const userText = `TARGET: ${target === "workspace" ? "workspace portal skin" : "public landing page"}

BRIEF FROM THE USER:
${brief || "(no written brief — infer everything from the attached images)"}

${research.length ? `RESEARCH:\n${research.join("\n\n")}` : "No external research was performed."}

${images.length ? "Reference/inspiration images are attached — extract the palette, layout rhythm and tone from them." : ""}`;

    const content: any[] = [{ type: "text", text: userText }];
    for (const img of images) {
      if (typeof img === "string" && (img.startsWith("data:image/") || /^https?:\/\//i.test(img))) {
        content.push({ type: "image_url", image_url: { url: img } });
      }
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return json({ error: "AI rate limit reached, try again shortly" }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted — add credits in workspace settings" }, 402);
    if (!aiRes.ok) return json({ error: "AI request failed: " + (await aiRes.text()).slice(0, 300) }, 500);

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = JSON.parse(String(raw).replace(/```json|```/g, "").trim());
    }

    return json({
      design: {
        name: parsed?.name || "AI design",
        ui_label: parsed?.ui_label || "Fluxcore",
        target,
        theme: parsed?.theme || {},
        sections: Array.isArray(parsed?.sections) ? parsed.sections : [],
      },
      sources: [...new Set(sources)],
    });
  } catch (e) {
    return json({ error: (e as Error).message || "Unexpected error" }, 500);
  }
});
