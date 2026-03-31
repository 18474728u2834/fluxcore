import { Clock, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

interface Session {
  id: string;
  roblox_username: string;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number | null;
  server_id: string | null;
}

function formatDuration(seconds: number | null, joinedAt: string, leftAt: string | null): string {
  if (seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  if (!leftAt) {
    const diff = Math.floor((Date.now() - new Date(joinedAt).getTime()) / 60000);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return h > 0 ? `${h}h ${m}m+` : `${m}m+`;
  }
  return "—";
}

export function RecentSessions() {
  const { workspaceId } = useWorkspace();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("activity_sessions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: false })
      .limit(20);
    setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
    const channel = supabase
      .channel(`recent-sessions-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_sessions", filter: `workspace_id=eq.${workspaceId}` }, () => {
        fetchSessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  if (loading) {
    return <div className="glass rounded-xl p-8 flex justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;
  }

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Recent Sessions
        </h3>
        <span className="text-xs text-muted-foreground">{sessions.filter(s => !s.left_at).length} active now</span>
      </div>
      {sessions.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {sessions.map((session) => {
            const active = !session.left_at;
            return (
              <div key={session.id} className="px-5 py-3 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                    {session.roblox_username.charAt(0)}
                  </div>
                  {active && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{session.roblox_username}</p>
                    {active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium">LIVE</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{formatTime(session.joined_at)}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{session.left_at ? formatTime(session.left_at) : "Now"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{formatDuration(session.duration_seconds, session.joined_at, session.left_at)}</p>
                  {session.server_id && <p className="text-xs text-muted-foreground">Server {session.server_id.slice(0, 6)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
