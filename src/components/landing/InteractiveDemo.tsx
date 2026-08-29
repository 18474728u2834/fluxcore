import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Clock,
  ChevronUp,
  ChevronDown,
  Search,
  Settings,
  Activity,
  CheckCircle2,
  MousePointerClick,
} from "lucide-react";

/* ---------------------------------------------------------------------------
   Interactive product demo — fake Roblox staff you can actually promote,
   demote, mark active and sign off. Pure local state, no backend.
--------------------------------------------------------------------------- */

const RANKS = ["Trainee", "Staff", "Senior Staff", "Supervisor", "Manager", "Director"] as const;
type Rank = (typeof RANKS)[number];

type Member = {
  id: number;
  name: string;
  display: string;
  rank: Rank;
  hours: number;
  sessions: number;
  online: boolean;
  hue: number;
};

const SEED: Member[] = [
  { id: 1, name: "synt_rblx", display: "Synt", rank: "Senior Staff", hours: 14.2, sessions: 6, online: true, hue: 205 },
  { id: 2, name: "kaiverse", display: "Kai", rank: "Staff", hours: 8.7, sessions: 4, online: true, hue: 12 },
  { id: 3, name: "miraLuna", display: "Mira", rank: "Supervisor", hours: 21.5, sessions: 9, online: false, hue: 268 },
  { id: 4, name: "noelBuilds", display: "Noel", rank: "Trainee", hours: 2.1, sessions: 1, online: true, hue: 145 },
  { id: 5, name: "avaOnRblx", display: "Ava", rank: "Manager", hours: 31.8, sessions: 12, online: false, hue: 32 },
  { id: 6, name: "d3vin", display: "Devin", rank: "Staff", hours: 6.4, sessions: 3, online: true, hue: 190 },
];

const rankTone: Record<Rank, string> = {
  Trainee: "#6f6f74",
  Staff: "#8a8a8e",
  "Senior Staff": "#2f74a8",
  Supervisor: "#3f9bd6",
  Manager: "#d8a13a",
  Director: "#e0616b",
};

type LogEntry = { id: number; text: string; kind: "up" | "down" | "info"; time: string };

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function InteractiveDemo() {
  const [members, setMembers] = useState<Member[]>(SEED);
  const [tab, setTab] = useState<"dashboard" | "members" | "sessions">("members");
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 0, text: "Activity tracker connected · heartbeat every 30s", kind: "info", time: nowLabel() },
  ]);

  const push = (text: string, kind: LogEntry["kind"]) =>
    setLogs((l) => [{ id: Date.now() + Math.random(), text, kind, time: nowLabel() }, ...l].slice(0, 8));

  const move = (id: number, dir: 1 | -1) => {
    setMembers((ms) =>
      ms.map((m) => {
        if (m.id !== id) return m;
        const idx = RANKS.indexOf(m.rank);
        const next = Math.min(RANKS.length - 1, Math.max(0, idx + dir));
        if (next === idx) {
          push(`${m.display} is already at ${m.rank}`, "info");
          return m;
        }
        push(
          `${m.display} ${dir === 1 ? "promoted" : "demoted"} to ${RANKS[next]} · synced to Roblox group`,
          dir === 1 ? "up" : "down",
        );
        return { ...m, rank: RANKS[next] };
      }),
    );
  };

  const toggleOnline = (id: number) => {
    setMembers((ms) =>
      ms.map((m) => {
        if (m.id !== id) return m;
        push(`${m.display} ${m.online ? "left the game server" : "joined the game server"}`, "info");
        return { ...m, online: !m.online, hours: m.online ? m.hours : m.hours + 0.5 };
      }),
    );
  };

  const filtered = members.filter(
    (m) =>
      m.display.toLowerCase().includes(query.toLowerCase()) ||
      m.name.toLowerCase().includes(query.toLowerCase()),
  );

  const online = members.filter((m) => m.online).length;
  const totalHours = members.reduce((a, m) => a + m.hours, 0);
  const metQuota = members.filter((m) => m.sessions >= 3).length;

  const rail = [
    { icon: LayoutDashboard, label: "dashboard" as const },
    { icon: Users, label: "members" as const },
    { icon: CalendarDays, label: "sessions" as const },
  ];

  return (
    <div
      className="rounded-2xl border border-border/60 overflow-hidden shadow-[0_32px_80px_-32px_rgba(0,0,0,0.6)]"
      style={{ background: "#0f0f10" }}
    >
      {/* browser chrome */}
      <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b" style={{ borderColor: "#1a1a1c", background: "#0a0a0b" }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3a3a3e" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3a3a3e" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3a3a3e" }} />
        <div className="flex-1 flex justify-center">
          <div className="px-3.5 py-1 rounded-full text-[11px] font-mono" style={{ background: "#161618", color: "rgba(255,255,255,0.45)" }}>
            fluxcore.works/w/staff-team/{tab}
          </div>
        </div>
        <span
          className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "rgba(47,116,168,0.16)", color: "#7fb6de" }}
        >
          <MousePointerClick className="w-3 h-3" /> Live demo
        </span>
      </div>

      <div className="flex min-h-[540px]" style={{ color: "#fafafa" }}>
        {/* rail */}
        <aside className="w-[54px] shrink-0 flex flex-col items-center py-3 border-r" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
          <div className="w-7 h-7 rounded-lg mb-3 flex items-center justify-center" style={{ background: "#2f74a8" }}>
            <span className="text-white font-black text-[11px]">F</span>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            {rail.map((i) => (
              <button
                key={i.label}
                onClick={() => setTab(i.label)}
                aria-label={i.label}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  background: tab === i.label ? "#1f1f22" : "transparent",
                  color: tab === i.label ? "#fff" : "#6f6f74",
                }}
              >
                <i.icon className="w-[15px] h-[15px]" strokeWidth={1.8} />
              </button>
            ))}
          </nav>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "#6f6f74" }}>
            <Settings className="w-[15px] h-[15px]" strokeWidth={1.8} />
          </div>
        </aside>

        {/* content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-11 flex items-center justify-between px-4 border-b" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-[5px]" style={{ background: "#2f74a8" }} />
              <span className="text-[12.5px] font-medium">Staff Team</span>
              <span className="text-[11px] capitalize" style={{ color: "#6f6f74" }}>/ {tab}</span>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full" style={{ background: "#161618", color: "#8a8a8e" }}>
              Demo workspace
            </span>
          </header>

          <div className="p-5 space-y-4">
            {/* stats always visible */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["Online now", String(online), "live"],
                ["Hours logged", `${totalHours.toFixed(1)}h`, "this week"],
                ["Staff", String(members.length), "in group"],
                ["Quota met", `${Math.round((metQuota / members.length) * 100)}%`, `${metQuota}/${members.length}`],
              ].map(([l, v, s]) => (
                <div key={l} className="rounded-xl border p-3" style={{ background: "#141416", borderColor: "#22222a" }}>
                  <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "#6f6f74" }}>{l}</div>
                  <div className="text-[22px] font-bold mt-1 leading-none">{v}</div>
                  <div className="text-[10px] font-mono mt-1.5 text-emerald-400">{s}</div>
                </div>
              ))}
            </div>

            {tab === "members" && (
              <div className="rounded-xl border" style={{ background: "#141416", borderColor: "#22222a" }}>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "#22222a" }}>
                  <Search className="w-3.5 h-3.5" style={{ color: "#6f6f74" }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search staff…"
                    className="bg-transparent outline-none text-[12.5px] flex-1 placeholder:text-[#5a5a60]"
                  />
                  <span className="text-[10.5px]" style={{ color: "#6f6f74" }}>{filtered.length} members</span>
                </div>
                <div className="divide-y" style={{ borderColor: "#22222a" }}>
                  {filtered.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderColor: "#22222a" }}>
                      <span
                        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                        style={{ background: `linear-gradient(135deg, hsl(${m.hue} 45% 42%), hsl(${m.hue} 40% 26%))` }}
                      >
                        {m.display[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold truncate flex items-center gap-1.5">
                          {m.display}
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: m.online ? "#34d399" : "#3a3a3e" }}
                          />
                        </div>
                        <div className="text-[10.5px] font-mono truncate" style={{ color: "#6f6f74" }}>@{m.name}</div>
                      </div>
                      <div className="hidden sm:block text-[10.5px] text-right w-20" style={{ color: "#6f6f74" }}>
                        {m.hours.toFixed(1)}h · {m.sessions} sess.
                      </div>
                      <span
                        className="text-[10.5px] font-semibold px-2 py-1 rounded-md w-[92px] text-center shrink-0"
                        style={{ background: "#0f0f11", border: `1px solid ${rankTone[m.rank]}44`, color: rankTone[m.rank] }}
                      >
                        {m.rank}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => move(m.id, 1)}
                          title="Promote"
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:brightness-125"
                          style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => move(m.id, -1)}
                          title="Demote"
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:brightness-125"
                          style={{ background: "rgba(224,97,107,0.12)", color: "#e0616b" }}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleOnline(m.id)}
                          title="Toggle in-game"
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:brightness-125"
                          style={{ background: "rgba(47,116,168,0.14)", color: "#7fb6de" }}
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div className="px-3 py-8 text-center text-[12px]" style={{ color: "#6f6f74" }}>
                      No staff match “{query}”.
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "dashboard" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border p-4" style={{ background: "#141416", borderColor: "#22222a" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.09em] mb-3" style={{ color: "#6f6f74" }}>
                    Staff online
                  </div>
                  <div className="space-y-2">
                    {members.filter((m) => m.online).map((m) => (
                      <div key={m.id} className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2" style={{ background: "#0f0f11", borderColor: "#22222a" }}>
                        <span
                          className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: `linear-gradient(135deg, hsl(${m.hue} 45% 42%), hsl(${m.hue} 40% 26%))` }}
                        >
                          {m.display[0]}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold truncate">{m.display}</div>
                          <div className="text-[10.5px]" style={{ color: "#6f6f74" }}>{m.rank} · {m.hours.toFixed(1)}h this week</div>
                        </div>
                      </div>
                    ))}
                    {online === 0 && (
                      <div className="text-[12px] py-6 text-center" style={{ color: "#6f6f74" }}>Nobody in-game right now.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border p-4" style={{ background: "#141416", borderColor: "#22222a" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.09em] mb-3" style={{ color: "#6f6f74" }}>
                    Logbook
                  </div>
                  <div className="space-y-2">
                    {logs.map((l) => (
                      <div key={l.id} className="flex items-start gap-2.5 rounded-lg border px-2.5 py-2" style={{ background: "#0f0f11", borderColor: "#22222a" }}>
                        <span
                          className="w-1.5 h-8 rounded-full shrink-0"
                          style={{ background: l.kind === "up" ? "#34d399" : l.kind === "down" ? "#e0616b" : "#2f74a8" }}
                        />
                        <div className="min-w-0">
                          <div className="text-[11.5px] leading-snug">{l.text}</div>
                          <div className="text-[10px] font-mono" style={{ color: "#6f6f74" }}>{l.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "sessions" && (
              <SessionsPanel onClaim={(t) => push(t, "info")} />
            )}

            {/* log strip under members/sessions */}
            {tab !== "dashboard" && (
              <div className="rounded-xl border p-3" style={{ background: "#141416", borderColor: "#22222a" }}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.09em] mb-2" style={{ color: "#6f6f74" }}>
                  Live logbook
                </div>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 text-[11.5px]">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: l.kind === "up" ? "#34d399" : l.kind === "down" ? "#e0616b" : "#2f74a8" }}
                      />
                      <span className="truncate">{l.text}</span>
                      <span className="ml-auto text-[10px] font-mono shrink-0" style={{ color: "#6f6f74" }}>{l.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionsPanel({ onClaim }: { onClaim: (text: string) => void }) {
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const sessions = [
    { id: "s1", title: "Shift · 2:00 PM", meta: "Host Synt · 12 claimed" },
    { id: "s2", title: "Training · 5:30 PM", meta: "Host Kai · 6 claimed" },
    { id: "s3", title: "Event · 8:00 PM", meta: "Host Mira · 21 claimed" },
  ];

  return (
    <div className="rounded-xl border p-4" style={{ background: "#141416", borderColor: "#22222a" }}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.09em] mb-3" style={{ color: "#6f6f74" }}>
        Upcoming sessions
      </div>
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2" style={{ background: "#0f0f11", borderColor: "#22222a" }}>
            <span className="w-1.5 h-8 rounded-full" style={{ background: "#2f74a8" }} />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold truncate">{s.title}</div>
              <div className="text-[10.5px]" style={{ color: "#6f6f74" }}>{s.meta}</div>
            </div>
            <button
              onClick={() => {
                const next = !claimed[s.id];
                setClaimed((c) => ({ ...c, [s.id]: next }));
                onClaim(next ? `Claimed a slot on ${s.title}` : `Dropped slot on ${s.title}`);
              }}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors hover:brightness-125"
              style={
                claimed[s.id]
                  ? { background: "rgba(52,211,153,0.14)", color: "#34d399" }
                  : { background: "rgba(47,116,168,0.16)", color: "#7fb6de" }
              }
            >
              {claimed[s.id] ? <><CheckCircle2 className="w-3.5 h-3.5" /> Claimed</> : <><Clock className="w-3.5 h-3.5" /> Claim slot</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InteractiveDemo;
