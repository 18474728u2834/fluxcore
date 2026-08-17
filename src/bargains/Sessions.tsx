import { useEffect, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, X, Loader2, Trash2, UserPlus, UserMinus, Radio, ClipboardList, Pencil } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { CrewDispatchDialog } from "@/components/CrewDispatchDialog";
import { CrewWishlistDialog } from "@/components/CrewWishlistDialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDepartment } from "@/hooks/useDepartment";
import { useAuth } from "@/hooks/useAuth";
import { useLexicon } from "@/hooks/useLexicon";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { toast } from "sonner";

const DAYS = ["S","M","T","W","T","F","S"];

interface SessionSlot { label: string; count: number; assigned: (string | null)[]; }
interface Session {
  id: string;
  title: string;
  description?: string | null;
  scheduled_at: string;
  host_name: string | null;
  host_id: string | null;
  duration_minutes: number;
  category: string;
  recurring: string | null;
  recurring_days: string[] | null;
  recurring_time: string | null;
  game_url: string | null;
  slots: SessionSlot[] | null;
  occurrence_assignments: Record<string, (string | null)[][]> | null;
  route_number: string | null;
  aircraft_model: string | null;
  tail_number: string | null;
  origin: string | null;
  destination: string | null;

}

const DAY_KEYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const occurrenceKey = (d: Date) => d.toISOString();
const effectiveSlots = (s: Session, occursAt: Date): SessionSlot[] => {
  const base = s.slots && s.slots.length ? s.slots : [];
  const isRecurring = !!(s.recurring || (s.recurring_days && s.recurring_days.length));
  if (!isRecurring) return base.map(sl => ({ ...sl, assigned: [...sl.assigned] }));
  const override = s.occurrence_assignments?.[occurrenceKey(occursAt)];
  return base.map((sl, i) => {
    const ov = override?.[i];
    const arr = ov ? ov.slice(0, sl.count) : [];
    while (arr.length < sl.count) arr.push(null);
    return { ...sl, assigned: arr };
  });
};

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const DEFAULT_SLOTS: Record<string, SessionSlot[]> = {
  Shift:    [{ label: "Host", count: 1, assigned: [null] }, { label: "Co-host", count: 1, assigned: [null] }],
  Training: [{ label: "Trainer", count: 1, assigned: [null] }, { label: "Co-trainer", count: 1, assigned: [null] }],
  Event:    [{ label: "Host", count: 1, assigned: [null] }],
  Meeting:  [{ label: "Host", count: 1, assigned: [null] }],
};

export default function BSessions() {
  const { workspaceId } = useWorkspace();
  const { hasPermission, isOwner, canCreateSession, canHostSession } = usePermissions();
  const allowedCategories = ["Shift", "Training", "Event", "Meeting"].filter((c) =>
    canCreateSession(c === "Meeting" ? "Event" : c));
  const canSchedule = allowedCategories.length > 0;
  const [dispatchEnabled, setDispatchEnabled] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState<{ session: Session; occursAt: Date } | null>(null);
  const [wishlistTarget, setWishlistTarget] = useState<{ session: Session; occursAt: Date } | null>(null);
  
  const { scope, newRowDepartmentId } = useDepartment();
  const { user, robloxUsername } = useAuth();
  const { t, phrase, aviation, maritime, trip, crew } = useLexicon(workspaceId);
  const canDispatch = !!crew && (isOwner || hasPermission("flight_dispatch" as any));
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d;
  });
  const [selected, setSelected] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Schedule modal state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Shift");
  const [when, setWhen] = useState(() => {
    const d = new Date(); d.setMinutes(0,0,0); d.setHours(d.getHours()+1);
    return toLocalInput(d);
  });
  const [duration, setDuration] = useState("60");
  const [description, setDescription] = useState("");
  const [gameUrl, setGameUrl] = useState("");
  const [slots, setSlots] = useState<SessionSlot[]>(DEFAULT_SLOTS.Shift);
  const [routeNumber, setRouteNumber] = useState("");
  const [aircraftModel, setAircraftModel] = useState("");
  const [tailNumber, setTailNumber] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [recurring, setRecurring] = useState<"none" | "daily" | "weekly">("none");
  const [saving, setSaving] = useState(false);
  // When set, the modal edits this existing session instead of creating one.
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    supabase.from("workspaces").select("dispatch_enabled").eq("id", workspaceId).maybeSingle()
      .then(({ data }) => setDispatchEnabled(!!(data as any)?.dispatch_enabled));
  }, [workspaceId]);


  useEffect(() => {
    if (!workspaceId) return;
    const q = supabase.from("scheduled_sessions")
      .select("id, title, description, scheduled_at, host_name, host_id, duration_minutes, category, recurring, recurring_days, recurring_time, game_url, slots, occurrence_assignments, route_number, aircraft_model, tail_number, origin, destination")
      .eq("workspace_id", workspaceId)
      .order("scheduled_at", { ascending: true });
    scope(q).then(({ data }: any) => setSessions((data as any) || []));
  }, [workspaceId, refreshKey, newRowDepartmentId]);

  // Expand recurring sessions into occurrences on the selected day
  const dayOccurrences = (() => {
    const startOfDay = new Date(selected); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(selected); endOfDay.setHours(23,59,59,999);
    const dayKey = DAY_KEYS[selected.getDay()];
    const out: { session: Session; occursAt: Date }[] = [];
    for (const s of sessions) {
      if (s.recurring_days?.length && s.recurring_time) {
        if (!s.recurring_days.includes(dayKey)) continue;
        const [hh, mm] = s.recurring_time.split(":").map(Number);
        const occ = new Date(selected); occ.setHours(hh || 0, mm || 0, 0, 0);
        out.push({ session: s, occursAt: occ });
      } else if (s.recurring === "weekly") {
        const base = new Date(s.scheduled_at);
        if (base.getDay() !== selected.getDay()) continue;
        const occ = new Date(selected); occ.setHours(base.getHours(), base.getMinutes(), 0, 0);
        if (occ < base) continue;
        out.push({ session: s, occursAt: occ });
      } else if (s.recurring === "daily") {
        const base = new Date(s.scheduled_at);
        const occ = new Date(selected); occ.setHours(base.getHours(), base.getMinutes(), 0, 0);
        if (occ < base) continue;
        out.push({ session: s, occursAt: occ });
      } else {
        const base = new Date(s.scheduled_at);
        if (base >= startOfDay && base <= endOfDay) out.push({ session: s, occursAt: base });
      }
    }
    out.sort((a, b) => a.occursAt.getTime() - b.occursAt.getTime());
    return out;
  })();

  // Ask the backend dispatcher to send due Discord alerts. The backend owns
  // recurrence math + duplicate prevention so alerts still work reliably.
  useEffect(() => {
    if (!workspaceId) return;
    const dispatch = () => supabase.functions.invoke("discord-notify", {
      body: { action: "dispatch_due_sessions", workspace_id: workspaceId },
    }).catch(() => {});
    dispatch();
    const id = setInterval(dispatch, 60_000);
    return () => clearInterval(id);
  }, [workspaceId]);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate()+i); return d;
  });
  const today = new Date(); today.setHours(0,0,0,0);

  const groupLabel = (d: Date) => {
    if (d.toDateString() === today.toDateString()) return "Today";
    const tom = new Date(today); tom.setDate(tom.getDate()+1);
    if (d.toDateString() === tom.toDateString()) return "Tomorrow";
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  };

  const openScheduler = () => {
    if (!canSchedule) return;
    const first = allowedCategories[0];
    const base = new Date(selected);
    const now = new Date();
    base.setHours(now.getHours()+1, 0, 0, 0);
    setWhen(toLocalInput(base));
    setTitle("");
    setCategory(first);
    setDuration("60");
    setDescription("");
    setGameUrl("");
    setSlots((DEFAULT_SLOTS[first] || DEFAULT_SLOTS.Event).map(s => ({ ...s, assigned: Array(s.count).fill(null) })));
    setRecurring("none");
    setRouteNumber(""); setAircraftModel(""); setTailNumber(""); setOrigin(""); setDestination("");
    setEditingId(null);
    setOpen(true);
  };

  const canEditSession = (s: Session) => isOwner || canCreateSession(s.category === "Meeting" ? "Event" : s.category);

  const openEditor = (s: Session) => {
    if (!canEditSession(s)) return;
    const base = new Date(s.scheduled_at);
    setEditingId(s.id);
    setTitle(s.title || "");
    setCategory(s.category);
    setWhen(toLocalInput(base));
    setDuration(String(s.duration_minutes ?? 60));
    setDescription(s.description || "");
    setGameUrl(s.game_url || "");
    setRouteNumber(s.route_number || "");
    setAircraftModel(s.aircraft_model || "");
    setTailNumber(s.tail_number || "");
    setOrigin(s.origin || "");
    setDestination(s.destination || "");
    setRecurring((s.recurring === "daily" || s.recurring === "weekly") ? s.recurring : "none");
    const base_slots = (s.slots && s.slots.length ? s.slots : DEFAULT_SLOTS[s.category] || DEFAULT_SLOTS.Event);
    setSlots(base_slots.map(sl => {
      const arr = [...(sl.assigned || [])];
      while (arr.length < sl.count) arr.push(null);
      return { ...sl, assigned: arr.slice(0, sl.count) };
    }));
    setOpen(true);
  };

  const onCategoryChange = (c: string) => {
    setCategory(c);
    setSlots((DEFAULT_SLOTS[c] || DEFAULT_SLOTS.Event).map(s => ({ ...s, assigned: Array(s.count).fill(null) })));
  };

  const updateSlot = (idx: number, patch: Partial<SessionSlot>) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const next = { ...s, ...patch };
      if (patch.count !== undefined) {
        const arr = [...s.assigned];
        while (arr.length < next.count) arr.push(null);
        arr.length = next.count;
        next.assigned = arr;
      }
      return next;
    }));
  };
  const addSlot = () => setSlots(prev => [...prev, { label: "Role", count: 1, assigned: [null] }]);
  const removeSlot = (idx: number) => setSlots(prev => prev.filter((_, i) => i !== idx));

  const claimFirstSelfSlot = () => {
    if (!robloxUsername) return;
    setSlots(prev => {
      const copy = prev.map(s => ({ ...s, assigned: [...s.assigned] }));
      for (const s of copy) {
        const i = s.assigned.findIndex(a => !a);
        if (i !== -1) { s.assigned[i] = robloxUsername; return copy; }
      }
      return copy;
    });
  };

  const createSession = async () => {
    if (!title.trim()) { toast.error("Give the session a title"); return; }
    if (!when) { toast.error("Pick a date & time"); return; }
    if (!user) { toast.error("You must be signed in"); return; }
    setSaving(true);
    const dt = new Date(when);
    const cleanSlots = slots
      .filter(s => s.label.trim())
      .map(s => ({ label: s.label.trim(), count: Math.max(1, s.count), assigned: s.assigned.slice(0, s.count) }));
    const firstAssignee = cleanSlots.flatMap(s => s.assigned).find(n => n && n.trim()) || "Unassigned";
    const payload: any = {
      workspace_id: workspaceId,
      department_id: newRowDepartmentId,
      title: title.trim(),
      category,
      scheduled_at: dt.toISOString(),
      duration_minutes: parseInt(duration) || 60,
      host_id: user.id,
      host_name: firstAssignee,
      description: description.trim() || null,
      game_url: gameUrl.trim() || null,
      slots: cleanSlots,
      route_number: routeNumber.trim() || null,
      aircraft_model: aircraftModel.trim() || null,
      tail_number: tailNumber.trim() || null,
      origin: origin.trim() || null,
      destination: destination.trim() || null,
      tag_ids: [],
    };
    if (recurring !== "none") {
      payload.recurring = recurring;
      payload.recurring_time = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
      payload.recurring_days = recurring === "weekly" ? [dt.getDay()] : [0,1,2,3,4,5,6];
    }
    if (recurring === "none") {
      payload.recurring = null;
      payload.recurring_time = null;
      payload.recurring_days = null;
    }
    let error: any = null;
    if (editingId) {
      // Keep the original creator as host_id; only update the editable fields.
      const { host_id, workspace_id, department_id, tag_ids, ...updates } = payload;
      ({ error } = await supabase.from("scheduled_sessions").update(updates).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("scheduled_sessions").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(editingId ? "Session updated" : "Session scheduled");
    setEditingId(null);
    setOpen(false);
    const newDay = new Date(when); newDay.setHours(0,0,0,0);
    setSelected(newDay);
    setRefreshKey(k => k + 1);
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    const { error } = await supabase.from("scheduled_sessions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    setRefreshKey(k => k + 1);
  };

  const toggleClaim = async (s: Session, occursAt: Date, slotIdx: number, seatIdx: number) => {
    if (!canHostSession(s.category)) { toast.error("You don't have permission to claim this seat"); return; }
    if (!robloxUsername) { toast.error("Verify your Roblox account first"); return; }
    const isRecurring = !!(s.recurring || (s.recurring_days && s.recurring_days.length));
    const eff = effectiveSlots(s, occursAt);
    if (!eff[slotIdx]) return;
    const current = eff[slotIdx].assigned[seatIdx];
    if (current && current !== robloxUsername) { toast.error("That seat is taken"); return; }
    eff[slotIdx].assigned[seatIdx] = current ? null : robloxUsername;

    let updatePayload: any;
    if (isRecurring) {
      const key = occurrenceKey(occursAt);
      const nextAssignments = {
        ...(s.occurrence_assignments || {}),
        [key]: eff.map(sl => sl.assigned),
      };
      updatePayload = { occurrence_assignments: nextAssignments };
    } else {
      const firstAssignee = eff.flatMap(x => x.assigned).find(n => n && n.trim()) || "Unassigned";
      updatePayload = { slots: eff, host_name: firstAssignee };
    }
    const { error } = await supabase.from("scheduled_sessions")
      .update(updatePayload).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    setRefreshKey(k => k + 1);
  };

  return (
    <BargainsShell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Week strip */}
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); }}
            className="w-9 h-9 rounded-md flex items-center justify-center hover:bg-[#1f1f22]" style={{ color: bx.textDim }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          {week.map((d, i) => {
            const isSel = d.toDateString() === selected.toDateString();
            return (
              <button key={i} onClick={() => setSelected(d)} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase" style={{ color: bx.textMuted }}>{DAYS[d.getDay()]}</span>
                <span className="w-9 h-9 rounded-md flex items-center justify-center text-sm font-bold transition-colors"
                  style={{
                    background: isSel ? bx.coral : "#1a1a1c",
                    color: isSel ? "#fff" : bx.text,
                    border: isSel ? "none" : `1px solid ${bx.borderColor}`,
                  }}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); }}
            className="w-9 h-9 rounded-md flex items-center justify-center hover:bg-[#1f1f22]" style={{ color: bx.textDim }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-[2.25rem] font-bold tracking-[-0.035em]" style={{ color: bx.text }}>{groupLabel(selected)}</h1>
          {canSchedule && (
            <button onClick={openScheduler}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: bx.coral, color: "#fff" }}>
              <Plus className="w-4 h-4" /> Schedule
            </button>
          )}
        </div>

        {dayOccurrences.length === 0 ? (
          <div className="rounded-md border p-16 text-center" style={bx.cardStyle}>
            <CalIcon className="w-10 h-10 mx-auto mb-3" style={{ color: bx.textMuted }} />
            <p className="text-sm" style={{ color: bx.textDim }}>{phrase("No sessions scheduled for this day.")}</p>
            {canSchedule && (
              <button onClick={openScheduler}
                className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-semibold"
                style={{ background: bx.coral, color: "#fff" }}>
                <Plus className="w-4 h-4" /> Schedule one
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dayOccurrences.map(({ session: s, occursAt: d }) => {
              const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const sessionSlots = effectiveSlots(s, d);
              const isRecurring = !!(s.recurring || (s.recurring_days && s.recurring_days.length));
              return (
                <div key={`${s.id}-${d.getTime()}`} className="rounded-md border p-5 transition-transform hover:-translate-y-0.5 group relative"
                  style={bx.cardStyle}>
                  {isOwner && (
                    <button onClick={() => deleteSession(s.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-md inline-flex items-center justify-center hover:bg-[#2a2a2e]"
                      style={{ color: bx.textDim }}
                      aria-label="Delete session">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canEditSession(s) && (
                    <button onClick={() => openEditor(s)}
                      className="absolute top-3 right-11 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-md inline-flex items-center justify-center hover:bg-[#2a2a2e]"
                      style={{ color: bx.textDim }}
                      aria-label="Edit session">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDispatch && (
                    <button onClick={() => setDispatchTarget({ session: s, occursAt: d })}
                      className="absolute top-3 right-20 h-7 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-semibold border hover:bg-[#2a2a2e]"
                      style={{ color: bx.coral, borderColor: bx.borderColor }}
                      aria-label="Dispatch crew">
                      <Radio className="w-3.5 h-3.5" /> Dispatch
                    </button>
                  )}

                  <div className="text-xs mb-1.5" style={{ color: bx.textDim }}>
                    {groupLabel(d)} at {time} · {s.duration_minutes}m · {t(s.category)}{isRecurring ? " · Recurring" : ""}
                  </div>
                  <div className="text-lg font-bold mb-2" style={{ color: bx.text }}>
                    {s.route_number ? <span style={{ color: bx.coral }}>{s.route_number} · </span> : null}{s.title}
                  </div>
                  {(s.origin || s.destination || s.aircraft_model || s.tail_number) && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(s.origin || s.destination) && (
                        <span className="text-[10px] px-2 py-1 rounded" style={{ background: "#1c1c20", color: bx.textDim }}>
                          {s.origin || "—"} → {s.destination || "—"}
                        </span>
                      )}
                      {s.aircraft_model && (
                        <span className="text-[10px] px-2 py-1 rounded" style={{ background: "#1c1c20", color: bx.textDim }}>{s.aircraft_model}</span>
                      )}
                      {s.tail_number && (
                        <span className="text-[10px] px-2 py-1 rounded" style={{ background: "#1c1c20", color: bx.textDim }}>{s.tail_number}</span>
                      )}
                    </div>
                  )}
                  {s.game_url && (
                    <a href={s.game_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs underline mb-3 inline-block" style={{ color: bx.coral }}>
                      Open game link
                    </a>
                  )}

                  {sessionSlots.length ? (
                    <div className="space-y-2 pt-3 border-t" style={{ borderColor: "#22222a" }}>
                      {sessionSlots.map((sl, slIdx) => (
                        <div key={slIdx}>
                          <div className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: bx.textMuted }}>
                            {sl.label}
                          </div>
                          <div className="space-y-1.5">
                            {sl.assigned.map((name, seatIdx) => {
                              const mine = name === robloxUsername;
                              return (
                                <div key={seatIdx} className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {name ? (
                                      <>
                                        <RobloxAvatar username={name} className="w-6 h-6 rounded-md flex-shrink-0" />
                                        <span className="text-xs font-medium truncate" style={{ color: bx.text }}>{name}</span>
                                      </>
                                    ) : (
                                      <span className="text-xs italic" style={{ color: bx.textMuted }}>Open</span>
                                    )}
                                  </div>
                                  {(!name || mine) && canHostSession(s.category) && (
                                    <button onClick={() => toggleClaim(s, d, slIdx, seatIdx)}
                                      className="text-[11px] font-semibold inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[#2a2a2e] transition"
                                      style={{ color: mine ? bx.textDim : bx.coral }}>
                                      {mine ? (<><UserMinus className="w-3 h-3" /> Release</>) : (<><UserPlus className="w-3 h-3" /> Claim</>)}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: "#22222a" }}>
                      <span className="text-xs font-medium" style={{ color: bx.textMuted }}>Unassigned</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {wishlistTarget && (
        <CrewWishlistDialog
          workspaceId={workspaceId!}
          session={wishlistTarget.session}
          occursAt={wishlistTarget.occursAt}
          onClose={() => setWishlistTarget(null)}
        />
      )}

      {dispatchTarget && (
        <CrewDispatchDialog
          workspaceId={workspaceId!}
          session={dispatchTarget.session}
          occursAt={dispatchTarget.occursAt}
          onClose={() => setDispatchTarget(null)}
        />
      )}

      {/* Schedule modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setEditingId(null); } }}>
          <div className="w-full max-w-md rounded-md border p-6 relative max-h-[90vh] overflow-y-auto" style={bx.cardStyle}>
            <button onClick={() => { setOpen(false); setEditingId(null); }}
              className="absolute top-4 right-4 hover:text-white" style={{ color: bx.textDim }} aria-label="Close">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold" style={{ color: bx.text }}>
              {editingId ? phrase("Edit session") : phrase("Schedule session")}
            </h2>
            <p className="text-xs mt-1" style={{ color: bx.textDim }}>
              {editingId ? phrase("Update the details for this session.") : phrase("Add a session to the calendar.")}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder={aviation ? "Friday evening departure" : maritime ? "Friday evening crossing" : "Friday night shift"}
                  className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none focus:ring-1"
                  style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>Type</label>
                  <select value={category} onChange={(e) => onCategoryChange(e.target.value)}
                    className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none"
                    style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }}>
                    {allowedCategories.map((c) => (
                      <option key={c} value={c}>{t(c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>Duration (min)</label>
                  <input type="number" min="5" step="5" value={duration} onChange={(e) => setDuration(e.target.value)}
                    className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none"
                    style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>Date & time</label>
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
                  className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none"
                  style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text, colorScheme: "dark" }} />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>Game link</label>
                <input value={gameUrl} onChange={(e) => setGameUrl(e.target.value)}
                  placeholder="https://www.roblox.com/games/…"
                  className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none"
                  style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
              </div>

              {trip && (
                <div className="rounded-md p-3 space-y-3" style={{ background: "#131315", border: `1px solid ${bx.borderColor}` }}>
                  <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bx.textMuted }}>{trip.heading}</div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>{trip.route}</label>
                    <input value={routeNumber} onChange={(e) => setRouteNumber(e.target.value)}
                      placeholder={trip.routePlaceholder}
                      className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none"
                      style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>{trip.origin}</label>
                      <input value={origin} onChange={(e) => setOrigin(e.target.value)}
                        placeholder={trip.originPlaceholder}
                        className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none"
                        style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>{trip.destination}</label>
                      <input value={destination} onChange={(e) => setDestination(e.target.value)}
                        placeholder={trip.destinationPlaceholder}
                        className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none"
                        style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>{trip.vehicle}</label>
                      <input value={aircraftModel} onChange={(e) => setAircraftModel(e.target.value)}
                        placeholder={trip.vehiclePlaceholder}
                        className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none"
                        style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>{trip.identifier}</label>
                      <input value={tailNumber} onChange={(e) => setTailNumber(e.target.value)}
                        placeholder={trip.identifierPlaceholder}
                        className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none"
                        style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
                    </div>
                  </div>
                </div>
              )}


              <div>
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>Repeat</label>
                <select value={recurring} onChange={(e) => setRecurring(e.target.value as any)}
                  className="mt-1.5 w-full h-10 px-3 rounded-md text-sm outline-none"
                  style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }}>
                  <option value="none">Doesn't repeat</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Weekly on this day</option>
                </select>
              </div>

              {/* Roles / slots */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>Roles</label>
                  <button onClick={addSlot} className="text-[11px] font-semibold inline-flex items-center gap-1" style={{ color: bx.coral }}>
                    <Plus className="w-3 h-3" /> Add role
                  </button>
                </div>
                <div className="space-y-2">
                  {slots.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={s.label} onChange={(e) => updateSlot(i, { label: e.target.value })}
                        placeholder="Role name"
                        className="flex-1 h-9 px-2.5 rounded-md text-sm outline-none"
                        style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
                      <input type="number" min={1} max={20} value={s.count}
                        onChange={(e) => updateSlot(i, { count: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-16 h-9 px-2 rounded-md text-sm outline-none text-center"
                        style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
                      {slots.length > 1 && (
                        <button onClick={() => removeSlot(i)} className="h-9 w-9 rounded-md inline-flex items-center justify-center hover:bg-[#2a2a2e]"
                          style={{ color: bx.textDim }} aria-label="Remove role">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {recurring === "none" && robloxUsername && (
                  <button onClick={claimFirstSelfSlot}
                    className="mt-2 text-[11px] font-semibold inline-flex items-center gap-1" style={{ color: bx.coral }}>
                    <UserPlus className="w-3 h-3" /> Claim first open seat for me
                  </button>
                )}
                {recurring !== "none" && (
                  <p className="mt-2 text-[11px]" style={{ color: bx.textMuted }}>
                    Recurring sessions leave seats open — people claim per occurrence.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={3} placeholder="Notes for hosts and staff…"
                  className="mt-1.5 w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
                  style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => { setOpen(false); setEditingId(null); }}
                className="h-10 px-4 rounded-md text-sm font-medium"
                style={{ background: "#242427", color: bx.text }}>Cancel</button>
              <button onClick={createSession} disabled={saving}
                className="h-10 px-5 rounded-md text-sm font-semibold text-white disabled:opacity-60 inline-flex items-center gap-2"
                style={{ background: bx.coral }}>
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? (editingId ? "Saving…" : "Scheduling…") : (editingId ? "Save changes" : "Schedule")}
              </button>
            </div>
          </div>
        </div>
      )}
    </BargainsShell>
  );
}
