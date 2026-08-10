import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
};

// IATA / ICAO -> city name resolution so boards can show "Munich" instead of "MUC".
const AIRPORTS: Record<string, string> = {
  MUC: "Munich", FRA: "Frankfurt", BER: "Berlin", HAM: "Hamburg", DUS: "Dusseldorf", CGN: "Cologne", STR: "Stuttgart",
  LHR: "London", LGW: "London Gatwick", STN: "London Stansted", LTN: "London Luton", LCY: "London City",
  MAN: "Manchester", BHX: "Birmingham", EDI: "Edinburgh", GLA: "Glasgow", BRS: "Bristol", NCL: "Newcastle",
  LPL: "Liverpool", LBA: "Leeds Bradford", BOH: "Bournemouth", EMA: "East Midlands", SOU: "Southampton",
  BFS: "Belfast", DUB: "Dublin", ORK: "Cork", SNN: "Shannon",
  CDG: "Paris", ORY: "Paris Orly", NCE: "Nice", LYS: "Lyon", MRS: "Marseille", TLS: "Toulouse", BOD: "Bordeaux",
  AMS: "Amsterdam", EIN: "Eindhoven", RTM: "Rotterdam", BRU: "Brussels", CRL: "Charleroi", LUX: "Luxembourg",
  MAD: "Madrid", BCN: "Barcelona", AGP: "Malaga", PMI: "Palma", ALC: "Alicante", VLC: "Valencia", SVQ: "Seville",
  IBZ: "Ibiza", TFS: "Tenerife", LPA: "Gran Canaria", ACE: "Lanzarote", FUE: "Fuerteventura",
  LIS: "Lisbon", OPO: "Porto", FAO: "Faro", FNC: "Funchal",
  FCO: "Rome", CIA: "Rome Ciampino", MXP: "Milan", LIN: "Milan Linate", BGY: "Bergamo", VCE: "Venice", NAP: "Naples",
  BLQ: "Bologna", PSA: "Pisa", CTA: "Catania", PMO: "Palermo", CAG: "Cagliari",
  ZRH: "Zurich", GVA: "Geneva", BSL: "Basel", VIE: "Vienna", SZG: "Salzburg", INN: "Innsbruck",
  CPH: "Copenhagen", BLL: "Billund", OSL: "Oslo", TRF: "Sandefjord", BGO: "Bergen", TRD: "Trondheim", SVG: "Stavanger",
  ARN: "Stockholm", NYO: "Stockholm Skavsta", GOT: "Gothenburg", HEL: "Helsinki", KEF: "Reykjavik",
  WAW: "Warsaw", KRK: "Krakow", GDN: "Gdansk", WRO: "Wroclaw", PRG: "Prague", BUD: "Budapest", OTP: "Bucharest",
  SOF: "Sofia", ZAG: "Zagreb", SPU: "Split", DBV: "Dubrovnik", LJU: "Ljubljana", BEG: "Belgrade", TIA: "Tirana",
  ATH: "Athens", SKG: "Thessaloniki", HER: "Heraklion", RHO: "Rhodes", CFU: "Corfu", JMK: "Mykonos", JTR: "Santorini",
  IST: "Istanbul", SAW: "Istanbul Sabiha", AYT: "Antalya", ESB: "Ankara", ADB: "Izmir",
  SVO: "Moscow", DME: "Moscow Domodedovo", LED: "Saint Petersburg", KBP: "Kyiv", RIX: "Riga", TLL: "Tallinn", VNO: "Vilnius",
  JFK: "New York", EWR: "Newark", LGA: "New York LaGuardia", BOS: "Boston", PHL: "Philadelphia", IAD: "Washington",
  DCA: "Washington National", BWI: "Baltimore", ATL: "Atlanta", MIA: "Miami", MCO: "Orlando", FLL: "Fort Lauderdale",
  TPA: "Tampa", CLT: "Charlotte", ORD: "Chicago", MDW: "Chicago Midway", DTW: "Detroit", MSP: "Minneapolis",
  DFW: "Dallas", IAH: "Houston", AUS: "Austin", DEN: "Denver", PHX: "Phoenix", LAS: "Las Vegas", SLC: "Salt Lake City",
  LAX: "Los Angeles", SFO: "San Francisco", SAN: "San Diego", SEA: "Seattle", PDX: "Portland", HNL: "Honolulu",
  YYZ: "Toronto", YUL: "Montreal", YVR: "Vancouver", YYC: "Calgary", YOW: "Ottawa", YEG: "Edmonton",
  MEX: "Mexico City", CUN: "Cancun", GRU: "Sao Paulo", GIG: "Rio de Janeiro", EZE: "Buenos Aires", SCL: "Santiago",
  BOG: "Bogota", LIM: "Lima", PTY: "Panama City",
  DXB: "Dubai", DWC: "Dubai World Central", AUH: "Abu Dhabi", DOH: "Doha", RUH: "Riyadh", JED: "Jeddah",
  KWI: "Kuwait City", BAH: "Bahrain", MCT: "Muscat", TLV: "Tel Aviv", AMM: "Amman", CAI: "Cairo", HRG: "Hurghada",
  SSH: "Sharm El Sheikh", RAK: "Marrakesh", CMN: "Casablanca", TUN: "Tunis", JNB: "Johannesburg", CPT: "Cape Town",
  NBO: "Nairobi", LOS: "Lagos", ADD: "Addis Ababa",
  DEL: "Delhi", BOM: "Mumbai", BLR: "Bengaluru", MAA: "Chennai", HYD: "Hyderabad", CCU: "Kolkata", CMB: "Colombo",
  MLE: "Male", KTM: "Kathmandu", ISB: "Islamabad", KHI: "Karachi", DAC: "Dhaka",
  BKK: "Bangkok", DMK: "Bangkok Don Mueang", HKT: "Phuket", SIN: "Singapore", KUL: "Kuala Lumpur", CGK: "Jakarta",
  DPS: "Bali", MNL: "Manila", HAN: "Hanoi", SGN: "Ho Chi Minh City", PNH: "Phnom Penh",
  HKG: "Hong Kong", TPE: "Taipei", ICN: "Seoul", GMP: "Seoul Gimpo", NRT: "Tokyo", HND: "Tokyo Haneda",
  KIX: "Osaka", CTS: "Sapporo", FUK: "Fukuoka", PEK: "Beijing", PKX: "Beijing Daxing", PVG: "Shanghai",
  SHA: "Shanghai Hongqiao", CAN: "Guangzhou", SZX: "Shenzhen", CTU: "Chengdu",
  SYD: "Sydney", MEL: "Melbourne", BNE: "Brisbane", PER: "Perth", ADL: "Adelaide", OOL: "Gold Coast",
  AKL: "Auckland", CHC: "Christchurch", WLG: "Wellington", NAN: "Nadi",
  // Common ICAO aliases
  EGLL: "London", EGKK: "London Gatwick", EGCC: "Manchester", EDDM: "Munich", EDDF: "Frankfurt",
  LFPG: "Paris", EHAM: "Amsterdam", LEMD: "Madrid", LEBL: "Barcelona", LIRF: "Rome", LSZH: "Zurich",
  EKCH: "Copenhagen", ENGM: "Oslo", ESSA: "Stockholm", EFHK: "Helsinki", KJFK: "New York", KLAX: "Los Angeles",
  OMDB: "Dubai", WSSS: "Singapore", RJTT: "Tokyo Haneda", YSSY: "Sydney",
};

function resolveAirport(code: string | null): string | null {
  if (!code) return null;
  const raw = String(code).trim();
  if (!raw) return null;
  const key = raw.toUpperCase();
  if (AIRPORTS[key]) return AIRPORTS[key];
  // Already a place name (contains a space or lowercase letters) — keep as typed
  if (!/^[A-Z]{3,4}$/.test(key)) return raw;
  return raw;
}


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

    const { data: wsId } = await supabase.rpc("internal_workspace_id_by_api_key", { _api_key: apiKey });
    if (!wsId) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id, name, game_url")
      .eq("id", wsId as string)
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
      .select("id, title, category, scheduled_at, duration_minutes, host_name, host_id, co_host_name, trainer_name, status, recurring, recurring_days, recurring_time, description, game_url, role_labels, slots, tag_ids, occurrence_assignments, route_number, aircraft_model, tail_number, origin, destination")
      .eq("workspace_id", workspace.id)
      .in("status", ["scheduled", "started"])
      .order("scheduled_at", { ascending: true });

    // Fetch all tags for this workspace once
    const { data: allTags } = await supabase
      .from("session_tags")
      .select("id, name, color, category")
      .eq("workspace_id", workspace.id);
    const tagsById = new Map((allTags || []).map((t: any) => [t.id, t]));

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
        // Weekly recurrence — does today match? Accept both short ("Mon") and full ("monday") forms.
        const todayShort = todayName.slice(0, 3); // "mon", "tue", ...
        const days = (s.recurring_days as string[]).map((d) => d.toLowerCase().slice(0, 3));
        if (days.includes(todayShort)) {
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

        const sessionSlots = Array.isArray((s as any).slots) ? (s as any).slots : [];
        const occurrenceAssignments = (s as any).occurrence_assignments?.[occ.toISOString()];
        const effectiveSlotAssignments = Array.isArray(occurrenceAssignments)
          ? sessionSlots.map((sl: any, idx: number) => ({ ...sl, assigned: occurrenceAssignments[idx] || [] }))
          : sessionSlots;
        const firstAssignedName = effectiveSlotAssignments.flatMap((sl: any) => sl.assigned || []).find((n: any) => n);
        const hostName = firstAssignedName || (s.host_name && s.host_name !== "Unassigned" ? s.host_name : null);

        // Resolve host roblox id. Prefer explicit slot assignment; only use creator id when a host name is actually set.
        let host: OutSession["host"] = null;
        if (s.host_id && hostName) {
          const { data: vu } = await supabase
            .from("verified_users")
            .select("roblox_user_id, roblox_username")
            .eq("user_id", s.host_id)
            .maybeSingle();
          if (vu?.roblox_user_id) {
            host = { userId: Number(vu.roblox_user_id), username: hostName };
          }
        }
        if (!host && hostName) {
          // Try lookup by username via Roblox
          try {
            const r = await fetch("https://users.roblox.com/v1/usernames/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usernames: [hostName], excludeBannedUsers: false }),
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

        // Resolve all slot assignees -> Roblox userIds (best effort, batched per session)
        const allNames = effectiveSlotAssignments.flatMap((sl: any) => (sl.assigned || []).filter((n: any) => n));
        const nameToId = new Map<string, { id: number; name: string }>();
        if (allNames.length > 0) {
          try {
            const r = await fetch("https://users.roblox.com/v1/usernames/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usernames: allNames, excludeBannedUsers: false }),
            });
            const j = await r.json();
            for (const u of (j.data || [])) {
              if (u?.id) nameToId.set(String(u.requestedUsername || u.name).toLowerCase(), { id: u.id, name: u.name });
            }
          } catch (_) { /* ignore */ }
        }
        const resolvedSlots = effectiveSlotAssignments.map((sl: any) => ({
          label: sl.label,
          count: sl.count,
          assigned: (sl.assigned || []).map((n: any) => {
            if (!n) return null;
            const found = nameToId.get(String(n).toLowerCase());
            return found ? { userId: found.id, username: found.name } : { userId: 0, username: n };
          }),
        }));

        // Resolve tags
        const tagIds: string[] = (s as any).tag_ids || [];
        const resolvedTags = tagIds.map((id) => tagsById.get(id)).filter(Boolean);

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
          route_number: (s as any).route_number || null,
          aircraft_model: (s as any).aircraft_model || null,
          tail_number: (s as any).tail_number || null,
          origin: (s as any).origin || null,
          destination: (s as any).destination || null,
          origin_name: resolveAirport((s as any).origin),
          destination_name: resolveAirport((s as any).destination),
          role_labels: (s as any).role_labels || null,

          game_url: (s as any).game_url || workspace.game_url || null,
          slots: resolvedSlots,
          tags: resolvedTags,
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
