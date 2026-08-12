import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, PlaneTakeoff, Clock, Users, ArrowRight, Search } from "lucide-react";

type Flight = {
  id: string;
  occurrence: string;
  title: string;
  category: string;
  status: string;
  date: string;
  duration: number;
  host: string | null;
  co_host: string | null;
  description: string | null;
  route_number: string | null;
  aircraft_model: string | null;
  tail_number: string | null;
  origin: string | null;
  destination: string | null;
  origin_name: string | null;
  destination_name: string | null;
  game_url: string | null;
};

type HubData = {
  workspace: { id: string; name: string; accent_color: string | null; logo_url: string | null; game_url: string | null };
  flights: Flight[];
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - startToday) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function GuestFlightHub() {
  const { workspaceId } = useParams();
  const [data, setData] = useState<HubData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "not_aviation">("loading");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const host = window.location.hostname;
    const sub = host.split(".")[0].toLowerCase();
    const params = new URLSearchParams();
    if (workspaceId) params.set("workspace", workspaceId);
    else params.set("subdomain", sub);
    params.set("days", "7");

    const base = import.meta.env.VITE_SUPABASE_URL;
    fetch(`${base}/functions/v1/public-flighthub?${params.toString()}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then(async (r) => {
        const j = await r.json();
        if (r.status === 403 && j.error === "not_aviation") { setState("not_aviation"); return; }
        if (!r.ok) { setState("error"); return; }
        setData(j);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [workspaceId]);

  const categories = useMemo(() => {
    const set = new Set((data?.flights || []).map((f) => f.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [data]);

  const flights = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.flights || []).filter((f) => {
      if (filter !== "all" && f.category !== filter) return false;
      if (!q) return true;
      return [f.title, f.route_number, f.origin, f.destination, f.origin_name, f.destination_name, f.host]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, query, filter]);

  const accent = data?.workspace.accent_color || undefined;

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (state === "not_aviation") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Flight Hub unavailable</h1>
          <p className="mt-2 text-muted-foreground">This workspace isn't running Fluxcore for Aviation.</p>
        </div>
      </div>
    );
  }

  if (state === "error" || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Flight Hub unavailable</h1>
          <p className="mt-2 text-muted-foreground">We couldn't load the departures board right now.</p>
        </div>
      </div>
    );
  }

  const next = flights[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 py-5 flex items-center gap-3">
          {data.workspace.logo_url ? (
            <img src={data.workspace.logo_url} alt={`${data.workspace.name} logo`} className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <PlaneTakeoff className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">{data.workspace.name} Flight Hub</h1>
            <p className="text-xs text-muted-foreground">Public departures board · next 7 days</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6 space-y-6">
        {/* Next flight banner */}
        <section
          className="rounded-2xl border border-border/60 p-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent"
          style={accent ? { borderColor: `${accent}55` } : undefined}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {next ? (next.status === "started" ? "Boarding now" : "Next scheduled flight") : "No flights"}
          </p>
          {next ? (
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div className="text-3xl font-semibold tracking-tight">
                {next.origin_name || next.origin || "Base"}
                <ArrowRight className="inline mx-3 h-6 w-6 text-muted-foreground" />
                {next.destination_name || next.destination || "TBA"}
              </div>
              <div className="text-sm text-muted-foreground">
                {dayLabel(next.date)} · {timeLabel(next.date)}
                {next.route_number ? ` · ${next.route_number}` : ""}
              </div>
              {next.game_url && (
                <a
                  href={next.game_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
                >
                  {next.status === "started" ? "Join now" : "View experience"}
                </a>
              )}
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">Nothing scheduled in the next 7 days. Check back soon.</p>
          )}
        </section>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search route, airport or crew"
              className="w-full rounded-xl border border-border/60 bg-card/40 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-xl border px-3 py-2 text-xs capitalize transition ${
                filter === c
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-border/60 bg-card/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Board */}
        <section className="space-y-3">
          {flights.length === 0 && (
            <p className="rounded-2xl border border-border/60 bg-card/30 p-6 text-center text-muted-foreground">
              No flights match your search.
            </p>
          )}
          {flights.map((f) => (
            <article
              key={`${f.id}-${f.occurrence}`}
              className="rounded-2xl border border-border/60 bg-card/40 p-4 hover:border-primary/40 transition"
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="w-24">
                  <div className="text-xl font-semibold tabular-nums">{timeLabel(f.date)}</div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{dayLabel(f.date)}</div>
                </div>

                <div className="min-w-[200px] flex-1">
                  <div className="flex items-center gap-2 text-base font-medium">
                    <span>{f.origin_name || f.origin || "Base"}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span>{f.destination_name || f.destination || "TBA"}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {[f.route_number, f.title, f.aircraft_model, f.tail_number].filter(Boolean).join(" · ")}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{f.duration} min</div>
                  {(f.host || f.co_host) && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {[f.host, f.co_host].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      f.status === "started"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {f.status === "started" ? "In flight" : "Scheduled"}
                  </span>
                  {f.game_url && (
                    <a
                      href={f.game_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-border/60 px-3 py-1.5 text-xs hover:border-primary/60 transition"
                    >
                      {f.status === "started" ? "Join" : "Open"}
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>

        <footer className="pt-4 pb-10 text-center text-xs text-muted-foreground">
          Powered by Fluxcore for Aviation
        </footer>
      </main>
    </div>
  );
}
