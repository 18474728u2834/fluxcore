import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { data: admin } = await supabase
      .from("staff_admins")
      .select("id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!admin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").slice(0, 1200).trim();
    const kind = String(body?.kind ?? "body").slice(0, 40);
    if (!text) return json({ error: "Nothing to polish" }, 400);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a copy editor for a software product website. Fix grammar, spelling and flow. Keep the same meaning, language and tone. Keep it concise: a heading stays a heading, a short label stays short. Never add quotes, markdown, emojis or commentary. Reply with the corrected text only.",
          },
          { role: "user", content: `Field type: ${kind}\n\n${text}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "AI rate limit reached, try again shortly" }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted" }, 402);
      return json({ error: "AI request failed" }, 500);
    }

    const data = await aiRes.json();
    const out = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!out) return json({ error: "AI returned nothing" }, 500);

    return json({ text: out });
  } catch (e) {
    return json({ error: (e as Error).message || "Unexpected error" }, 500);
  }
});
