import { Trophy, Clock, TrendingUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { RobloxAvatar } from "@/components/RobloxAvatar";

interface LeaderboardEntry {
  roblox_username: string;
  roblox_user_id: string;
  totalSeconds: number;
  sessions: number;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const rankStyles: Record<number, string> = {
  1: "text-warning",
  2: "text-muted-foreground",
  3: "text-orange-400",
};

export function ActivityLeaderboard() {
  const { workspaceId } = useWorkspace();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("activity_sessions")
        .select("roblox_username, roblox_user_id, duration_seconds")
        .eq("workspace_id", workspaceId)
        .not("duration_seconds", "is", null);

      const map = new Map<string, LeaderboardEntry>();
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
      setLeaderboard(sorted);
      setLoading(false);
    };
    fetch();
  }, [workspaceId]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;
  }

  if (leaderboard.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No activity data yet. Install the tracker to start recording sessions.</p>
      </div>
    );
  }

  const top = leaderboard.slice(0, 3);
  // Display order: 2nd, 1st, 3rd — with 1st raised, 3rd lowest
  const podium = [
    top[1] && { entry: top[1], rank: 2, offset: "sm:mt-12", scale: "", avatarSize: "w-16 h-16", nameSize: "text-base", timeSize: "text-2xl", ring: "ring-1 ring-muted-foreground/30" },
    top[0] && { entry: top[0], rank: 1, offset: "sm:-mt-4", scale: "", avatarSize: "w-20 h-20", nameSize: "text-lg", timeSize: "text-3xl", ring: "ring-2 ring-warning/60 shadow-[0_0_40px_-6px_hsl(var(--warning)/0.6)]" },
    top[2] && { entry: top[2], rank: 3, offset: "sm:mt-20", scale: "", avatarSize: "w-16 h-16", nameSize: "text-base", timeSize: "text-2xl", ring: "ring-1 ring-orange-400/30" },
  ].filter(Boolean) as Array<{ entry: LeaderboardEntry; rank: number; offset: string; scale: string; avatarSize: string; nameSize: string; timeSize: string; ring: string }>;

  return (
    <div className="space-y-8">
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 items-end pt-6 px-2 sm:px-4">
          {podium.map(({ entry, rank, offset, scale, avatarSize, nameSize, timeSize, ring }) => (
            <div
              key={entry.roblox_user_id}
              className={`glass-hover rounded-2xl p-6 sm:p-8 text-center space-y-4 transition-transform ${offset} ${scale} ${ring}`}
            >
              <div className="flex justify-center">
                <div className="relative">
                  <RobloxAvatar
                    username={entry.roblox_username}
                    userId={entry.roblox_user_id}
                    className={`${avatarSize} rounded-full ring-2 ring-border/40`}
                  />
                  <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center ${rank === 1 ? "bg-warning" : rank === 2 ? "bg-muted-foreground" : "bg-orange-400"}`}>
                    <Trophy className="w-3.5 h-3.5 text-background" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className={`font-bold text-foreground ${nameSize}`}>{entry.roblox_username}</p>
                <p className={`font-extrabold text-gradient ${timeSize}`}>{formatTime(entry.totalSeconds)}</p>
                <p className={`text-xs font-bold ${rankStyles[rank]}`}>#{rank}</p>
              </div>
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {entry.sessions} sessions</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Activity Leaderboard
          </h3>
        </div>
        <div className="divide-y divide-border/40">
          {leaderboard.map((user, i) => (
            <div key={user.roblox_user_id} className="px-5 py-3 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
              <span className={`text-sm font-bold w-6 text-center ${rankStyles[i + 1] || "text-muted-foreground"}`}>
                #{i + 1}
              </span>
              <RobloxAvatar
                username={user.roblox_username}
                userId={user.roblox_user_id}
                className="w-9 h-9 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.roblox_username}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{formatTime(user.totalSeconds)}</p>
                <p className="text-xs text-muted-foreground">{user.sessions} sessions</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
