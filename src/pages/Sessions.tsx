import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Plus, Clock, User, Users, Loader2, Trash2, UserPlus, UserMinus, GraduationCap } from "lucide-react";
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
  description: string | null;
  recurring_days: string[] | null;
  recurring_time: string | null;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary", active: "bg-success/10 text-success",
  completed: "bg-muted text-muted-foreground", cancelled: "bg-destructive/10 text-destructive",
};
const categoryColors: Record<string, string> = {
  Training: "bg-warning/10 text-warning", Event: "bg-accent/10 text-accent",
  Shift: "bg-success/10 text-success",
};

const CATEGORIES = ["Shift", "Training", "Event"] as const;

function RoleSlot({
  label, icon: Icon, name, canAssignSelf, canAssignOthers, onAssignSelf, onUnassign, onAssignOther,
}: {
  label: string; icon: any; name: string | null;
  canAssignSelf: boolean; canAssignOthers: boolean;
  onAssignSelf: () => void; onUnassign: () => void; onAssignOther: (name: string) => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const [otherName, setOtherName] = useState("");

  return (
    <div className="glass rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      {name ? (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{name}</span>
          {(canAssignSelf || canAssignOthers) && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={onUnassign}>
              <UserMinus className="w-3 h-3 mr-1" /> Remove
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground italic">Unassigned</p>
          <div className="flex gap-2 flex-wrap">
            {canAssignSelf && (
              <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={onAssignSelf}>
                <UserPlus className="w-3 h-3 mr-1" /> Assign Myself
              </Button>
            )}
            {canAssignOthers && !assigning && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAssigning(true)}>
                <Users className="w-3 h-3 mr-1" /> Assign Other
              </Button>
            )}
          </div>
          {assigning && canAssignOthers && (
            <div className="flex gap-2">
              <Input
                placeholder="Roblox username"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
                className="bg-muted border-border h-8 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter" && otherName.trim()) { onAssignOther(otherName.trim()); setOtherName(""); setAssigning(false); } }}
              />
              <Button variant="hero" size="sm" className="h-8 text-xs" disabled={!otherName.trim()}
                onClick={() => { onAssignOther(otherName.trim()); setOtherName(""); setAssigning(false); }}>
                Assign
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sessions() {
  const { workspaceId, workspace } = useWorkspace();
  const { user, robloxUsername } = useAuth();
  const { hasPermission, canCreateSession, canHostSession, isOwner } = usePermissions();
  const canCreateAny = CATEGORIES.some(c => canCreateSession(c));
  const canManageMembers = hasPermission("manage_members");

  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailSession, setDetailSession] = useState<ScheduledSession | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Shift");
  const [recurring, setRecurring] = useState("none");
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringTime, setRecurringTime] = useState("15:00");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [description, setDescription] = useState("");

  const roleLabels = (workspace as any)?.session_role_labels ?? { host: "Host", co_host: "Co-Host", trainer: "Trainer" };

  const fetchSessions = async () => {
    const { data } = await supabase.from("scheduled_sessions").select("*")
      .eq("workspace_id", workspaceId).order("scheduled_at", { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  // Check for sessions starting within 5 minutes and send Discord reminders
  const checkAndSendReminders = async (sessionList: ScheduledSession[]) => {
    const now = Date.now();
    const fiveMinFromNow = now + 5 * 60 * 1000;
    const upcoming = sessionList.filter(s => {
      const t = new Date(s.scheduled_at).getTime();
      return s.status === "scheduled" && t > now && t <= fiveMinFromNow;
    });

    for (const s of upcoming) {
      const reminderKey = `discord_reminded_${s.id}`;
      if (sessionStorage.getItem(reminderKey)) continue;
      sessionStorage.setItem(reminderKey, "1");

      supabase.functions.invoke("discord-notify", {
        body: {
          action: "send_reminder",
          workspace_id: workspaceId,
          session_title: s.title,
          session_time: s.scheduled_at,
          host_name: s.host_name,
          category: s.category,
        },
      }).then(res => {
        if (res.data?.success) console.log("Discord reminder sent for:", s.title);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    fetchSessions();
    const channel = supabase.channel(`sessions-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_sessions", filter: `workspace_id=eq.${workspaceId}` }, () => fetchSessions())
      .subscribe();

    // Check for reminders every 60 seconds
    const reminderInterval = setInterval(() => {
      if (sessions.length > 0) checkAndSendReminders(sessions);
    }, 60_000);

    return () => { supabase.removeChannel(channel); clearInterval(reminderInterval); };
  }, [workspaceId]);

  const handleCreate = async () => {
    if (!title.trim() || !user) return;
    if (!canCreateSession(category)) { toast.error(`No permission to create ${category}s`); return; }

    const isWeekly = recurring === "weekly_days";
    if (!isWeekly && !scheduledAt) {
      toast.error("Please pick a date & time");
      return;
    }
    if (isWeekly && recurringDays.length === 0) {
      toast.error("Pick at least one weekday");
      return;
    }

    setCreating(true);

    // Compute first occurrence for weekly_days based on the next matching day at the chosen time
    let firstOccurrence: Date;
    if (isWeekly) {
      const [hh, mm] = recurringTime.split(":").map(Number);
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const targetDays = recurringDays.map((d) => dayMap[d]).sort((a, b) => a - b);
      const now = new Date();
      let candidate: Date | null = null;
      for (let i = 0; i < 14; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        d.setHours(hh, mm, 0, 0);
        if (targetDays.includes(d.getDay()) && d.getTime() > now.getTime()) {
          candidate = d;
          break;
        }
      }
      firstOccurrence = candidate ?? new Date(Date.now() + 60_000);
    } else {
      firstOccurrence = new Date(scheduledAt);
    }

    const insertPayload: any = {
      workspace_id: workspaceId, title: title.trim(), category,
      scheduled_at: firstOccurrence.toISOString(),
      duration_minutes: parseInt(duration) || 60,
      host_name: "Unassigned", host_id: user.id,
      description: description.trim() || null,
      recurring: recurring === "none" ? null : (isWeekly ? "weekly" : recurring),
      recurring_days: isWeekly ? recurringDays : null,
      recurring_time: isWeekly ? recurringTime : null,
    };

    const { error } = await supabase.from("scheduled_sessions").insert(insertPayload);
    if (error) {
      toast.error("Failed: " + error.message);
      setCreating(false);
      return;
    }

    toast.success("Session scheduled!");

    // Fire Discord webhook (non-blocking)
    supabase.functions.invoke("discord-notify", {
      body: {
        action: "session_created",
        workspace_id: workspaceId,
        session_title: title.trim(),
        session_time: firstOccurrence.toISOString(),
        host_name: "TBA",
        category,
        recurring: insertPayload.recurring,
        recurring_days: insertPayload.recurring_days,
        recurring_time: insertPayload.recurring_time,
        description: description.trim() || undefined,
      },
    }).then((res) => {
      if (res.error) console.warn("Discord notify failed:", res.error);
    }).catch(() => {});

    setDialogOpen(false);
    setTitle(""); setDescription(""); setScheduledAt("");
    setRecurringDays([]); setRecurring("none");
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("scheduled_sessions").delete().eq("id", id);
    if (detailSession?.id === id) setDetailSession(null);
    fetchSessions();
  };

  const assignRole = async (sessionId: string, role: "host_name" | "co_host_name" | "trainer_name", name: string | null) => {
    const updateData: Record<string, string | null> = {};
    updateData[role] = name;
    const { error } = await supabase.from("scheduled_sessions")
      .update(updateData as any)
      .eq("id", sessionId);
    if (error) toast.error("Failed to update: " + error.message);
    else {
      toast.success(name ? `${name} assigned!` : "Unassigned");
      fetchSessions();
      // Update detail view
      if (detailSession?.id === sessionId) {
        setDetailSession(prev => prev ? { ...prev, [role]: name } : null);
      }
    }
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

  const allowedCategories = CATEGORIES.filter(c => canCreateSession(c));

  const canSelfAssign = (session: ScheduledSession) => canHostSession(session.category);

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
                    <Input placeholder="e.g. Morning Shift" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Description <span className="text-muted-foreground">(optional)</span></Label>
                    <Input placeholder="Brief description..." value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted border-border" />
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
                          <SelectItem value="weekly">Weekly (same day)</SelectItem>
                          <SelectItem value="weekly_days">Weekly (pick days)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {recurring === "weekly_days" ? (
                    <div className="space-y-3 rounded-lg border border-border/40 bg-muted/40 p-3">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Repeat on</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {WEEKDAYS.map((d) => {
                            const active = recurringDays.includes(d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setRecurringDays((prev) => active ? prev.filter((x) => x !== d) : [...prev, d])}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Time</Label>
                          <Input type="time" value={recurringTime} onChange={(e) => setRecurringTime(e.target.value)} className="bg-muted border-border" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Duration (min)</Label>
                          <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-muted border-border" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Will repeat every chosen weekday at {recurringTime}.</p>
                    </div>
                  ) : (
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
                  )}

                  <p className="text-xs text-muted-foreground">{roleLabels.host}, {roleLabels.co_host} and {roleLabels.trainer} can be assigned after creation. Discord webhook (if configured) will announce this session.</p>
                  <Button variant="hero" className="w-full" onClick={handleCreate} disabled={creating || !title.trim() || (recurring !== "weekly_days" && !scheduledAt) || (recurring === "weekly_days" && recurringDays.length === 0)}>
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
              <div
                key={session.id}
                className="glass rounded-xl p-5 flex items-start gap-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setDetailSession(session)}
              >
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
                    <span className={`flex items-center gap-1 ${session.host_name === "Unassigned" ? "text-muted-foreground italic" : "text-foreground"}`}>
                      <User className="w-3 h-3 text-primary" /> {session.host_name}
                    </span>
                    {session.co_host_name && (
                      <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-3 h-3" /> {session.co_host_name}</span>
                    )}
                    {session.trainer_name && (
                      <span className="flex items-center gap-1 text-muted-foreground"><GraduationCap className="w-3 h-3" /> {session.trainer_name}</span>
                    )}
                    {(!session.co_host_name || !session.trainer_name || session.host_name === "Unassigned") && (
                      <span className="text-[10px] text-primary font-medium">Click to assign roles</span>
                    )}
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Detail Dialog */}
      <Dialog open={!!detailSession} onOpenChange={(open) => { if (!open) setDetailSession(null); }}>
        <DialogContent className="glass border-border/40 max-w-md">
          {detailSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[detailSession.category] || "bg-secondary text-muted-foreground"}`}>
                    {detailSession.category}
                  </span>
                  {detailSession.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDate(detailSession.scheduled_at)}</span>
                  <span>{detailSession.duration_minutes} min</span>
                </div>
                {detailSession.description && (
                  <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">{detailSession.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[detailSession.status]}`}>
                    {detailSession.status}
                  </span>
                  {detailSession.recurring && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                      Repeats {detailSession.recurring}
                    </span>
                  )}
                </div>

                <div className="border-t border-border/40 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Roles</p>

                  <RoleSlot
                    label="Host"
                    icon={User}
                    name={detailSession.host_name === "Unassigned" ? null : detailSession.host_name}
                    canAssignSelf={canSelfAssign(detailSession)}
                    canAssignOthers={isOwner || canManageMembers}
                    onAssignSelf={() => assignRole(detailSession.id, "host_name", robloxUsername || "Unknown")}
                    onUnassign={() => assignRole(detailSession.id, "host_name", "Unassigned")}
                    onAssignOther={(name) => assignRole(detailSession.id, "host_name", name)}
                  />

                  <RoleSlot
                    label="Co-Host"
                    icon={Users}
                    name={detailSession.co_host_name}
                    canAssignSelf={canSelfAssign(detailSession)}
                    canAssignOthers={isOwner || canManageMembers}
                    onAssignSelf={() => assignRole(detailSession.id, "co_host_name", robloxUsername || "Unknown")}
                    onUnassign={() => assignRole(detailSession.id, "co_host_name", null)}
                    onAssignOther={(name) => assignRole(detailSession.id, "co_host_name", name)}
                  />

                  <RoleSlot
                    label="Trainer"
                    icon={GraduationCap}
                    name={detailSession.trainer_name}
                    canAssignSelf={canSelfAssign(detailSession)}
                    canAssignOthers={isOwner || canManageMembers}
                    onAssignSelf={() => assignRole(detailSession.id, "trainer_name", robloxUsername || "Unknown")}
                    onUnassign={() => assignRole(detailSession.id, "trainer_name", null)}
                    onAssignOther={(name) => assignRole(detailSession.id, "trainer_name", name)}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
