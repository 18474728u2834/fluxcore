import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Plus, Clock, User, Users, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface ScheduledSession {
  id: string; title: string; category: string; scheduled_at: string;
  duration_minutes: number; host_name: string; co_host_name: string | null;
  trainer_name: string | null; status: string; recurring: string | null;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary", active: "bg-success/10 text-success",
  completed: "bg-muted text-muted-foreground", cancelled: "bg-destructive/10 text-destructive",
};
const categoryColors: Record<string, string> = {
  Training: "bg-warning/10 text-warning", Event: "bg-accent/10 text-accent",
  Shift: "bg-success/10 text-success",
};

const CATEGORIES = ["Shift", "Training", "Event"] as const;

export default function Sessions() {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const { hasPermission, canCreateSession, isOwner } = usePermissions();
  const canCreateAny = CATEGORIES.some(c => canCreateSession(c));
  const canDeleteSessions = isOwner;

  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Shift");
  const [recurring, setRecurring] = useState("none");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [hostName, setHostName] = useState("");
  const [coHostName, setCoHostName] = useState("");
  const [trainerName, setTrainerName] = useState("");

  const fetchSessions = async () => {
    const { data } = await supabase.from("scheduled_sessions").select("*")
      .eq("workspace_id", workspaceId).order("scheduled_at", { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
    const channel = supabase.channel(`sessions-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_sessions", filter: `workspace_id=eq.${workspaceId}` }, () => fetchSessions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  const handleCreate = async () => {
    if (!title.trim() || !hostName.trim() || !scheduledAt || !user) return;
    if (!canCreateSession(category)) { toast.error(`You don't have permission to create ${category}s`); return; }
    setCreating(true);
    const { error } = await supabase.from("scheduled_sessions").insert({
      workspace_id: workspaceId, title: title.trim(), category,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: parseInt(duration) || 60,
      host_name: hostName.trim(), host_id: user.id,
      co_host_name: coHostName.trim() || null,
      trainer_name: trainerName.trim() || null,
      recurring: recurring === "none" ? null : recurring,
    });
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success("Session scheduled!");
      setDialogOpen(false);
      setTitle(""); setHostName(""); setCoHostName(""); setTrainerName(""); setScheduledAt("");
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("scheduled_sessions").delete().eq("id", id);
    fetchSessions();
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / 86400000);
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 0) return `Today, ${time}`;
    if (diffDays === 1) return `Tomorrow, ${time}`;
    if (diffDays === -1) return `Yesterday, ${time}`;
    return `${date.toLocaleDateString()} ${time}`;
  };

  // Filter categories user can create
  const allowedCategories = CATEGORIES.filter(c => canCreateSession(c));

  return (
    <DashboardLayout title="Sessions">
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Schedule and manage team events</p>
          </div>
          {canCreateAny && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> New Session</Button>
              </DialogTrigger>
              <DialogContent className="glass border-border/40 max-w-md">
                <DialogHeader><DialogTitle className="text-foreground">Schedule Session</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Title</Label>
                    <Input placeholder="e.g. Shift Training" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted border-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {allowedCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Recurring</Label>
                      <Select value={recurring} onValueChange={setRecurring}>
                        <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">One-time</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Date & Time</Label>
                      <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="bg-muted border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Duration (min)</Label>
                      <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-muted border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Host</Label>
                    <Input placeholder="Username" value={hostName} onChange={(e) => setHostName(e.target.value)} className="bg-muted border-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Co-Host <span className="text-muted-foreground">(opt)</span></Label>
                      <Input placeholder="Username" value={coHostName} onChange={(e) => setCoHostName(e.target.value)} className="bg-muted border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Trainer <span className="text-muted-foreground">(opt)</span></Label>
                      <Input placeholder="Username" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} className="bg-muted border-border" />
                    </div>
                  </div>
                  <Button variant="hero" className="w-full" onClick={handleCreate} disabled={creating || !title.trim() || !hostName.trim() || !scheduledAt}>
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Schedule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No sessions scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="glass rounded-xl p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${categoryColors[session.category] || "bg-secondary text-muted-foreground"}`}>
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm">{session.title}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[session.category] || "bg-secondary text-muted-foreground"}`}>{session.category}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[session.status]}`}>{session.status}</span>
                    {session.recurring && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{session.recurring}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(session.scheduled_at)}</span>
                    <span>{session.duration_minutes}min</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="flex items-center gap-1 text-foreground"><User className="w-3 h-3 text-primary" /> {session.host_name}</span>
                    {session.co_host_name && <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-3 h-3" /> {session.co_host_name}</span>}
                    {session.trainer_name && <span className="text-muted-foreground">Trainer: {session.trainer_name}</span>}
                  </div>
                </div>
                {canDeleteSessions && (
                  <button onClick={() => handleDelete(session.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
