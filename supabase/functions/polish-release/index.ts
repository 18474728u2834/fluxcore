import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) return json({ error: "AI is not configured" }, 500);

    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const jwt = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(jwt);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    // Staff check: owner admins, or admins with manage_status
    const { data: admin } = await supabase
      .from("staff_admins")
      .select("id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!admin) return json({ error: "Forbidden" }, 403);
    if (admin.role !== "owner_admin") {
      const { data: perm } = await supabase
        .from("staff_permissions")
        .select("permission")
        .eq("admin_id", admin.id)
        .eq("permission", "manage_status")
        .maybeSingle();
      if (!perm) return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const version = typeof body?.version === "string" ? body.version.slice(0, 20) : "";
    const rawItems = Array.isArray(body?.items) ? body.items.slice(0, 20) : [];
    const items = rawItems
      .map((i: any) => ({
        title: String(i?.title ?? "").slice(0, 120),
        desc: String(i?.desc ?? "").slice(0, 600),
      }))
      .filter((i: any) => i.title || i.desc);
    if (!items.length) return json({ error: "Add at least one label first" }, 400);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a release-notes editor for Fluxcore, a Roblox staff management platform. " +
              "Fix grammar, spelling and punctuation, and make the copy clear, human and concise. " +
              "Keep the author's meaning and facts exactly — never invent features. " +
              "Titles: max 5 words, Title Case-ish, no trailing period. Descriptions: 1-2 short sentences. " +
              "No emojis, no marketing fluff. Reply with JSON only: " +
              '{"items":[{"title":"...","desc":"..."}]} in the same order and count as the input.',
          },
          {
            role: "user",
            content: `Release ${version || "(unversioned)"}\n\n${JSON.stringify(items, null, 2)}`,
          },
        ],
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limit hit, try again in a moment" }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!aiRes.ok) return json({ error: `AI error: ${await aiRes.text()}` }, 502);

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: "AI returned an unreadable response" }, 502);

    let parsed: any;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return json({ error: "AI returned invalid JSON" }, 502);
    }
    const out = Array.isArray(parsed?.items) ? parsed.items : [];
    const cleaned = items.map((orig: any, idx: number) => ({
      title: String(out[idx]?.title ?? orig.title).slice(0, 120),
      desc: String(out[idx]?.desc ?? orig.desc).slice(0, 600),
    }));

    return json({ items: cleaned });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
