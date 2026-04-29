import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = req.headers.get("x-api-key") ||
      (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id, name, game_url")
      .eq("api_key", apiKey)
      .single();

    if (wsError || !workspace) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const category = (url.searchParams.get("category") || "all").toLowerCase();
    const onlyToday = url.searchParams.get("today") !== "false"; // default true

    // Day window in UTC
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    let query = supabase
      .from("scheduled_sessions")
      .select("id, title, category, scheduled_at, duration_minutes, host_name, host_id, co_host_name, trainer_name, status, recurring, recurring_days, recurring_time, description, game_url, role_labels")
      .eq("workspace_id", workspace.id)
      .in("status", ["scheduled", "started"])
      .order("scheduled_at", { ascending: true });

    if (category !== "all") query = query.ilike("category", category);

    const { data: rawSessions, error: sErr } = await query;
    if (sErr) throw sErr;

    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayName = dayNames[now.getUTCDay()];

    type OutSession = {
      id: string;
      name: string;
      date: string;
      duration: number;
      status: string;
      category: string;
      host: { userId: number; username: string } | null;
      participants: { userId: number; username: string; role: string }[];
      type: { category: string; gameId: number };
      description: string | null;
    };

    const out: OutSession[] = [];

    for (const s of rawSessions || []) {
      let occurrences: Date[] = [];
      const baseDate = new Date(s.scheduled_at);

      if (s.recurring_days && s.recurring_days.length && s.recurring_time) {
        // Weekly recurrence — does today match?
        const days = (s.recurring_days as string[]).map((d) => d.toLowerCase());
        if (days.includes(todayName)) {
          const [hh, mm] = (s.recurring_time as string).split(":").map((n) => parseInt(n, 10));
          const occ = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh || 0, mm || 0));
          occurrences.push(occ);
        }
      } else if (s.recurring === "weekly") {
        // Same weekday as base
        if (baseDate.getUTCDay() === now.getUTCDay()) {
          const occ = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), baseDate.getUTCHours(), baseDate.getUTCMinutes()));
          occurrences.push(occ);
        }
      } else if (s.recurring === "daily") {
        const occ = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), baseDate.getUTCHours(), baseDate.getUTCMinutes()));
        occurrences.push(occ);
      } else {
        occurrences.push(baseDate);
      }

      for (const occ of occurrences) {
        if (onlyToday && (occ < startOfDay || occ >= endOfDay)) continue;
        // Skip ended
        const endTs = occ.getTime() + (s.duration_minutes || 60) * 60_000;
        if (Date.now() > endTs) continue;

        // Resolve host roblox id
        let host: OutSession["host"] = null;
        if (s.host_id) {
          const { data: vu } = await supabase
            .from("verified_users")
            .select("roblox_user_id, roblox_username")
            .eq("user_id", s.host_id)
            .maybeSingle();
          if (vu?.roblox_user_id) {
            host = { userId: Number(vu.roblox_user_id), username: vu.roblox_username || s.host_name };
          }
        }
        if (!host && s.host_name) {
          // Try lookup by username via Roblox
          try {
            const r = await fetch("https://users.roblox.com/v1/usernames/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usernames: [s.host_name], excludeBannedUsers: false }),
            });
            const j = await r.json();
            const u = j.data?.[0];
            if (u?.id) host = { userId: u.id, username: u.name };
          } catch (_) { /* ignore */ }
        }

        const participants: OutSession["participants"] = [];
        for (const [name, role] of [[s.co_host_name, "co_host"], [s.trainer_name, "trainer"]] as const) {
          if (!name) continue;
          try {
            const r = await fetch("https://users.roblox.com/v1/usernames/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usernames: [name], excludeBannedUsers: false }),
            });
            const j = await r.json();
            const u = j.data?.[0];
            if (u?.id) participants.push({ userId: u.id, username: u.name, role });
          } catch (_) { /* ignore */ }
        }

        // gameId — prefer per-session game_url, fall back to workspace.game_url
        let gameId = 0;
        const gameSource = (s as any).game_url || workspace.game_url;
        if (gameSource) {
          const m = String(gameSource).match(/(\d{6,})/);
          if (m) gameId = parseInt(m[1], 10);
        }

        out.push({
          id: s.id,
          name: s.title,
          date: occ.toISOString(),
          duration: s.duration_minutes || 60,
          status: s.status,
          category: s.category,
          host,
          participants,
          type: { category: s.category, gameId },
          description: s.description,
          role_labels: (s as any).role_labels || null,
          game_url: (s as any).game_url || workspace.game_url || null,
        });
      }
    }

    return new Response(
      JSON.stringify({
        workspace: { id: workspace.id, name: workspace.name },
        sessions: out,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
