import { Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

interface ActivityEvent {
  id: string;
  event_type: string;
  roblox_username: string | null;
  event_data: any;
  created_at: string;
}

export function ActivityLog() {
  const { workspaceId } = useWorkspace();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("activity_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
    const channel = supabase
      .channel(`activity-log-${workspaceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events", filter: `workspace_id=eq.${workspaceId}` }, () => {
        fetchEvents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
      </div>
      {events.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No activity yet. Events from the tracker will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {events.map((ev) => (
            <div key={ev.id} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium text-primary">{ev.event_type}</span>{" "}
                  {ev.roblox_username && <span className="font-medium">— {ev.roblox_username}</span>}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(ev.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
