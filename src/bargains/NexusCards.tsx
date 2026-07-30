import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Cake, Hand, Calendar, Clock, Target, Megaphone, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { bx } from "./Shell";

export interface CardData {
  birthdays: { user_id: string; roblox_username: string; roblox_user_id: string }[];
  newMembers: { user_id: string; roblox_username: string; roblox_user_id: string; joined_at: string }[];
  gameThumb: string | null;
  gameUrl?: string | null;
  workspaceName?: string;
  workspaceId: string;
  base: string;
}

/** Hyra-style panel: hairline card, header bar with divider, quiet action link */
function Panel({ title, icon: Icon, action, children }: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border overflow-hidden" style={{ background: "#131315", borderColor: "#232326" }}>
      <div className="flex items-center justify-between px-4 h-12 border-b" style={{ borderColor: "#1e1e21" }}>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em] flex items-center gap-2" style={{ color: bx.textDim }}>
          <Icon className="w-3.5 h-3.5" strokeWidth={1.9} />
          {title}
        </h3>
        {action}
      </div>
      <div className="px-1.5 py-1.5">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-7 text-[13px] text-center" style={{ color: bx.textMuted }}>
      {children}
    </div>
  );
}

/** Hairline-separated list row with quiet hover */
function Row({ children, to }: { children: React.ReactNode; to?: string }) {
  const cls = "flex items-center gap-3 rounded-lg px-2.5 py-2.5 min-h-[48px] transition-colors hover:bg-[#1a1a1d]";
  return to
    ? <Link to={to} className={cls}>{children}</Link>
    : <div className={cls}>{children}</div>;
}

function LinkAction({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="text-[11px] font-medium inline-flex items-center gap-1 hover:opacity-80"
      style={{ color: bx.textDim }}>
      {label} <ChevronRight className="w-3 h-3" />
    </Link>
  );
}



export function NexusCard({ id, data }: { id: string; data: CardData }) {
  switch (id) {
    case "game": return <GameCard data={data} />;
    case "birthdays": return <BirthdaysCard data={data} />;
    case "new_members": return <NewMembersCard data={data} />;
    case "sessions": return <SessionsCard data={data} />;
    case "activity": return <ActivityCard data={data} />;
    case "quotas": return <QuotasCard data={data} />;
    case "announcements": return <AnnouncementsCard data={data} />;
    case "kudos": return <KudosCard data={data} />;
    default: return null;
  }
}

function GameCard({ data }: { data: CardData }) {
  if (!data.gameUrl) return null;
  return (
    <a href={data.gameUrl} target="_blank" rel="noreferrer"
      className="rounded-2xl border overflow-hidden relative h-[180px] block group hover:-translate-y-0.5 transition-transform"
      style={bx.cardStyle}>
      {data.gameThumb && <img src={data.gameThumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3">
        <div className="text-white font-bold text-base mb-2">{data.workspaceName}</div>
        <span className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur">
          <Play className="w-3 h-3 fill-current" /> Play
        </span>
      </div>
    </a>
  );
}

function BirthdaysCard({ data }: { data: CardData }) {
  return (
    <Panel title="Birthdays" icon={Cake}>
      {data.birthdays.length === 0 ? <Empty>No birthdays today.</Empty> : (
        <div className="space-y-1.5">
          {data.birthdays.map(b => (
            <Row key={b.user_id}>
              <RobloxAvatar username={b.roblox_username} userId={b.roblox_user_id} className="w-9 h-9 rounded-md" />
              <div className="text-sm font-semibold" style={{ color: bx.text }}>{b.roblox_username}</div>
              <div className="ml-auto text-xs" style={{ color: bx.textDim }}>Today 🥳</div>
            </Row>
          ))}
        </div>
      )}
    </Panel>
  );
}

function NewMembersCard({ data }: { data: CardData }) {
  return (
    <Panel title="New to the team" icon={Hand}>
      {data.newMembers.length === 0 ? <Empty>No new joiners this week.</Empty> : (
        <div className="space-y-1.5">
          {data.newMembers.slice(0, 6).map(m => (
            <Row key={m.user_id || m.roblox_username}>
              <RobloxAvatar username={m.roblox_username} userId={m.roblox_user_id} className="w-9 h-9 rounded-md" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: bx.text }}>{m.roblox_username}</div>
                <div className="text-xs" style={{ color: bx.textMuted }}>Joined {new Date(m.joined_at).toLocaleDateString()}</div>
              </div>
            </Row>
          ))}
        </div>
      )}
    </Panel>
  );
}

function SessionsCard({ data }: { data: CardData }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!data.workspaceId) return;
    supabase.from("scheduled_sessions")
      .select("id, title, category, scheduled_at, host_name")
      .eq("workspace_id", data.workspaceId)
      .gte("scheduled_at", new Date(Date.now() - 3600_000).toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5)
      .then(({ data: d }) => setRows(d || []));
  }, [data.workspaceId]);
  return (
    <Panel title="Upcoming sessions" icon={Calendar} action={<LinkAction to={`${data.base}/sessions`} label="View all" />}>
      {rows.length === 0 ? <Empty>Nothing scheduled right now.</Empty> : (
        <div className="space-y-1.5">
          {rows.map(s => (
            <Row key={s.id}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate" style={{ color: bx.text }}>{s.title}</div>
                <div className="text-xs" style={{ color: bx.textMuted }}>{s.host_name} · {s.category}</div>
              </div>
              <div className="text-xs whitespace-nowrap" style={{ color: bx.textDim }}>
                {new Date(s.scheduled_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </Row>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ActivityCard({ data }: { data: CardData }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!data.workspaceId) return;
    supabase.from("activity_sessions")
      .select("id, roblox_username, joined_at, duration_seconds")
      .eq("workspace_id", data.workspaceId)
      .eq("discarded", false)
      .order("joined_at", { ascending: false })
      .limit(6)
      .then(({ data: d }) => setRows(d || []));
  }, [data.workspaceId]);
  return (
    <Panel title="Session activity" icon={Clock} action={<LinkAction to={`${data.base}/activity`} label="View all" />}>
      {rows.length === 0 ? <Empty>No tracked activity yet.</Empty> : (
        <div className="space-y-1.5">
          {rows.map(r => (
            <Row key={r.id}>
              <div className="text-sm font-medium truncate flex-1" style={{ color: bx.text }}>{r.roblox_username}</div>
              <div className="text-xs" style={{ color: bx.textDim }}>
                {r.duration_seconds ? `${Math.round(r.duration_seconds / 60)}m` : "In game"}
              </div>
            </Row>
          ))}
        </div>
      )}
    </Panel>
  );
}

function QuotasCard({ data }: { data: CardData }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!data.workspaceId) return;
    supabase.from("workspace_quotas")
      .select("id, title, quota_type, target_value, period")
      .eq("workspace_id", data.workspaceId)
      .limit(5)
      .then(({ data: d }) => setRows(d || []));
  }, [data.workspaceId]);
  return (
    <Panel title="Quotas" icon={Target} action={<LinkAction to={`${data.base}/quotas`} label="View all" />}>
      {rows.length === 0 ? <Empty>No quotas configured.</Empty> : (
        <div className="space-y-1.5">
          {rows.map(q => (
            <Row key={q.id}>
              <div className="text-sm font-medium truncate flex-1" style={{ color: bx.text }}>{q.title}</div>
              <div className="text-xs rounded-full px-2 py-0.5" style={{ color: bx.textDim, background: "#232326" }}>{q.target_value} {q.quota_type} / {q.period}</div>
            </Row>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AnnouncementsCard({ data }: { data: CardData }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!data.workspaceId) return;
    supabase.from("announcements")
      .select("id, title, content, created_at, author_name")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data: d }) => setRows(d || []));
  }, [data.workspaceId]);
  return (
    <Panel title="Announcements" icon={Megaphone} action={<LinkAction to={`${data.base}/wall`} label="Open wall" />}>
      {rows.length === 0 ? <Empty>Nothing posted yet.</Empty> : (
        <div className="space-y-3">
          {rows.map(a => (
            <div key={a.id} className="rounded-xl px-3 py-2.5" style={{ background: "#141416" }}>
              <div className="text-sm font-semibold truncate" style={{ color: bx.text }}>{a.title}</div>
              <div className="text-xs line-clamp-2" style={{ color: bx.textDim }}>{a.content}</div>
              <div className="text-[11px] mt-0.5" style={{ color: bx.textMuted }}>{a.author_name} · {new Date(a.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function KudosCard({ data }: { data: CardData }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!data.workspaceId) return;
    supabase.from("kudos")
      .select("id, from_name, to_name, message, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data: d }) => setRows(d || []));
  }, [data.workspaceId]);
  return (
    <Panel title="Kudos" icon={Heart}>
      {rows.length === 0 ? <Empty>No kudos yet.</Empty> : (
        <div className="space-y-3">
          {rows.map(k => (
            <div key={k.id} className="rounded-xl px-3 py-2.5" style={{ background: "#141416" }}>
              <div className="text-sm" style={{ color: bx.text }}>
                <span className="font-semibold">{k.from_name}</span> → <span className="font-semibold">{k.to_name}</span>
              </div>
              <div className="text-xs" style={{ color: bx.textDim }}>{k.message}</div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
