import { useEffect, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { Users, Activity, Clock, Calendar, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { RobloxAvatar } from "@/components/RobloxAvatar";

interface Stats { members: number; active: number; hours: number; events: number; }
interface TopEntry { username: string; userId: string; seconds: number; sessions: number; }

export default function BDashboard() {
  const { workspaceId } = useWorkspace();
  const [stats, setStats] = useState<Stats>({ members: 0, active: 0, hours: 0, events: 0 });
  const [top, setTop] = useState<TopEntry[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0,0,0,0);
    (async () => {
      const [m, a, w, e, mem] = await Promise.all([
        supabase.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
        supabase.from("activity_sessions").select("id").eq("workspace_id", workspaceId).is("left_at", null).eq("discarded", false),
        supabase.from("activity_sessions").select("roblox_username, roblox_user_id, duration_seconds, idle_seconds, joined_at, left_at").eq("workspace_id", workspaceId).eq("discarded", false).gte("joined_at", weekStart.toISOString()),
        supabase.from("scheduled_sessions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "scheduled"),
        supabase.from("workspace_members").select("user_id, role, created_at, roblox_username, roblox_user_id").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(8),
      ]);
      const now = Date.now();
      let seconds = 0;
      const map = new Map<string, TopEntry>();
      for (const s of (w.data || []) as any[]) {
        const dur = s.duration_seconds != null
          ? Math.max(0, s.duration_seconds - (s.idle_seconds || 0))
          : Math.max(0, Math.floor((now - new Date(s.joined_at).getTime()) / 1000) - (s.idle_seconds || 0));
        seconds += dur;
        if (s.roblox_user_id) {
          const ex = map.get(s.roblox_user_id);
          if (ex) { ex.seconds += dur; ex.sessions++; }
          else map.set(s.roblox_user_id, { username: s.roblox_username, userId: s.roblox_user_id, seconds: dur, sessions: 1 });
        }
      }
      setStats({ members: m.count || 0, active: a.data?.length || 0, hours: Math.round(seconds/3600), events: e.count || 0 });
      setTop(Array.from(map.values()).sort((x,y) => y.seconds - x.seconds).slice(0,5));
      setMembers(mem.data || []);
    })();
  }, [workspaceId]);

  const items = [
    { icon: Users,    label: "Members",         value: stats.members },
    { icon: Activity, label: "Active Now",      value: stats.active  },
    { icon: Clock,    label: "Hours This Week", value: stats.hours   },
    { icon: Calendar, label: "Upcoming Events", value: stats.events  },
  ];

  return (
    <BargainsShell>
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Overview</h1>
          <p className="text-sm mt-2" style={{ color: bx.textDim }}>Your workspace at a glance</p>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border p-5 transition-transform hover:-translate-y-0.5"
              style={bx.cardStyle}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                style={{ background: "rgba(245,90,74,0.14)" }}>
                <Icon className="w-4 h-4" style={{ color: bx.coral }} strokeWidth={2} />
              </div>
              <div className="text-[2.25rem] font-bold leading-none tracking-[-0.03em]" style={{ color: bx.text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
              <div className="text-xs mt-2 font-medium" style={{ color: bx.textDim }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Top performers + members */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border p-5" style={bx.cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base" style={{ color: bx.text }}>Top Performers</h3>
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bx.coral }}>This Week</span>
            </div>
            {top.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: bx.textMuted }}>No activity recorded yet this week.</div>
            ) : (
              <div className="space-y-3">
                {top.map((t, i) => (
                  <div key={t.userId} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: i===0 ? "rgba(245,90,74,0.06)" : "transparent" }}>
                    <span className="w-5 text-center text-xs font-bold" style={{ color: i===0 ? bx.coral : bx.textMuted }}>#{i+1}</span>
                    <RobloxAvatar username={t.username} userId={t.userId} className="w-9 h-9 rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: bx.text }}>{t.username}</div>
                      <div className="text-xs flex items-center gap-1" style={{ color: bx.textDim }}>
                        <TrendingUp className="w-3 h-3" /> {t.sessions} sessions
                      </div>
                    </div>
                    <div className="text-sm font-bold tabular-nums" style={{ color: bx.text }}>
                      {Math.floor(t.seconds/3600)}h {Math.floor((t.seconds%3600)/60)}m
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-5" style={bx.cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base" style={{ color: bx.text }}>Recent Members</h3>
              <span className="text-xs" style={{ color: bx.textMuted }}>{stats.members} total</span>
            </div>
            {members.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: bx.textMuted }}>No members yet.</div>
            ) : (
              <div className="space-y-1">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1f1f22] transition-colors">
                    <RobloxAvatar username={m.roblox_username || "?"} userId={m.roblox_user_id || ""} className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: bx.text }}>{m.roblox_username || "Unknown"}</div>
                      <div className="text-[11px]" style={{ color: bx.textMuted }}>{new Date(m.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider"
                      style={{ background: "rgba(245,90,74,0.12)", color: bx.coral }}>{m.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BargainsShell>
  );
}
