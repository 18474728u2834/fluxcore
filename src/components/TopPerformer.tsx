import { Crown, Loader2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { RobloxAvatar } from "@/components/RobloxAvatar";

interface TopEntry {
  roblox_username: string;
  roblox_user_id: string;
  totalSeconds: number;
  sessions: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getDay(); // 0 Sun .. 6 Sat — week starts Monday
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function TopPerformer() {
  const { workspaceId } = useWorkspace();
  const [top, setTop] = useState<TopEntry | null>(null);
  const [runners, setRunners] = useState<TopEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("activity_sessions")
        .select("roblox_username, roblox_user_id, duration_seconds")
        .eq("workspace_id", workspaceId)
        .eq("discarded", false)
        .gte("joined_at", startOfWeekIso())
        .not("duration_seconds", "is", null);

      const map = new Map<string, TopEntry>();
      for (const row of data || []) {
        const key = row.roblox_user_id;
        const existing = map.get(key);
        if (existing) {
          existing.totalSeconds += row.duration_seconds || 0;
          existing.sessions += 1;
        } else {
          map.set(key, {
            roblox_username: row.roblox_username,
            roblox_user_id: row.roblox_user_id,
            totalSeconds: row.duration_seconds || 0,
            sessions: 1,
          });
        }
      }
      const sorted = Array.from(map.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
      setTop(sorted[0] || null);
      setRunners(sorted.slice(1, 4));
      setLoading(false);
    };
    load();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (!top) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-4 h-4 text-warning" />
          <h3 className="font-semibold text-foreground text-sm">Top Performer (this week)</h3>
        </div>
        <p className="text-sm text-muted-foreground">No activity recorded yet this week.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 space-y-4 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-warning/10 blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-warning" />
          <h3 className="font-semibold text-foreground text-sm">Top Performer (this week)</h3>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium">WEEKLY</span>
      </div>

      <div className="flex items-center gap-4 relative">
        <div className="relative">
          <RobloxAvatar username={top.roblox_username} userId={top.roblox_user_id} className="w-14 h-14" />
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center shadow-lg">
            <Crown className="w-3 h-3 text-warning-foreground" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{top.roblox_username}</p>
          <p className="text-2xl font-extrabold text-gradient">{formatTime(top.totalSeconds)}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {top.sessions} sessions
          </p>
        </div>
      </div>

      {runners.length > 0 && (
        <div className="border-t border-border/50 pt-3 space-y-2">
          {runners.map((r, i) => (
            <div key={r.roblox_user_id} className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground w-5">#{i + 2}</span>
              <RobloxAvatar username={r.roblox_username} userId={r.roblox_user_id} className="w-7 h-7" />
              <p className="text-sm text-foreground flex-1 truncate">{r.roblox_username}</p>
              <p className="text-xs font-medium text-foreground">{formatTime(r.totalSeconds)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
