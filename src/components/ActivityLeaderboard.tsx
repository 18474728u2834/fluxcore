import { Trophy, Clock, TrendingUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

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

  return (
    <div className="space-y-4">
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {leaderboard.slice(0, 3).map((user, i) => (
            <div key={user.roblox_user_id} className="glass-hover rounded-xl p-5 text-center space-y-3">
              <div className="flex justify-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${i === 0 ? "bg-warning/10" : "bg-secondary"}`}>
                  <Trophy className={`w-5 h-5 ${rankStyles[i + 1] || "text-muted-foreground"}`} />
                </div>
              </div>
              <div>
                <p className="font-bold text-foreground">{user.roblox_username}</p>
                <p className="text-2xl font-extrabold text-gradient mt-1">{formatTime(user.totalSeconds)}</p>
              </div>
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {user.sessions} sessions</span>
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
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                {user.roblox_username.charAt(0)}
              </div>
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
