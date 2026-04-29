import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { PremiumGate } from "@/components/PremiumGate";
import { Loader2, MessageSquare, Search, ShieldOff } from "lucide-react";

interface LogRow {
  id: string;
  roblox_username: string | null;
  roblox_user_id: string;
  created_at: string;
  event_data: any;
}

export default function MessageLogs() {
  const { workspaceId, workspace } = useWorkspace();
  const { hasPermission, isOwner, loading: permLoading } = usePermissions();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const allowed = isOwner || hasPermission("view_message_logs");

  useEffect(() => {
    if (!workspaceId || !allowed) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("activity_events")
        .select("id, roblox_username, roblox_user_id, created_at, event_data")
        .eq("workspace_id", workspaceId)
        .eq("event_type", "chat_message")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data as any) || []);
      setLoading(false);
    };
    load();
  }, [workspaceId, allowed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => {
      const u = (r.roblox_username || "").toLowerCase();
      const c = String(r.event_data?.content || "").toLowerCase();
      return u.includes(q) || c.includes(q);
    });
  }, [rows, query]);

  if (permLoading) {
    return <DashboardLayout title="Message Logs"><div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></DashboardLayout>;
  }

  if (!workspace?.premium) {
    return (
      <DashboardLayout title="Message Logs">
        <div className="py-10">
          <PremiumGate
            feature="Message Logs"
            description="In-game chat logging keeps a 30-day searchable history of every staff message in your servers. Unlock with the Fluxcore Premium gamepass."
          />
        </div>
      </DashboardLayout>
    );
  }

  if (!allowed) {
    return (
      <DashboardLayout title="Message Logs">
        <div className="glass rounded-xl p-10 text-center max-w-md mx-auto">
          <ShieldOff className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">No access</h2>
          <p className="text-sm text-muted-foreground mt-1">You need the <span className="text-foreground">View Message Logs</span> permission.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Message Logs">
      <div className="space-y-4 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Message Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">In-game chat messages logged by your workspace.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by username or message…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-muted border-border"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {rows.length === 0
                ? "No messages logged yet. Enable Message Logger in Settings and have staff send messages in-game."
                : "No messages match your search."}
            </p>
          </div>
        ) : (
          <div className="glass rounded-xl divide-y divide-border/40">
            {filtered.map(r => (
              <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-foreground">{r.roblox_username || "Unknown"}</span>
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-1 break-words">
                    {r.event_data?.content || <span className="italic text-muted-foreground">(empty)</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
