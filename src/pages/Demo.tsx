import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Clock, FileText, Briefcase, Users, Calendar, Target, Megaphone,
  Heart, ArrowUp, ClipboardList, Grid3x3, Settings, Search, ChevronDown,
  ChevronUp, ChevronsUp, ChevronsDown, ArrowLeft, Activity as ActivityIcon,
} from "lucide-react";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { bx } from "@/bargains/Shell";
import { toast } from "sonner";

/* ---------------------------------------------------------------------------
   /demo — the real Nexus workspace chrome running on fake staff data.
   Nothing here touches the backend; every action is local sandbox state.
--------------------------------------------------------------------------- */

const ACCENT = "#2f74a8";

const RANKS = ["Trainee", "Junior Staff", "Staff", "Senior Staff", "Supervisor", "Manager", "Director"] as const;
type Rank = (typeof RANKS)[number];

type Member = {
  id: string;
  username: string;
  userId: string;
  rank: Rank;
  hours: number;
  sessions: number;
  online: boolean;
  joined: string;
};

const SEED: Member[] = [
  { id: "1", username: "Builderman", userId: "156", rank: "Director", hours: 31.8, sessions: 12, online: false, joined: "12/03/2025" },
  { id: "2", username: "Roblox", userId: "1", rank: "Manager", hours: 24.1, sessions: 9, online: true, joined: "04/01/2026" },
  { id: "3", username: "Shedletsky", userId: "261", rank: "Supervisor", hours: 21.5, sessions: 8, online: true, joined: "22/01/2026" },
  { id: "4", username: "Stickmasterluke", userId: "80254", rank: "Senior Staff", hours: 14.2, sessions: 6, online: true, joined: "07/02/2026" },
  { id: "5", username: "Loleris", userId: "2032622", rank: "Staff", hours: 8.7, sessions: 4, online: false, joined: "19/02/2026" },
  { id: "6", username: "Sonicthehedgehog", userId: "13365322", rank: "Junior Staff", hours: 5.4, sessions: 3, online: true, joined: "02/03/2026" },
  { id: "7", username: "Merely", userId: "1978223", rank: "Trainee", hours: 2.1, sessions: 1, online: false, joined: "14/03/2026" },
];

const NAV = [
  { to: "dashboard", icon: Home, label: "Dashboard" },
  { to: "activity", icon: Clock, label: "Activity" },
  { to: "documents", icon: FileText, label: "Documents" },
  { to: "loa", icon: Briefcase, label: "LOA" },
  { to: "members", icon: Users, label: "Members" },
  { to: "sessions", icon: Calendar, label: "Sessions" },
  { to: "quotas", icon: Target, label: "Quotas" },
  { to: "wall", icon: Megaphone, label: "Wall" },
  { to: "kudos", icon: Heart, label: "Kudos" },
  { to: "promotions", icon: ArrowUp, label: "Promotions" },
  { to: "applications", icon: ClipboardList, label: "Applications" },
  { to: "staff", icon: Grid3x3, label: "Blacklist" },
] as const;

type Page = (typeof NAV)[number]["to"];

type LogEntry = { id: number; text: string; kind: "up" | "down" | "info"; time: string };
const stamp = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function Demo() {
  const navigate = useNavigate();
  const [page, setPage] = useState<Page>("dashboard");
  const [members, setMembers] = useState<Member[]>(SEED);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, text: "Activity tracker connected · heartbeat every 30s", kind: "info", time: stamp() },
    { id: 2, text: "Shift · 2:00 PM created by Shedletsky", kind: "info", time: stamp() },
  ]);

  const push = (text: string, kind: LogEntry["kind"]) =>
    setLogs((l) => [{ id: Date.now() + Math.random(), text, kind, time: stamp() }, ...l].slice(0, 12));

  const rank = (id: string, dir: 1 | -1) => {
    setMembers((ms) =>
      ms.map((m) => {
        if (m.id !== id) return m;
        const i = RANKS.indexOf(m.rank);
        const next = Math.min(RANKS.length - 1, Math.max(0, i + dir));
        if (next === i) {
          toast.info(`${m.username} is already at ${m.rank}`);
          return m;
        }
        const verb = dir === 1 ? "Promoted" : "Demoted";
        toast.success(`${verb} ${m.username} to ${RANKS[next]}`, { description: "Synced to the Roblox group (demo)" });
        push(`${m.username} ${verb.toLowerCase()} — ${m.rank} → ${RANKS[next]}`, dir === 1 ? "up" : "down");
        return { ...m, rank: RANKS[next] };
      }),
    );
  };

  const toggleOnline = (id: string) =>
    setMembers((ms) =>
      ms.map((m) => {
        if (m.id !== id) return m;
        push(`${m.username} ${m.online ? "left" : "joined"} the game server`, "info");
        return { ...m, online: !m.online, hours: m.online ? m.hours : m.hours + 0.5 };
      }),
    );

  const filtered = members.filter((m) => m.username.toLowerCase().includes(q.toLowerCase()));
  const online = members.filter((m) => m.online).length;
  const totalHours = members.reduce((a, m) => a + m.hours, 0);
  const metQuota = members.filter((m) => m.sessions >= 3).length;
  const active = members.find((m) => m.id === selected) || null;

  const rowBase = "group/row h-9 rounded-md flex items-center transition-colors overflow-hidden w-9 group-hover/rail:w-[188px]";
  const labelCls = "ml-2 text-[13px] whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150";

  return (
    <div className="font-bargains flex h-screen w-full overflow-hidden" style={{ background: "#0f0f10", color: bx.text }}>
      {/* rail */}
      <aside className="hidden md:block w-[60px] shrink-0 relative z-40">
        <div
          className="group/rail absolute inset-y-0 left-0 w-[60px] hover:w-[212px] flex flex-col items-center py-3 border-r overflow-hidden transition-[width] duration-200"
          style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}
        >
          <button onClick={() => setPage("dashboard")} className={`${rowBase} justify-start mb-3 shrink-0`}>
            <span className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: ACCENT }}>
              <span className="text-white font-bold text-sm">DG</span>
            </span>
            <span className={`${labelCls} font-semibold text-white`}>Demo Group</span>
          </button>
          <nav className="flex flex-col gap-1 flex-1 w-full items-center overflow-y-auto overflow-x-hidden">
            {NAV.map(({ to, icon: Icon, label }) => (
              <button
                key={to}
                title={label}
                onClick={() => { setPage(to); setSelected(null); }}
                className={`${rowBase} shrink-0`}
                style={{ background: page === to ? "#1f1f22" : "transparent", color: page === to ? "#fff" : "#7a7a7e" }}
              >
                <span className="w-9 h-9 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                </span>
                <span className={labelCls}>{label}</span>
              </button>
            ))}
          </nav>
          <button onClick={() => toast.info("Settings are disabled in the demo")} className={`${rowBase} shrink-0 hover:bg-[#1a1a1c]`} style={{ color: "#7a7a7e" }}>
            <span className="w-9 h-9 flex items-center justify-center shrink-0">
              <Settings className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </span>
            <span className={labelCls}>Settings</span>
          </button>
        </div>
      </aside>

      {/* main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center px-3 md:px-4 gap-2 md:gap-4 border-b shrink-0" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-[10px]" style={{ background: ACCENT }}>DG</div>
            <span className="text-sm font-semibold">Demo Group</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: ACCENT, color: "#fff" }}>Demo</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6a6a6e]" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage("members"); setSelected(null); }}
                placeholder="Search…"
                className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] outline-none border"
                style={{ background: "#161618", borderColor: "#1f1f22", color: "#e5e5e7" }}
              />
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="h-9 px-3 rounded-md text-[13px] font-medium border hover:bg-[#1f1f22] flex items-center gap-1.5"
            style={{ borderColor: "#26262a", background: "#1a1a1c", color: bx.text }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Exit demo
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="rounded-md border px-4 py-3 text-[13px] flex flex-wrap items-center gap-2" style={{ background: "rgba(47,116,168,0.10)", borderColor: "rgba(47,116,168,0.30)", color: "#bcd8ec" }}>
              <span className="font-semibold">Sandbox.</span>
              <span>These are fake staff members — promote, demote and toggle who&rsquo;s in-game. Nothing is saved.</span>
            </div>

            {page === "members" && !active && (
              <MembersPage
                filtered={filtered}
                total={members.length}
                q={q}
                setQ={setQ}
                onOpen={setSelected}
                onRank={rank}
              />
            )}

            {page === "members" && active && (
              <ProfilePage member={active} onBack={() => setSelected(null)} onRank={rank} onToggle={toggleOnline} />
            )}

            {page === "dashboard" && (
              <DashboardPage
                online={online}
                totalHours={totalHours}
                staff={members.length}
                metQuota={metQuota}
                members={members}
                logs={logs}
                onToggle={toggleOnline}
              />
            )}

            {page === "sessions" && <SessionsPage onLog={(t) => push(t, "info")} />}

            {page === "activity" && <ActivityPage members={members} logs={logs} onToggle={toggleOnline} />}

            {page === "quotas" && <QuotasPage members={members} />}

            {!["members", "dashboard", "sessions", "activity", "quotas"].includes(page) && (
              <Placeholder label={NAV.find((n) => n.to === page)?.label || ""} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border p-4" style={bx.cardStyle}>
      <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: bx.textMuted }}>{label}</div>
      <div className="text-[28px] font-bold mt-1 leading-none" style={{ color: bx.text }}>{value}</div>
      <div className="text-[11px] font-mono mt-2 text-emerald-400">{sub}</div>
    </div>
  );
}

function RankPill({ rank }: { rank: Rank }) {
  return (
    <span className="text-[10px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider"
      style={{ background: "rgba(47,116,168,0.14)", color: "#7fb6de" }}>{rank}</span>
  );
}

function MembersPage({
  filtered, total, q, setQ, onOpen, onRank,
}: {
  filtered: Member[]; total: number; q: string; setQ: (v: string) => void;
  onOpen: (id: string) => void; onRank: (id: string, dir: 1 | -1) => void;
}) {
  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Members</h1>
        <span className="text-xs" style={{ color: bx.textMuted }}>{total} total</span>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: bx.textMuted }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members..."
          className="w-full h-10 pl-9 pr-3 rounded-md text-sm outline-none border"
          style={{ background: "#1a1a1c", borderColor: "#26262a", color: bx.text }} />
      </div>

      <div className="rounded-md border overflow-hidden" style={bx.cardStyle}>
        {filtered.map((m, i) => (
          <div key={m.id}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1f1f22] transition-colors"
            style={{ borderTop: i === 0 ? "none" : "1px solid #22222a" }}>
            <button onClick={() => onOpen(m.id)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
              <RobloxAvatar username={m.username} userId={m.userId} className="w-10 h-10 rounded-md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold flex items-center gap-2" style={{ color: bx.text }}>
                  {m.username}
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.online ? "#22c55e" : "#3a3a3e" }} />
                </div>
                <div className="text-xs" style={{ color: bx.textMuted }}>
                  Joined {m.joined} · {m.hours.toFixed(1)}h · {m.sessions} sessions
                </div>
              </div>
            </button>
            <RankPill rank={m.rank} />
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => onRank(m.id, 1)} title="Promote"
                className="h-8 px-2.5 rounded-md text-[12px] font-semibold flex items-center gap-1 hover:brightness-125"
                style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                <ChevronsUp className="w-3.5 h-3.5" /> Promote
              </button>
              <button onClick={() => onRank(m.id, -1)} title="Demote"
                className="h-8 px-2.5 rounded-md text-[12px] font-semibold flex items-center gap-1 hover:brightness-125"
                style={{ background: "rgba(245,90,74,0.12)", color: bx.coral }}>
                <ChevronsDown className="w-3.5 h-3.5" /> Demote
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-12 text-center text-sm" style={{ color: bx.textDim }}>No members found.</div>}
      </div>
    </>
  );
}

function ProfilePage({
  member, onBack, onRank, onToggle,
}: { member: Member; onBack: () => void; onRank: (id: string, dir: 1 | -1) => void; onToggle: (id: string) => void }) {
  return (
    <>
      <button onClick={onBack} className="text-xs flex items-center gap-1.5 hover:underline" style={{ color: bx.textMuted }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to members
      </button>

      <div className="rounded-md border p-6 flex flex-wrap items-center gap-5" style={bx.cardStyle}>
        <RobloxAvatar username={member.username} userId={member.userId} className="w-20 h-20 rounded-md" />
        <div className="min-w-0">
          <h1 className="text-[2rem] font-bold tracking-[-0.03em] leading-none" style={{ color: bx.text }}>{member.username}</h1>
          <div className="mt-2 flex items-center gap-2">
            <RankPill rank={member.rank} />
            <span className="text-xs" style={{ color: bx.textMuted }}>Roblox ID {member.userId}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => onRank(member.id, 1)}
            className="h-9 px-3 rounded-md text-sm font-semibold flex items-center gap-1.5"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
            <ChevronsUp className="w-4 h-4" /> Promote
          </button>
          <button onClick={() => onRank(member.id, -1)}
            className="h-9 px-3 rounded-md text-sm font-semibold flex items-center gap-1.5"
            style={{ background: "rgba(245,90,74,0.12)", color: bx.coral }}>
            <ChevronsDown className="w-4 h-4" /> Demote
          </button>
          <button onClick={() => onToggle(member.id)}
            className="h-9 px-3 rounded-md text-sm font-semibold flex items-center gap-1.5"
            style={{ background: "rgba(47,116,168,0.14)", color: "#7fb6de" }}>
            <ActivityIcon className="w-4 h-4" /> {member.online ? "Mark offline" : "Mark in-game"}
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Hours this week" value={`${member.hours.toFixed(1)}h`} sub={member.online ? "in-game now" : "offline"} />
        <Stat label="Sessions" value={String(member.sessions)} sub={member.sessions >= 3 ? "quota met" : "below quota"} />
        <Stat label="Warnings" value="0" sub="clean record" />
      </div>

      <div className="rounded-md border p-5" style={bx.cardStyle}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em] mb-3" style={{ color: bx.textMuted }}>Logbook</div>
        <div className="space-y-2 text-sm" style={{ color: bx.textDim }}>
          <div>Signed the Staff Handbook · 2 weeks ago</div>
          <div>Hosted Training · 5:30 PM · 3 days ago</div>
          <div>Joined the workspace · {member.joined}</div>
        </div>
      </div>
    </>
  );
}

function DashboardPage({
  online, totalHours, staff, metQuota, members, logs, onToggle,
}: {
  online: number; totalHours: number; staff: number; metQuota: number;
  members: Member[]; logs: LogEntry[]; onToggle: (id: string) => void;
}) {
  return (
    <>
      <div className="rounded-md h-[150px] p-6 flex flex-col justify-end relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #4f95c8 45%, #9dc6e2 100%)` }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.42))" }} />
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/75 mb-1">Hiya, Guest</div>
          <div className="text-white text-[28px] font-bold tracking-[-0.03em] leading-tight">Great to see you back</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Online now" value={String(online)} sub="live" />
        <Stat label="Hours logged" value={`${totalHours.toFixed(1)}h`} sub="this week" />
        <Stat label="Staff" value={String(staff)} sub="in group" />
        <Stat label="Quota met" value={`${Math.round((metQuota / staff) * 100)}%`} sub={`${metQuota}/${staff}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-md border p-5" style={bx.cardStyle}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.09em] mb-3" style={{ color: bx.textMuted }}>Staff in-game</div>
          <div className="space-y-2">
            {members.filter((m) => m.online).map((m) => (
              <button key={m.id} onClick={() => onToggle(m.id)}
                className="w-full flex items-center gap-3 rounded-md border px-3 py-2 hover:bg-[#1f1f22] text-left"
                style={bx.cardInner}>
                <RobloxAvatar username={m.username} userId={m.userId} className="w-8 h-8 rounded-md" />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: bx.text }}>{m.username}</div>
                  <div className="text-[11px]" style={{ color: bx.textMuted }}>{m.rank} · {m.hours.toFixed(1)}h this week</div>
                </div>
              </button>
            ))}
            {members.every((m) => !m.online) && (
              <div className="py-8 text-center text-sm" style={{ color: bx.textDim }}>Nobody in-game right now.</div>
            )}
          </div>
        </div>

        <div className="rounded-md border p-5" style={bx.cardStyle}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.09em] mb-3" style={{ color: bx.textMuted }}>Recent activity</div>
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 rounded-md border px-3 py-2" style={bx.cardInner}>
                <span className="w-1.5 h-8 rounded-full shrink-0"
                  style={{ background: l.kind === "up" ? "#22c55e" : l.kind === "down" ? bx.coral : ACCENT }} />
                <div className="min-w-0">
                  <div className="text-[13px] leading-snug" style={{ color: bx.text }}>{l.text}</div>
                  <div className="text-[11px] font-mono" style={{ color: bx.textMuted }}>{l.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function SessionsPage({ onLog }: { onLog: (t: string) => void }) {
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const sessions = [
    { id: "s1", title: "Shift · 2:00 PM", host: "Shedletsky", claimed: 12 },
    { id: "s2", title: "Training · 5:30 PM", host: "Loleris", claimed: 6 },
    { id: "s3", title: "Event · 8:00 PM", host: "Merely", claimed: 21 },
  ];
  return (
    <>
      <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Sessions</h1>
      <div className="rounded-md border overflow-hidden" style={bx.cardStyle}>
        {sessions.map((s, i) => (
          <div key={s.id} className="flex items-center gap-4 px-5 py-4" style={{ borderTop: i === 0 ? "none" : "1px solid #22222a" }}>
            <span className="w-1.5 h-9 rounded-full" style={{ background: ACCENT }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: bx.text }}>{s.title}</div>
              <div className="text-xs" style={{ color: bx.textMuted }}>Host {s.host} · {s.claimed + (claimed[s.id] ? 1 : 0)} claimed</div>
            </div>
            <button
              onClick={() => {
                const next = !claimed[s.id];
                setClaimed((c) => ({ ...c, [s.id]: next }));
                onLog(next ? `Claimed a slot on ${s.title}` : `Dropped slot on ${s.title}`);
                toast.success(next ? `Claimed ${s.title}` : `Dropped ${s.title}`);
              }}
              className="h-9 px-3 rounded-md text-[13px] font-semibold"
              style={claimed[s.id]
                ? { background: "rgba(34,197,94,0.12)", color: "#22c55e" }
                : { background: "rgba(47,116,168,0.14)", color: "#7fb6de" }}>
              {claimed[s.id] ? "Claimed" : "Claim slot"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function ActivityPage({ members, logs, onToggle }: { members: Member[]; logs: LogEntry[]; onToggle: (id: string) => void }) {
  const max = Math.max(...members.map((m) => m.hours), 1);
  return (
    <>
      <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Activity</h1>
      <div className="rounded-md border p-5 space-y-3" style={bx.cardStyle}>
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <button onClick={() => onToggle(m.id)} className="w-36 text-left text-[13px] font-semibold truncate hover:underline" style={{ color: bx.text }}>
              {m.username}
            </button>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#22222a" }}>
              <div className="h-full rounded-full" style={{ width: `${(m.hours / max) * 100}%`, background: ACCENT }} />
            </div>
            <span className="w-16 text-right text-[12px] font-mono" style={{ color: bx.textMuted }}>{m.hours.toFixed(1)}h</span>
          </div>
        ))}
      </div>
      <div className="rounded-md border p-5" style={bx.cardStyle}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em] mb-3" style={{ color: bx.textMuted }}>Live log</div>
        <div className="space-y-1.5">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-[13px]" style={{ color: bx.textDim }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: l.kind === "up" ? "#22c55e" : l.kind === "down" ? bx.coral : ACCENT }} />
              <span className="truncate">{l.text}</span>
              <span className="ml-auto text-[11px] font-mono shrink-0" style={{ color: bx.textMuted }}>{l.time}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function QuotasPage({ members }: { members: Member[] }) {
  return (
    <>
      <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Quotas</h1>
      <div className="rounded-md border overflow-hidden" style={bx.cardStyle}>
        {members.map((m, i) => {
          const met = m.sessions >= 3;
          return (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3.5" style={{ borderTop: i === 0 ? "none" : "1px solid #22222a" }}>
              <RobloxAvatar username={m.username} userId={m.userId} className="w-9 h-9 rounded-md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: bx.text }}>{m.username}</div>
                <div className="text-xs" style={{ color: bx.textMuted }}>{m.sessions}/3 sessions · {m.hours.toFixed(1)}h / 4h</div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider"
                style={met ? { background: "rgba(34,197,94,0.12)", color: "#22c55e" } : { background: "rgba(245,158,11,0.12)", color: bx.warning }}>
                {met ? "Met" : "Behind"}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <>
      <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>{label}</h1>
      <div className="rounded-md border p-12 text-center" style={bx.cardStyle}>
        <ChevronUp className="w-5 h-5 mx-auto mb-3 opacity-40" />
        <p className="text-sm" style={{ color: bx.textDim }}>
          {label} is part of the real workspace. Create a free workspace to use it with your own group.
        </p>
      </div>
    </>
  );
}
