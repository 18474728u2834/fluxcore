import { Users, Activity, Clock, CalendarDays, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

export function StatsGrid() {
  const { workspaceId } = useWorkspace();
  const [stats, setStats] = useState({ members: 0, activeSessions: 0, totalHours: 0, scheduledEvents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const [membersRes, activeRes, weekRes, eventsRes] = await Promise.all([
        supabase.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
        supabase.from("activity_sessions").select("id, joined_at, idle_seconds").eq("workspace_id", workspaceId).is("left_at", null).eq("discarded", false),
        supabase.from("activity_sessions").select("duration_seconds, joined_at, left_at, idle_seconds").eq("workspace_id", workspaceId).eq("discarded", false).gte("joined_at", weekStart.toISOString()),
        supabase.from("scheduled_sessions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "scheduled"),
      ]);

      // Sum completed sessions this week + live counted time on active sessions this week
      const now = Date.now();
      let weekSeconds = 0;
      for (const s of weekRes.data || []) {
        if (s.duration_seconds != null) {
          weekSeconds += Math.max(0, (s.duration_seconds || 0) - (s.idle_seconds || 0));
        } else if (!s.left_at) {
          const live = Math.max(0, Math.floor((now - new Date(s.joined_at).getTime()) / 1000) - (s.idle_seconds || 0));
          weekSeconds += live;
        }
      }

      setStats({
        members: membersRes.count || 0,
        activeSessions: activeRes.data?.length || 0,
        totalHours: Math.round(weekSeconds / 3600),
        scheduledEvents: eventsRes.count || 0,
      });
      setLoading(false);
    };

    fetchStats();
    // Periodic refresh so live counters stay current even without realtime events
    const id = setInterval(fetchStats, 30_000);

    const channel = supabase
      .channel(`stats-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_members", filter: `workspace_id=eq.${workspaceId}` }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_sessions", filter: `workspace_id=eq.${workspaceId}` }, () => fetchStats())
      .subscribe();

    return () => { clearInterval(id); supabase.removeChannel(channel); };
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  const items = [
    { label: "Members", value: stats.members.toString(), icon: Users, live: false },
    { label: "Active Now", value: stats.activeSessions.toString(), icon: Activity, live: stats.activeSessions > 0 },
    { label: "Hours This Week", value: stats.totalHours.toString(), icon: Clock, live: stats.activeSessions > 0 },
    { label: "Upcoming Events", value: stats.scheduledEvents.toString(), icon: CalendarDays, live: false },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((stat) => (
        <div key={stat.label} className="glass-hover rounded-xl p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="relative w-11 h-11 rounded-xl flex items-center justify-center border border-primary/30 bg-gradient-to-br from-primary/25 via-accent/15 to-transparent shadow-[0_0_20px_-4px_hsl(var(--primary)/0.45)]">
              <stat.icon className="w-5 h-5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.7)]" strokeWidth={2.25} />
            </div>
            {stat.live && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-success">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                LIVE
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
