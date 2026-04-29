import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Plus, Clock, User, Users, Loader2, Trash2, UserPlus, UserMinus, ChevronLeft, ChevronRight, History, X, Tag as TagIcon, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface SessionSlot {
  label: string;
  count: number;
  assigned: (string | null)[];
}

interface SessionTag {
  id: string;
  name: string;
  color: string;
  category: string;
}

interface ScheduledSession {
  id: string; title: string; category: string; scheduled_at: string;
  duration_minutes: number; host_name: string; status: string; recurring: string | null;
  description: string | null;
  recurring_days: string[] | null;
  recurring_time: string | null;
  game_url: string | null;
  slots: SessionSlot[] | null;
  tag_ids: string[] | null;
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
const TAG_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#06b6d4", "#a855f7"];

export default function Sessions() {
  const { workspaceId } = useWorkspace();
  const { user, robloxUsername } = useAuth();
  const { hasPermission, canCreateSession, canHostSession, isOwner } = usePermissions();
  const canCreateAny = CATEGORIES.some(c => canCreateSession(c));
  const canManageTags = isOwner || hasPermission("manage_members");

  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [tags, setTags] = useState<SessionTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailSession, setDetailSession] = useState<ScheduledSession | null>(null);
  const [tagsManagerOpen, setTagsManagerOpen] = useState(false);
  const [members, setMembers] = useState<{ roblox_username: string }[]>([]);
  const canAssignOthers = isOwner || hasPermission("manage_members");

  // ---- Create session form state ----
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Shift");
  const [recurring, setRecurring] = useState("none");
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringTime, setRecurringTime] = useState("15:00");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [description, setDescription] = useState("");
  const [gameUrl, setGameUrl] = useState("");
  const [formSlots, setFormSlots] = useState<SessionSlot[]>([
    { label: "Host", count: 1, assigned: [null] },
  ]);
  const [formTagIds, setFormTagIds] = useState<string[]>([]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setScheduledAt("");
    setRecurringDays([]); setRecurring("none");
    setGameUrl("");
    setFormSlots([{ label: "Host", count: 1, assigned: [null] }]);
    setFormTagIds([]);
  };

  // ---- Tags manager state ----
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [newTagCategory, setNewTagCategory] = useState<string>("Shift");

  const fetchSessions = async () => {
    const { data } = await supabase.from("scheduled_sessions").select("*")
      .eq("workspace_id", workspaceId).order("scheduled_at", { ascending: false });
    setSessions((data as any) || []);
    setLoading(false);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from("session_tags").select("*")
      .eq("workspace_id", workspaceId).order("created_at", { ascending: true });
    setTags((data as any) || []);
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from("workspace_members")
      .select("roblox_username").eq("workspace_id", workspaceId).order("roblox_username");
    setMembers((data as any) || []);
  };

  // Discord 5-minute reminder
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
      }).catch(() => {});
    }
  };

  useEffect(() => {
    if (!workspaceId) return;
    fetchSessions();
    fetchTags();
    const channel = supabase.channel(`sessions-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_sessions", filter: `workspace_id=eq.${workspaceId}` }, () => fetchSessions())
      .on("postgres_changes", { event: "*", schema: "public", table: "session_tags", filter: `workspace_id=eq.${workspaceId}` }, () => fetchTags())
      .subscribe();
    const reminderInterval = setInterval(() => {
      if (sessions.length > 0) checkAndSendReminders(sessions);
    }, 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(reminderInterval); };
  }, [workspaceId]);

  // ---- Slot helpers ----
  const updateSlot = (i: number, patch: Partial<SessionSlot>) => {
    setFormSlots(prev => prev.map((s, idx) => {
      if (idx !== i) return s;
      const merged = { ...s, ...patch };
      // resize assigned[] to match count
      if (patch.count !== undefined) {
        const c = Math.max(1, Math.min(20, patch.count));
        const next = [...merged.assigned];
        while (next.length < c) next.push(null);
        next.length = c;
        merged.assigned = next;
        merged.count = c;
      }
      return merged;
    }));
  };
  const addSlot = () => setFormSlots(prev => [...prev, { label: "", count: 1, assigned: [null] }]);
  const removeSlot = (i: number) => setFormSlots(prev => prev.filter((_, idx) => idx !== i));
  const assignToSlot = (slotIdx: number, posIdx: number, name: string | null) => {
    setFormSlots(prev => prev.map((s, i) => {
      if (i !== slotIdx) return s;
      const a = [...s.assigned];
      a[posIdx] = name;
      return { ...s, assigned: a };
    }));
  };

  const handleCreate = async () => {
    if (!title.trim() || !user) return;
    if (!canCreateSession(category)) { toast.error(`No permission to create ${category}s`); return; }

    const validSlots = formSlots.filter(s => s.label.trim().length > 0);
    if (validSlots.length === 0) { toast.error("Add at least one role"); return; }

    const isWeekly = recurring === "weekly_days";
    if (!isWeekly && !scheduledAt) { toast.error("Please pick a date & time"); return; }
    if (isWeekly && recurringDays.length === 0) { toast.error("Pick at least one weekday"); return; }

    setCreating(true);

    let firstOccurrence: Date;
    if (isWeekly) {
      const [hh, mm] = recurringTime.split(":").map(Number);
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const targetDays = recurringDays.map(d => dayMap[d]).sort((a, b) => a - b);
      const now = new Date();
      let candidate: Date | null = null;
      for (let i = 0; i < 14; i++) {
        const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(hh, mm, 0, 0);
        if (targetDays.includes(d.getDay()) && d.getTime() > now.getTime()) { candidate = d; break; }
      }
      firstOccurrence = candidate ?? new Date(Date.now() + 60_000);
    } else {
      firstOccurrence = new Date(scheduledAt);
    }

    // Pick a host_name for backward compat with the old columns / Discord webhook
    const firstAssignee = validSlots.flatMap(s => s.assigned).find(n => n && n.trim()) || "Unassigned";

    const insertPayload: any = {
      workspace_id: workspaceId,
      title: title.trim(),
      category,
      scheduled_at: firstOccurrence.toISOString(),
      duration_minutes: parseInt(duration) || 60,
      host_name: firstAssignee,
      host_id: user.id,
      description: description.trim() || null,
      recurring: recurring === "none" ? null : (isWeekly ? "weekly" : recurring),
      recurring_days: isWeekly ? recurringDays : null,
      recurring_time: isWeekly ? recurringTime : null,
      game_url: gameUrl.trim() || null,
      slots: validSlots.map(s => ({
        label: s.label.trim(),
        count: s.count,
        assigned: s.assigned.map(a => (a && a.trim() ? a.trim() : null)),
      })),
      tag_ids: formTagIds,
    };

    const { error } = await supabase.from("scheduled_sessions").insert(insertPayload);
    if (error) { toast.error("Failed: " + error.message); setCreating(false); return; }

    toast.success("Session scheduled!");

    supabase.functions.invoke("discord-notify", {
      body: {
        action: "session_created",
        workspace_id: workspaceId,
        session_title: title.trim(),
        session_time: firstOccurrence.toISOString(),
        host_name: firstAssignee,
        category,
        recurring: insertPayload.recurring,
        recurring_days: insertPayload.recurring_days,
        recurring_time: insertPayload.recurring_time,
        description: description.trim() || undefined,
      },
    }).catch(() => {});

    setDialogOpen(false);
    resetForm();
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("scheduled_sessions").delete().eq("id", id);
    if (detailSession?.id === id) setDetailSession(null);
    fetchSessions();
  };

  // ---- Tag CRUD ----
  const addTag = async () => {
    if (!newTagName.trim()) return;
    const { error } = await supabase.from("session_tags").insert({
      workspace_id: workspaceId,
      name: newTagName.trim(),
      color: newTagColor,
      category: newTagCategory,
    });
    if (error) toast.error(error.message);
    else { setNewTagName(""); fetchTags(); }
  };
  const deleteTag = async (id: string) => {
    await supabase.from("session_tags").delete().eq("id", id);
    fetchTags();
  };

  // ---- Detail view: assign to slot ----
  const updateSessionSlots = async (session: ScheduledSession, nextSlots: SessionSlot[]) => {
    const firstAssignee = nextSlots.flatMap(s => s.assigned).find(n => n && n.trim()) || "Unassigned";
    const { error } = await supabase.from("scheduled_sessions")
      .update({ slots: nextSlots, host_name: firstAssignee } as any)
      .eq("id", session.id);
    if (error) toast.error(error.message);
    else {
      setDetailSession({ ...session, slots: nextSlots, host_name: firstAssignee });
      fetchSessions();
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
  const tagsForCategory = useMemo(() => tags.filter(t => t.category === category), [tags, category]);
  const tagsById = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);

  // ---- Week strip / day expansion (unchanged) ----
  const [selectedDate, setSelectedDate] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0); return d;
  });
  const [showHistory, setShowHistory] = useState(false);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
  }), [weekStart]);
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const dayOccurrences = useMemo(() => {
    const dayKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][selectedDate.getDay()];
    const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);
    const out: { session: ScheduledSession; occursAt: Date }[] = [];
    for (const s of sessions) {
      if (s.recurring_days?.length && s.recurring_time) {
        if (!s.recurring_days.includes(dayKey)) continue;
        const [hh, mm] = s.recurring_time.split(":").map(Number);
        const occ = new Date(selectedDate); occ.setHours(hh || 0, mm || 0, 0, 0);
        out.push({ session: s, occursAt: occ });
      } else if (s.recurring === "weekly") {
        const base = new Date(s.scheduled_at);
        if (base.getDay() !== selectedDate.getDay()) continue;
        const occ = new Date(selectedDate); occ.setHours(base.getHours(), base.getMinutes(), 0, 0);
        if (occ < base) continue;
        out.push({ session: s, occursAt: occ });
      } else if (s.recurring === "daily") {
        const base = new Date(s.scheduled_at);
        const occ = new Date(selectedDate); occ.setHours(base.getHours(), base.getMinutes(), 0, 0);
        if (occ < base) continue;
        out.push({ session: s, occursAt: occ });
      } else {
        const base = new Date(s.scheduled_at);
        if (base >= startOfDay && base <= endOfDay) out.push({ session: s, occursAt: base });
      }
    }
    out.sort((a, b) => a.occursAt.getTime() - b.occursAt.getTime());
    return out;
  }, [sessions, selectedDate]);

  const filteredOccurrences = useMemo(() => {
    const now = Date.now();
    return dayOccurrences.filter(({ session, occursAt }) => {
      const end = occursAt.getTime() + (session.duration_minutes || 60) * 60_000;
      const isPast = end < now;
      return showHistory ? isPast : !isPast;
    });
  }, [dayOccurrences, showHistory]);

  const today = new Date();
  const isToday = isSameDay(selectedDate, today);
  const dayHeader = isToday ? "Today" : selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const shiftWeek = (delta: number) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + delta * 7); setWeekStart(d); };
  const computeStatus = (session: ScheduledSession, occursAt: Date) => {
    const now = Date.now();
    const start = occursAt.getTime();
    const end = start + (session.duration_minutes || 60) * 60_000;
    if (now >= start && now <= end) return { live: true, label: "In Progress" };
    if (now > end) return { live: false, label: "Completed" };
    return { live: false, label: "Scheduled" };
  };

  return (
    <DashboardLayout title="Sessions">
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Plan, schedule, and manage sessions for your group</p>
        </div>

        {/* Week strip */}
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => shiftWeek(-1)} className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-secondary/40 transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
          <div className="flex gap-2">
            {weekDays.map(d => {
              const active = isSameDay(d, selectedDate);
              const isTodayPill = isSameDay(d, today);
              return (
                <button key={d.toISOString()} onClick={() => setSelectedDate(d)}
                  className={`min-w-[58px] px-3 py-2 rounded-lg flex flex-col items-center transition-all ${active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "glass hover:bg-secondary/40"}`}>
                  <span className={`text-[10px] font-bold tracking-wider ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}
                  </span>
                  <span className={`text-base font-bold ${active ? "text-primary-foreground" : isTodayPill ? "text-primary" : "text-foreground"}`}>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => shiftWeek(1)} className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-secondary/40 transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {/* Day header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">{dayHeader}</h2>
            <Button variant={showHistory ? "secondary" : "ghost"} size="sm" onClick={() => setShowHistory(!showHistory)} className="h-8 text-xs">
              <History className="w-3.5 h-3.5 mr-1.5" />{showHistory ? "Show Upcoming" : "Show History"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {canManageTags && (
              <Button variant="ghost" size="sm" onClick={() => setTagsManagerOpen(true)}>
                <TagIcon className="w-3.5 h-3.5 mr-1.5" /> Manage Tags
              </Button>
            )}
            {canCreateAny && (
              <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> New Session</Button>
                </DialogTrigger>
                <DialogContent className="glass border-border/40 max-w-lg max-h-[90vh] overflow-y-auto">
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
                        <Select value={category} onValueChange={(v) => { setCategory(v); setFormTagIds([]); }}>
                          <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>{allowedCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
                            {WEEKDAYS.map(d => {
                              const active = recurringDays.includes(d);
                              return (
                                <button key={d} type="button"
                                  onClick={() => setRecurringDays(prev => active ? prev.filter(x => x !== d) : [...prev, d])}
                                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>{d}</button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2"><Label className="text-xs">Time</Label><Input type="time" value={recurringTime} onChange={(e) => setRecurringTime(e.target.value)} className="bg-muted border-border" /></div>
                          <div className="space-y-2"><Label className="text-xs">Duration (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-muted border-border" /></div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2"><Label className="text-sm">Date & Time</Label><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="bg-muted border-border" /></div>
                        <div className="space-y-2"><Label className="text-sm">Duration (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-muted border-border" /></div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm">Game link <span className="text-muted-foreground">(optional)</span></Label>
                      <Input placeholder="https://www.roblox.com/games/123/..." value={gameUrl} onChange={(e) => setGameUrl(e.target.value)} className="bg-muted border-border" />
                    </div>

                    {/* Inline Roles Builder */}
                    <div className="rounded-lg border border-border/40 bg-muted/40 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Session roles</Label>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addSlot}>
                          <Plus className="w-3 h-3 mr-1" /> Add role
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {formSlots.map((slot, i) => (
                          <div key={i} className="rounded-md bg-muted/60 border border-border/30 p-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input placeholder="Role name (e.g. Trainer)" value={slot.label}
                                onChange={(e) => updateSlot(i, { label: e.target.value })}
                                className="bg-background/50 border-border h-8 text-xs flex-1" />
                              <Input type="number" min={1} max={20} value={slot.count}
                                onChange={(e) => updateSlot(i, { count: parseInt(e.target.value) || 1 })}
                                className="bg-background/50 border-border h-8 text-xs w-16" />
                              <span className="text-[10px] text-muted-foreground">slots</span>
                              <button type="button" onClick={() => removeSlot(i)} className="text-muted-foreground hover:text-destructive p-1">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pl-1">
                              {slot.assigned.map((name, posIdx) => {
                                const isMe = name && robloxUsername && name.toLowerCase() === robloxUsername.toLowerCase();
                                return (
                                  <div key={posIdx} className="flex items-center gap-1">
                                    {name ? (
                                      <span className={`text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-1 ${isMe ? "bg-primary/20 text-primary" : "bg-secondary text-foreground"}`}>
                                        {name}
                                        <button type="button" onClick={() => assignToSlot(i, posIdx, null)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                                      </span>
                                    ) : (
                                      <button type="button"
                                        onClick={() => assignToSlot(i, posIdx, robloxUsername || "")}
                                        disabled={!robloxUsername}
                                        className="text-[10px] px-2 py-1 rounded-full font-medium border border-dashed border-border/60 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                                        + Assign me
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tag Picker */}
                    <div className="rounded-lg border border-border/40 bg-muted/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags <span className="normal-case text-[10px]">({category} only)</span></Label>
                        {canManageTags && (
                          <button type="button" onClick={() => setTagsManagerOpen(true)} className="text-[10px] text-primary hover:underline">+ New tag</button>
                        )}
                      </div>
                      {tagsForCategory.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">No tags for {category}. {canManageTags ? "Create one above." : ""}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {tagsForCategory.map(t => {
                            const active = formTagIds.includes(t.id);
                            return (
                              <button key={t.id} type="button"
                                onClick={() => setFormTagIds(prev => active ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                                className={`text-[11px] px-2 py-1 rounded-md font-semibold transition-all ${active ? "ring-2 ring-primary/60" : "opacity-70 hover:opacity-100"}`}
                                style={{ backgroundColor: t.color + "30", color: t.color }}>
                                {t.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <Button variant="hero" className="w-full" onClick={handleCreate} disabled={creating || !title.trim() || (recurring !== "weekly_days" && !scheduledAt) || (recurring === "weekly_days" && recurringDays.length === 0)}>
                      {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Schedule
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Sessions grid */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : filteredOccurrences.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{showHistory ? "No past sessions for this day." : "No sessions scheduled for this day."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredOccurrences.map(({ session, occursAt }) => {
              const status = computeStatus(session, occursAt);
              const firstAssignee = (session.slots || []).flatMap(s => s.assigned).find(n => n) || (session.host_name !== "Unassigned" ? session.host_name : null);
              const sessionTags = (session.tag_ids || []).map(id => tagsById[id]).filter(Boolean);
              return (
                <button key={`${session.id}-${occursAt.getTime()}`} onClick={() => setDetailSession(session)}
                  className="glass rounded-xl p-4 text-left flex flex-col gap-2 hover:bg-secondary/30 transition-colors border border-border/30 hover:border-primary/40 group relative">
                  {firstAssignee && (
                    <img
                      src={`https://www.roblox.com/headshot-thumbnail/image?username=${encodeURIComponent(firstAssignee)}&width=150&height=150&format=png`}
                      alt={firstAssignee}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      className="absolute -top-2 -right-2 w-9 h-9 rounded-full border-2 border-background bg-secondary object-cover shadow-md"
                    />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground text-sm truncate flex-1 pr-8">{session.title}</h3>
                    {isOwner && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {status.live && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-success/20 text-success flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${categoryColors[session.category] || "bg-secondary text-muted-foreground"}`}>{session.category}</span>
                    {sessionTags.slice(0, 2).map(t => (
                      <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: t.color + "30", color: t.color }}>{t.name}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto pt-1">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{occursAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className={`flex items-center gap-1 ${!firstAssignee ? "italic" : "text-foreground"}`}>
                      <User className="w-3 h-3" />{firstAssignee || "Unclaimed"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailSession} onOpenChange={(open) => { if (!open) setDetailSession(null); }}>
        <DialogContent className="glass border-border/40 max-w-md max-h-[90vh] overflow-y-auto">
          {detailSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[detailSession.category] || "bg-secondary text-muted-foreground"}`}>{detailSession.category}</span>
                  {detailSession.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDate(detailSession.scheduled_at)}</span>
                  <span>{detailSession.duration_minutes} min</span>
                </div>
                {detailSession.description && <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">{detailSession.description}</p>}

                {(detailSession.tag_ids || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(detailSession.tag_ids || []).map(id => tagsById[id]).filter(Boolean).map(t => (
                      <span key={t.id} className="text-[11px] px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: t.color + "30", color: t.color }}>{t.name}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[detailSession.status]}`}>{detailSession.status}</span>
                  {detailSession.recurring && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                      {detailSession.recurring_days?.length ? `Repeats ${detailSession.recurring_days.join(", ")} at ${detailSession.recurring_time || ""}` : `Repeats ${detailSession.recurring}`}
                    </span>
                  )}
                </div>

                <div className="border-t border-border/40 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roles</p>
                  {(detailSession.slots || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No roles defined.</p>
                  ) : (
                    (detailSession.slots || []).map((slot, i) => (
                      <div key={i} className="glass rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{slot.label}</span>
                          <span className="text-[10px] text-muted-foreground">{slot.assigned.filter(Boolean).length}/{slot.count}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {slot.assigned.map((name, posIdx) => {
                            const isMe = name && robloxUsername && name.toLowerCase() === robloxUsername.toLowerCase();
                            const canEdit = canHostSession(detailSession.category) || isOwner;
                            return name ? (
                              <span key={posIdx} className={`text-[11px] px-2 py-1 rounded-full font-medium flex items-center gap-1 ${isMe ? "bg-primary/20 text-primary" : "bg-secondary text-foreground"}`}>
                                {name}
                                {(canEdit || isMe) && (
                                  <button onClick={() => {
                                    const next = (detailSession.slots || []).map((s, si) => si === i ? { ...s, assigned: s.assigned.map((a, ai) => ai === posIdx ? null : a) } : s);
                                    updateSessionSlots(detailSession, next);
                                  }} className="hover:text-destructive"><UserMinus className="w-2.5 h-2.5" /></button>
                                )}
                              </span>
                            ) : (
                              <button key={posIdx}
                                disabled={!canHostSession(detailSession.category) || !robloxUsername}
                                onClick={() => {
                                  const next = (detailSession.slots || []).map((s, si) => si === i ? { ...s, assigned: s.assigned.map((a, ai) => ai === posIdx ? robloxUsername : a) } : s);
                                  updateSessionSlots(detailSession, next);
                                }}
                                className="text-[11px] px-2 py-1 rounded-full font-medium border border-dashed border-border/60 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50">
                                + Assign me
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Tags Manager Dialog */}
      <Dialog open={tagsManagerOpen} onOpenChange={setTagsManagerOpen}>
        <DialogContent className="glass border-border/40 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-foreground flex items-center gap-2"><TagIcon className="w-4 h-4 text-primary" /> Session Tags</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">Create custom tags for sessions to categorize training types (e.g. "Promotion Shift", "Store Colleague").</p>

            <div className="rounded-lg border border-border/40 bg-muted/40 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Tag name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} className="bg-muted border-border h-9 text-xs" />
                <Select value={newTagCategory} onValueChange={setNewTagCategory}>
                  <SelectTrigger className="bg-muted border-border h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {TAG_COLORS.map(c => (
                  <button key={c} onClick={() => setNewTagColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${newTagColor === c ? "ring-2 ring-foreground scale-110" : "opacity-70 hover:opacity-100"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <Button variant="hero" size="sm" className="w-full" onClick={addTag} disabled={!newTagName.trim()}>
                <Plus className="w-3 h-3 mr-1" /> Add Tag
              </Button>
            </div>

            <div className="space-y-2">
              {tags.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No tags yet</p>
              ) : (
                tags.map(t => (
                  <div key={t.id} className="flex items-center justify-between glass rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: t.color + "30", color: t.color }}>{t.name}</span>
                      <span className="text-[10px] text-muted-foreground">{t.category}</span>
                    </div>
                    <button onClick={() => deleteTag(t.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
