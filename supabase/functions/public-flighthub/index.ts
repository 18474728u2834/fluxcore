import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guard } from "../_shared/apiGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, apikey",
};

const AIRPORTS: Record<string, string> = {
  MUC: "Munich", FRA: "Frankfurt", BER: "Berlin", HAM: "Hamburg", DUS: "Dusseldorf", CGN: "Cologne", STR: "Stuttgart",
  LHR: "London", LGW: "London Gatwick", STN: "London Stansted", LTN: "London Luton", LCY: "London City",
  MAN: "Manchester", BHX: "Birmingham", EDI: "Edinburgh", GLA: "Glasgow", BRS: "Bristol", NCL: "Newcastle",
  LPL: "Liverpool", DUB: "Dublin", CDG: "Paris", ORY: "Paris Orly", NCE: "Nice", LYS: "Lyon", MRS: "Marseille",
  AMS: "Amsterdam", BRU: "Brussels", LUX: "Luxembourg", MAD: "Madrid", BCN: "Barcelona", AGP: "Malaga",
  PMI: "Palma", ALC: "Alicante", VLC: "Valencia", IBZ: "Ibiza", TFS: "Tenerife", LPA: "Gran Canaria",
  LIS: "Lisbon", OPO: "Porto", FAO: "Faro", FCO: "Rome", MXP: "Milan", BGY: "Bergamo", VCE: "Venice",
  NAP: "Naples", BLQ: "Bologna", PSA: "Pisa", CTA: "Catania", ZRH: "Zurich", GVA: "Geneva", VIE: "Vienna",
  CPH: "Copenhagen", BLL: "Billund", OSL: "Oslo", TRF: "Sandefjord", BGO: "Bergen", TRD: "Trondheim",
  SVG: "Stavanger", ARN: "Stockholm", GOT: "Gothenburg", HEL: "Helsinki", KEF: "Reykjavik", WAW: "Warsaw",
  KRK: "Krakow", GDN: "Gdansk", PRG: "Prague", BUD: "Budapest", OTP: "Bucharest", SOF: "Sofia", ZAG: "Zagreb",
  SPU: "Split", DBV: "Dubrovnik", ATH: "Athens", SKG: "Thessaloniki", HER: "Heraklion", RHO: "Rhodes",
  IST: "Istanbul", SAW: "Istanbul Sabiha", AYT: "Antalya", RIX: "Riga", TLL: "Tallinn", VNO: "Vilnius",
  JFK: "New York", EWR: "Newark", LGA: "New York LaGuardia", BOS: "Boston", IAD: "Washington", ATL: "Atlanta",
  MIA: "Miami", MCO: "Orlando", ORD: "Chicago", DFW: "Dallas", IAH: "Houston", DEN: "Denver", PHX: "Phoenix",
  LAS: "Las Vegas", LAX: "Los Angeles", SFO: "San Francisco", SAN: "San Diego", SEA: "Seattle", PDX: "Portland",
  HNL: "Honolulu", YYZ: "Toronto", YUL: "Montreal", YVR: "Vancouver", YYC: "Calgary", MEX: "Mexico City",
  CUN: "Cancun", GRU: "Sao Paulo", GIG: "Rio de Janeiro", EZE: "Buenos Aires", SCL: "Santiago", BOG: "Bogota",
  DXB: "Dubai", AUH: "Abu Dhabi", DOH: "Doha", RUH: "Riyadh", JED: "Jeddah", TLV: "Tel Aviv", CAI: "Cairo",
  RAK: "Marrakesh", CMN: "Casablanca", JNB: "Johannesburg", CPT: "Cape Town", NBO: "Nairobi", LOS: "Lagos",
  DEL: "Delhi", BOM: "Mumbai", BLR: "Bengaluru", MAA: "Chennai", CMB: "Colombo", MLE: "Male",
  BKK: "Bangkok", HKT: "Phuket", SIN: "Singapore", KUL: "Kuala Lumpur", CGK: "Jakarta", DPS: "Bali",
  MNL: "Manila", HAN: "Hanoi", SGN: "Ho Chi Minh City", HKG: "Hong Kong", TPE: "Taipei", ICN: "Seoul",
  NRT: "Tokyo", HND: "Tokyo Haneda", KIX: "Osaka", PEK: "Beijing", PVG: "Shanghai", CAN: "Guangzhou",
  SYD: "Sydney", MEL: "Melbourne", BNE: "Brisbane", PER: "Perth", AKL: "Auckland", CHC: "Christchurch",
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
  return AIRPORTS[key] || raw;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const blocked = guard(req, { name: "public-flighthub", methods: ["GET", "POST"], limit: 120, cors: corsHeaders });
  if (blocked) return blocked;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const subdomain = (url.searchParams.get("subdomain") || "").trim().toLowerCase();
    const workspaceParam = (url.searchParams.get("workspace") || "").trim();
    const days = Math.min(14, Math.max(1, parseInt(url.searchParams.get("days") || "7", 10) || 7));

    let workspaceId: string | null = null;
    let portal: any = null;

    if (workspaceParam && UUID_RE.test(workspaceParam)) {
      workspaceId = workspaceParam;
    } else if (subdomain) {
      const { data } = await supabase
        .from("partner_portals")
        .select("workspace_id, name, accent_color, logo_url, status")
        .ilike("subdomain", subdomain)
        .maybeSingle();
      if (!data || data.status === "closed") {
        return new Response(JSON.stringify({ error: "Portal not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      portal = data;
      workspaceId = data.workspace_id;
    }

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Missing subdomain or workspace" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, game_url, nexus_config, group_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (!workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const industry = (workspace as any).nexus_config?.industry || "general";
    if (industry !== "aviation") {
      return new Response(JSON.stringify({ error: "not_aviation" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rawSessions } = await supabase
      .from("scheduled_sessions")
      .select("id, title, category, scheduled_at, duration_minutes, host_name, co_host_name, status, recurring, recurring_days, recurring_time, description, game_url, route_number, aircraft_model, tail_number, origin, destination, slots, occurrence_assignments")
      .eq("workspace_id", workspace.id)
      .in("status", ["scheduled", "started"])
      .order("scheduled_at", { ascending: true });

    const now = new Date();
    const horizon = now.getTime() + days * 24 * 60 * 60 * 1000;
    const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

    const flights: any[] = [];

    for (const s of rawSessions || []) {
      const base = new Date(s.scheduled_at);
      const occurrences: Date[] = [];

      const pushForDayOffsets = (hh: number, mm: number, match?: (d: Date) => boolean) => {
        for (let i = 0; i <= days; i++) {
          const d = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i, hh, mm, 0,
          ));
          if (match && !match(d)) continue;
          occurrences.push(d);
        }
      };

      if (s.recurring_days && (s.recurring_days as string[]).length && s.recurring_time) {
        const [hh, mm] = String(s.recurring_time).split(":").map((n) => parseInt(n, 10));
        const wanted = (s.recurring_days as string[]).map((d) => d.toLowerCase().slice(0, 3));
        pushForDayOffsets(hh || 0, mm || 0, (d) => wanted.includes(dayNames[d.getUTCDay()]));
      } else if (s.recurring === "weekly") {
        pushForDayOffsets(base.getUTCHours(), base.getUTCMinutes(), (d) => d.getUTCDay() === base.getUTCDay());
      } else if (s.recurring === "daily") {
        pushForDayOffsets(base.getUTCHours(), base.getUTCMinutes());
      } else {
        occurrences.push(base);
      }

      for (const occ of occurrences) {
        const endTs = occ.getTime() + (s.duration_minutes || 60) * 60_000;
        if (Date.now() > endTs) continue;
        if (occ.getTime() > horizon) continue;

        const sessionSlots = Array.isArray((s as any).slots) ? (s as any).slots : [];
        const occAssign = (s as any).occurrence_assignments?.[occ.toISOString()];
        const effSlots = Array.isArray(occAssign)
          ? sessionSlots.map((sl: any, i: number) => ({ ...sl, assigned: occAssign[i] || [] }))
          : sessionSlots;
        const firstAssigned = effSlots.flatMap((sl: any) => sl.assigned || []).find((n: any) => n);
        const hostName = firstAssigned || (s.host_name && s.host_name !== "Unassigned" ? s.host_name : null);

        flights.push({
          id: s.id,
          occurrence: occ.toISOString(),
          title: s.title,
          category: s.category,
          status: s.status,
          date: occ.toISOString(),
          duration: s.duration_minutes || 60,
          host: hostName,
          co_host: s.co_host_name || null,
          description: s.description || null,
          route_number: (s as any).route_number || null,
          aircraft_model: (s as any).aircraft_model || null,
          tail_number: (s as any).tail_number || null,
          origin: (s as any).origin || null,
          destination: (s as any).destination || null,
          origin_name: resolveAirport((s as any).origin),
          destination_name: resolveAirport((s as any).destination),
          game_url: (s as any).game_url || workspace.game_url || null,
        });
      }
    }

    flights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return new Response(JSON.stringify({
      workspace: {
        id: workspace.id,
        name: portal?.name || workspace.name,
        accent_color: portal?.accent_color || null,
        logo_url: portal?.logo_url || null,
        game_url: workspace.game_url || null,
      },
      flights,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
