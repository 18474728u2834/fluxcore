import { Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

interface EventRow {
  id: string;
  event_type: string;
  roblox_username: string | null;
  roblox_user_id: string;
  event_data: any;
  created_at: string;
}

export function ActivityEvents() {
  const { workspaceId } = useWorkspace();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("activity_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
    const channel = supabase
      .channel(`events-${workspaceId}`)
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
    return <div className="glass rounded-xl p-8 flex justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/40">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Event Logs
        </h3>
      </div>
      {events.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No events logged yet. Events from the tracker will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {events.map((event) => (
            <div key={event.id} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
                    {event.event_type}
                  </span>
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{event.roblox_username || event.roblox_user_id}</span>
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(event.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
