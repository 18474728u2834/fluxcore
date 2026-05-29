import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Loader2, Trophy, Clock, CalendarDays, MessageSquare, Target as TargetIcon, Crown, Medal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { RobloxAvatar } from "@/components/RobloxAvatar";

type Category = "time_in_game" | "sessions_hosted" | "messages_sent" | "quotas_met";
type Range = "week" | "month" | "all";

const CATEGORY_META: Record<Category, { label: string; icon: any; unit: string }> = {
  time_in_game:   { label: "Time In-Game",   icon: Clock,         unit: "min" },
  sessions_hosted:{ label: "Sessions Hosted",icon: CalendarDays,  unit: "" },
  messages_sent:  { label: "Messages Sent",  icon: MessageSquare, unit: "" },
  quotas_met:     { label: "Quotas Met",     icon: TargetIcon,    unit: "" },
};

interface Row {
  roblox_user_id: string;
  roblox_username: string;
  value: number;
}

function rangeStart(range: Range): string | null {
  if (range === "all") return null;
  const d = new Date();
  if (range === "week") d.setDate(d.getDate() - 7);
  else d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

export default function Leaderboard() {
  const { workspaceId } = useWorkspace();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("time_in_game");
  const [range, setRange] = useState<Range>("week");
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("leaderboard_categories")
        .eq("id", workspaceId)
        .maybeSingle();
      const cats = ((data as any)?.leaderboard_categories || []) as Category[];
      setCategories(cats);
      if (cats.length > 0) setCategory(cats[0]);
      setLoading(false);
    })();
  }, [workspaceId]);

  useEffect(() => {
    if (categories.length === 0) return;
    let cancelled = false;
    (async () => {
      setRowsLoading(true);
      const since = rangeStart(range);
      const map = new Map<string, Row>();

      const addTo = (uid: string, name: string, amount: number) => {
        const existing = map.get(uid);
        if (existing) existing.value += amount;
        else map.set(uid, { roblox_user_id: uid, roblox_username: name, value: amount });
      };

      if (category === "time_in_game") {
        let q = supabase
          .from("activity_sessions")
          .select("roblox_user_id, roblox_username, duration_seconds, joined_at")
          .eq("workspace_id", workspaceId)
          .eq("discarded", false)
          .not("duration_seconds", "is", null);
        if (since) q = q.gte("joined_at", since);
        const { data } = await q.limit(5000);
        for (const s of (data || []) as any[]) {
          addTo(s.roblox_user_id, s.roblox_username, Math.round((s.duration_seconds || 0) / 60));
        }
      } else if (category === "messages_sent") {
        let q = supabase
          .from("activity_sessions")
          .select("roblox_user_id, roblox_username, message_count, joined_at")
          .eq("workspace_id", workspaceId)
          .eq("discarded", false);
        if (since) q = q.gte("joined_at", since);
        const { data } = await q.limit(5000);
        for (const s of (data || []) as any[]) {
          addTo(s.roblox_user_id, s.roblox_username, s.message_count || 0);
        }
      } else if (category === "sessions_hosted") {
        let q = supabase
          .from("scheduled_sessions")
          .select("host_name, host_id, scheduled_at, status")
          .eq("workspace_id", workspaceId)
          .neq("status", "cancelled");
        if (since) q = q.gte("scheduled_at", since);
        const { data: sessions } = await q.limit(5000);
        // Map host_id (auth user) → roblox user
        const hostIds = [...new Set((sessions || []).map((s: any) => s.host_id).filter(Boolean))];
        const idToRoblox: Record<string, { roblox_user_id: string; roblox_username: string }> = {};
        if (hostIds.length > 0) {
          const { data: members } = await supabase
            .from("workspace_members")
            .select("user_id, roblox_user_id, roblox_username")
            .eq("workspace_id", workspaceId)
            .in("user_id", hostIds);
          for (const m of (members || []) as any[]) {
            if (m.user_id) idToRoblox[m.user_id] = { roblox_user_id: m.roblox_user_id, roblox_username: m.roblox_username };
          }
        }
        for (const s of (sessions || []) as any[]) {
          const r = s.host_id ? idToRoblox[s.host_id] : null;
          if (r) addTo(r.roblox_user_id, r.roblox_username, 1);
          else if (s.host_name) addTo(`name:${s.host_name}`, s.host_name, 1);
        }
      } else if (category === "quotas_met") {
        // Quotas met = members whose total in-range minutes ≥ workspace session-quota * 60
        // Simple proxy: count of weekly sessions meeting the workspace's first 'sessions' quota.
        const [{ data: quotas }, { data: sessions }] = await Promise.all([
          supabase.from("workspace_quotas").select("quota_type, target_value").eq("workspace_id", workspaceId).limit(5),
          (since
            ? supabase.from("activity_sessions").select("roblox_user_id, roblox_username, duration_seconds, joined_at").eq("workspace_id", workspaceId).eq("discarded", false).gte("joined_at", since).limit(5000)
            : supabase.from("activity_sessions").select("roblox_user_id, roblox_username, duration_seconds, joined_at").eq("workspace_id", workspaceId).eq("discarded", false).limit(5000)),
        ]);
        const sessionQuota = (quotas || []).find((q: any) => q.quota_type === "sessions")?.target_value ?? 1;
        const minutesQuota = (quotas || []).find((q: any) => q.quota_type === "minutes")?.target_value ?? 0;
        const agg = new Map<string, { name: string; sessions: number; minutes: number }>();
        for (const s of (sessions || []) as any[]) {
          const e = agg.get(s.roblox_user_id) || { name: s.roblox_username, sessions: 0, minutes: 0 };
          e.sessions += 1;
          e.minutes += Math.round((s.duration_seconds || 0) / 60);
          agg.set(s.roblox_user_id, e);
        }
        for (const [uid, v] of agg.entries()) {
          const met = (v.sessions >= sessionQuota ? 1 : 0) + (minutesQuota > 0 && v.minutes >= minutesQuota ? 1 : 0);
          addTo(uid, v.name, met);
        }
      }

      const sorted = [...map.values()].filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 50);
      if (cancelled) return;
      setRows(sorted);
      setRowsLoading(false);

      // Avatars
      const ids = sorted.map((r) => r.roblox_user_id).filter((x) => !x.startsWith("name:")).slice(0, 30).join(",");
      if (ids) {
        try {
          const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids}&size=48x48&format=Png&isCircular=true`);
          const json = await res.json();
          const m: Record<string, string> = {};
          for (const it of json?.data || []) if (it.imageUrl) m[String(it.targetId)] = it.imageUrl;
          if (!cancelled) setAvatars((prev) => ({ ...prev, ...m }));
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceId, category, range, categories.length]);

  if (loading) {
    return (
      <DashboardLayout title="Leaderboard">
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      </DashboardLayout>
    );
  }

  if (categories.length === 0) {
    return (
      <DashboardLayout title="Leaderboard">
        <div className="max-w-md mx-auto mt-20 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
            <Trophy className="w-5 h-5 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Leaderboards are off</h1>
          <p className="text-sm text-muted-foreground">The workspace owner hasn't enabled any leaderboard categories yet. They can turn them on in Settings.</p>
        </div>
      </DashboardLayout>
    );
  }

  const meta = CATEGORY_META[category];
  const podiumIcon = (i: number) =>
    i === 0 ? <Crown className="w-4 h-4 text-yellow-400" /> :
    i === 1 ? <Medal className="w-4 h-4 text-slate-300" /> :
    i === 2 ? <Medal className="w-4 h-4 text-amber-700" /> : null;

  return (
    <DashboardLayout title="Leaderboard">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" /> Leaderboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">See who's leading the pack</p>
          </div>
        </div>

        <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
          <TabsList className="bg-muted/40">
            {categories.map((c) => {
              const Icon = CATEGORY_META[c].icon;
              return (
                <TabsTrigger key={c} value={c} className="text-xs">
                  <Icon className="w-3.5 h-3.5 mr-1.5" /> {CATEGORY_META[c].label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((c) => (
            <TabsContent key={c} value={c} className="mt-4">
              <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
                <TabsList className="bg-muted/40 mb-4">
                  <TabsTrigger value="week" className="text-xs">This Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">This Month</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">All-Time</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="glass rounded-xl overflow-hidden">
                {rowsLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
                ) : rows.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">No activity yet for this range.</div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {rows.map((r, i) => (
                      <li key={r.roblox_user_id} className={`flex items-center gap-3 px-5 py-3 transition-colors ${i < 3 ? "bg-primary/[0.03]" : ""} hover:bg-secondary/30`}>
                        <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                        {avatars[r.roblox_user_id] ? (
                          <img src={avatars[r.roblox_user_id]} alt="" className="w-9 h-9 rounded-full" crossOrigin="anonymous" />
                        ) : (
                          <RobloxAvatar username={r.roblox_username} userId={r.roblox_user_id} className="w-9 h-9 rounded-full" />
                        )}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{r.roblox_username}</span>
                          {podiumIcon(i)}
                        </div>
                        <span className="text-sm font-bold text-foreground tabular-nums">
                          {r.value.toLocaleString()} {meta.unit && <span className="text-xs text-muted-foreground font-normal ml-1">{meta.unit}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
