import { useEffect, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { Filter, ArrowDownUp, Plus, MessageSquare, AlertTriangle, Loader2, Trash2, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDepartment } from "@/hooks/useDepartment";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useLexicon } from "@/hooks/useLexicon";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface MemberRow {
  user_id: string;
  roblox_username: string;
  roblox_user_id: string;
  role: string;
  minutes: number;
  sessionsHosted: number;
  sessionsAttended: number;
  warnings: number;
  messages: number;
  lastSeen: string | null;
}

interface Quota {
  id: string;
  title: string;
  quota_type: string;
  target_value: number;
  period: string;
  role_id: string | null;
}

interface Role { id: string; name: string; color: string; }

export default function BQuotas() {
  const { workspaceId, workspace, isOwner } = useWorkspace();
  const { department, scope, newRowDepartmentId } = useDepartment();
  const { hasPermission } = usePermissions();
  const { t, phrase, aviation } = useLexicon(workspaceId);
  const canManage = isOwner || hasPermission("manage_members");
  const isPremium = !!workspace?.premium;

  const [rows, setRows] = useState<MemberRow[]>([]);
  const [sortDesc, setSortDesc] = useState(true);

  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [quotaType, setQuotaType] = useState("sessions");
  const [targetValue, setTargetValue] = useState("2");
  const [period, setPeriod] = useState("weekly");
  const [roleId, setRoleId] = useState("all");

  const loadQuotas = async () => {
    const qB = supabase.from("workspace_quotas").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    const rB = supabase.from("workspace_roles").select("id, name, color").eq("workspace_id", workspaceId);
    const [{ data: q }, { data: r }] = await Promise.all([scope(qB), scope(rB)]);
    setQuotas((q as Quota[]) || []);
    setRoles((r as Role[]) || []);
  };

  useEffect(() => {
    (async () => {
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7); weekStart.setHours(0,0,0,0);

      let deptMemberIds: Set<string> | null = null;
      if (department?.id) {
        const { data: dm } = await supabase
          .from("department_members")
          .select("workspace_members!inner(id)")
          .eq("department_id", department.id);
        deptMemberIds = new Set((dm || []).map((r: any) => r.workspace_members?.id).filter(Boolean));
      }

      const [mem, act, hosted, attended] = await Promise.all([
        supabase.from("workspace_members").select("id, user_id, role, roblox_username, roblox_user_id").eq("workspace_id", workspaceId),
        supabase.from("activity_sessions").select("roblox_user_id, duration_seconds, idle_seconds, joined_at, left_at").eq("workspace_id", workspaceId).eq("discarded", false).gte("joined_at", weekStart.toISOString()),
        supabase.from("scheduled_sessions").select("host_id").eq("workspace_id", workspaceId).eq("status", "completed").gte("scheduled_at", weekStart.toISOString()),
        supabase.from("session_attendance").select("roblox_user_id").eq("workspace_id", workspaceId).gte("occurrence_at", weekStart.toISOString()),
      ]);

      const minutesMap = new Map<string, number>();
      const lastSeen = new Map<string, string>();
      const now = Date.now();
      for (const s of (act.data || []) as any[]) {
        const sec = s.duration_seconds != null
          ? Math.max(0, s.duration_seconds - (s.idle_seconds || 0))
          : Math.max(0, Math.floor((now - new Date(s.joined_at).getTime())/1000) - (s.idle_seconds || 0));
        minutesMap.set(s.roblox_user_id, (minutesMap.get(s.roblox_user_id) || 0) + Math.round(sec/60));
        const prev = lastSeen.get(s.roblox_user_id);
        if (!prev || s.joined_at > prev) lastSeen.set(s.roblox_user_id, s.joined_at);
      }
      const hostedMap = new Map<string, number>();
      for (const h of (hosted.data || []) as any[]) {
        if (h.host_id) hostedMap.set(h.host_id, (hostedMap.get(h.host_id) || 0) + 1);
      }
      const attendedMap = new Map<string, number>();
      for (const a of (attended.data || []) as any[]) {
        attendedMap.set(a.roblox_user_id, (attendedMap.get(a.roblox_user_id) || 0) + 1);
      }


      const filteredMem = (mem.data || []).filter((m: any) => !deptMemberIds || deptMemberIds.has(m.id));
      const out: MemberRow[] = filteredMem.map((m: any) => ({
        user_id: m.user_id,
        roblox_username: m.roblox_username || "Unknown",
        roblox_user_id: m.roblox_user_id || "",
        role: m.role,
        minutes: minutesMap.get(m.roblox_user_id) || 0,
        sessionsHosted: hostedMap.get(m.user_id) || 0,
        sessionsAttended: attendedMap.get(m.roblox_user_id) || 0,

        warnings: 0,
        messages: 0,
        lastSeen: lastSeen.get(m.roblox_user_id) || null,
      }));
      setRows(out);

      await loadQuotas();
    })();
  }, [workspaceId, department?.id]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("workspace_quotas").insert({
      workspace_id: workspaceId,
      department_id: newRowDepartmentId,
      title: title.trim(),
      quota_type: quotaType,
      target_value: parseInt(targetValue) || 1,
      period,
      role_id: roleId === "all" ? null : roleId,
    });
    setCreating(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Quota created");
    setDialogOpen(false);
    setTitle("");
    loadQuotas();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("workspace_quotas").delete().eq("id", id);
    if (error) { toast.error("Failed to delete: " + error.message); return; }
    toast.success("Quota deleted");
    loadQuotas();
  };

  const roleName = (id: string | null) => id ? (roles.find(r => r.id === id)?.name || "Unknown role") : "All members";

  const sorted = [...rows].sort((a,b) => sortDesc ? b.minutes - a.minutes : a.minutes - b.minutes);

  return (
    <BargainsShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Quotas</h1>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button
                  className="inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm font-medium"
                  style={{ background: bx.coral, color: "#fff" }}>
                  <Plus className="w-4 h-4" /> New quota
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm" style={{ background: "#1a1a1c", borderColor: bx.borderColor, color: bx.text }}>
                <DialogHeader><DialogTitle style={{ color: bx.text }}>Create quota</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input placeholder={aviation ? "e.g. Attend 1 flight" : "e.g. Host 2 sessions"} value={title} onChange={(e) => setTitle(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs" style={{ color: bx.textDim }}>Type</Label>
                      <Select value={quotaType} onValueChange={setQuotaType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="sessions">{t("Sessions hosted")}</SelectItem>
                          <SelectItem value="attendance">{aviation ? "Flights attended" : "Sessions attended"}</SelectItem>
                          <SelectItem value="minutes">{t("In-game minutes")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs" style={{ color: bx.textDim }}>Target</Label>
                      <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs" style={{ color: bx.textDim }}>Period</Label>
                      <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5" style={{ color: bx.textDim }}>
                        Applies to
                        {!isPremium && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(245,90,74,0.15)", color: bx.coral }}>PREMIUM</span>}
                      </Label>
                      <Select value={isPremium ? roleId : "all"} onValueChange={(v) => isPremium && setRoleId(v)} disabled={!isPremium}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All members</SelectItem>
                          {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !title.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md text-sm font-medium disabled:opacity-50"
                    style={{ background: bx.coral, color: "#fff" }}>
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />} Create quota
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {canManage && (
          <div className="rounded-md border overflow-hidden" style={bx.cardStyle}>
            <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: bx.borderColor }}>
              <Target className="w-4 h-4" style={{ color: bx.coral }} />
              <div className="text-sm font-semibold" style={{ color: bx.text }}>Assigned quotas</div>
              <div className="text-xs ml-2" style={{ color: bx.textDim }}>{quotas.length} active</div>
            </div>
            {quotas.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: bx.textDim }}>
                {phrase("No quotas yet. Create one to start tracking activity.")}
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: bx.borderColor }}>
                {quotas.map((q) => (
                  <div key={q.id} className="px-5 py-3 flex items-center gap-4" style={{ borderColor: bx.borderColor }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: bx.text }}>{q.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: bx.textDim }}>
                        {q.target_value} {q.quota_type === "sessions" ? t("sessions") + " hosted" : q.quota_type === "attendance" ? t("sessions") + " attended" : "minutes"} · {q.period} · {roleName(q.role_id)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2 rounded-md transition-colors"
                      style={{ color: bx.textDim }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = bx.coral)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = bx.textDim)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <h2 className="text-xl font-semibold tracking-tight pt-2" style={{ color: bx.text }}>Most minutes</h2>

        {/* Toolbar */}
        <div className="flex items-center gap-1 -mx-2">
          {[
            { icon: Filter, label: "Filter" },
            { icon: ArrowDownUp, label: "Sort", active: true, onClick: () => setSortDesc(s => !s) },
          ].map(({ icon: Icon, label, active, onClick }) => (
            <button key={label} onClick={onClick}
              className="inline-flex items-center gap-2 px-3 h-8 rounded-md text-sm transition-colors"
              style={{
                color: active ? bx.coral : bx.textDim,
                background: active ? "rgba(245,90,74,0.10)" : "transparent",
              }}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sorted.map((r) => (
            <div key={r.user_id} className="rounded-md border overflow-hidden" style={bx.cardStyle}>
              <div className="px-5 pt-3 pb-1" />

              <div className="px-5 pb-3 flex items-center gap-3">
                <RobloxAvatar username={r.roblox_username} userId={r.roblox_user_id} className="w-9 h-9 rounded-md" />
                <div className="font-semibold text-[15px]" style={{ color: bx.text }}>
                  {r.roblox_username} <span style={{ color: bx.textMuted }}>•</span>{" "}
                  <span style={{ color: bx.textDim }}>{r.role}</span>
                </div>
              </div>
              <div className="px-5 grid grid-cols-3 gap-2">
                {[
                  { v: r.minutes,        l: "Last Week's Minutes" },
                  { v: r.sessionsHosted, l: t("Sessions Hosted") },
                  { v: r.sessionsAttended, l: t("Sessions Attended") },
                ].map((s, i) => (
                  <div key={i} className="rounded-md p-3" style={{ background: "#141416", border: "1px solid #22222a" }}>
                    <div className="text-[1.6rem] font-bold leading-none tabular-nums tracking-tight" style={{ color: bx.text }}>{s.v}</div>
                    <div className="text-[11px] mt-1.5 font-medium" style={{ color: bx.textDim }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 mt-3 flex items-center gap-3 text-[11px]" style={{ background: "#141416", color: bx.textDim }}>
                <span className="inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" style={{ color: "#e0a64a" }} /> {r.warnings}</span>
                <span className="inline-flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> {r.messages}</span>
                <span className="ml-2">Last Seen: {r.lastSeen ? new Date(r.lastSeen).toLocaleDateString() : "Never"}</span>
              </div>
            </div>
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="rounded-md border p-16 text-center" style={bx.cardStyle}>
            <p className="text-sm" style={{ color: bx.textDim }}>No members yet.</p>
          </div>
        )}
      </div>
    </BargainsShell>
  );
}
