import { useEffect, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { Plus, CheckCircle2, XCircle, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDepartment } from "@/hooks/useDepartment";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface LOARequest {
  id: string; reason: string; start_date: string; end_date: string;
  status: string; reviewed_by: string | null; created_at: string;
  member_id: string; user_id: string;
}

const TYPES = ["Vacation", "Sick Leave", "Personal", "Family", "Other"];

export default function BLOA() {
  const { workspaceId, isOwner } = useWorkspace();
  const { user, robloxUsername } = useAuth();
  const { hasPermission } = usePermissions();
  const canManage = isOwner || hasPermission("manage_members");

  const [requests, setRequests] = useState<LOARequest[]>([]);
  const [memberRows, setMemberRows] = useState<Record<string, { roblox_username: string; roblox_user_id: string }>>({});
  const [myMemberId, setMyMemberId] = useState("");
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [r, m] = await Promise.all([
      supabase.from("loa_requests").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("workspace_members").select("id, user_id, roblox_username, roblox_user_id").eq("workspace_id", workspaceId),
    ]);
    setRequests((r.data || []) as any);
    const map: Record<string, any> = {};
    (m.data || []).forEach((x: any) => { map[x.id] = x; if (x.user_id === user?.id) setMyMemberId(x.id); });
    setMemberRows(map);
  };
  useEffect(() => { if (user) load(); }, [workspaceId, user]);

  const submit = async () => {
    if (!start || !end || !type || !user) return;
    setSaving(true);
    let mid = myMemberId;
    if (!mid && isOwner) {
      const { data: vu } = await supabase.from("verified_users").select("roblox_username, roblox_user_id").eq("user_id", user.id).maybeSingle();
      if (vu) {
        const { data: nm } = await supabase.from("workspace_members").insert({
          workspace_id: workspaceId, user_id: user.id,
          roblox_username: (vu as any).roblox_username, roblox_user_id: (vu as any).roblox_user_id,
          role: "Owner", verified: true,
        }).select("id").single();
        mid = (nm as any)?.id || "";
      }
    }
    if (!mid) { toast.error("Could not resolve member"); setSaving(false); return; }
    const { error } = await supabase.from("loa_requests").insert({
      workspace_id: workspaceId, member_id: mid, user_id: user.id,
      reason: `${type}${notes ? " — " + notes : ""}`,
      start_date: start, end_date: end,
    });
    if (error) toast.error(error.message);
    else { toast.success("Submitted"); setOpen(false); setStart(""); setEnd(""); setType(""); setNotes(""); load(); }
    setSaving(false);
  };

  const review = async (id: string, status: string) => {
    const { error } = await supabase.from("loa_requests").update({ status, reviewed_by: robloxUsername || "Admin" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Request ${status}`); load(); }
  };

  const statusPill = (s: string) => {
    const map: any = {
      pending: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
      approved: { bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
      denied: { bg: "rgba(239,68,68,0.14)", color: "#ef4444" },
    };
    const v = map[s] || map.pending;
    return <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider" style={{ background: v.bg, color: v.color }}>{s}</span>;
  };

  return (
    <BargainsShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Leave of Absence</h1>
            <p className="text-sm mt-2" style={{ color: bx.textDim }}>Request or manage time off</p>
          </div>
          <button onClick={() => setOpen(true)} className="h-9 px-4 rounded-md text-sm font-semibold inline-flex items-center gap-1.5" style={{ background: "#0d4f4f", color: "#7fd9d9" }}>
            <Plus className="w-3.5 h-3.5" /> Request inactivity
          </button>
        </div>

        <div className="rounded-md border overflow-hidden" style={bx.cardStyle}>
          {requests.length === 0 && <div className="p-12 text-center text-sm" style={{ color: bx.textDim }}>No LOA requests yet.</div>}
          {requests.map((r, i) => {
            const m = memberRows[r.member_id];
            return (
              <div key={r.id} className="p-5" style={{ borderTop: i === 0 ? "none" : "1px solid #22222a" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold" style={{ color: bx.text }}>{m?.roblox_username || "Member"}</span>
                      {statusPill(r.status)}
                    </div>
                    <div className="text-sm" style={{ color: bx.textDim }}>{r.reason}</div>
                    <div className="text-xs mt-2 flex items-center gap-3" style={{ color: bx.textMuted }}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(r.start_date).toLocaleDateString()} — {new Date(r.end_date).toLocaleDateString()}</span>
                      {r.reviewed_by && <span>Reviewed by {r.reviewed_by}</span>}
                    </div>
                  </div>
                  {canManage && r.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => review(r.id, "approved")} className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => review(r.id, "denied")} className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                        <XCircle className="w-3 h-3" /> Deny
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-xl rounded-md border p-7 relative" style={bx.cardStyle}>
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-[#7a7a7e] hover:text-white"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-bold" style={{ color: bx.text }}>Inactivity</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: bx.textDim }}>Start Date</label>
                <input type="date" value={start} onChange={e => setStart(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none" style={{ background: "#242427", borderColor: "#2e2e34", color: bx.text }} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: bx.textDim }}>End Date</label>
                <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none" style={{ background: "#242427", borderColor: "#2e2e34", color: bx.text }} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: bx.textDim }}>Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none" style={{ background: "#242427", borderColor: "#2e2e34", color: type ? bx.text : bx.textMuted }}>
                  <option value="">Select one</option>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: bx.textDim }}>Notes <span style={{ color: bx.textMuted }}>(optional)</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Include anything you'd like to explain" className="mt-1.5 w-full min-h-[80px] p-3 rounded-md border text-sm outline-none resize-y" style={{ background: "#242427", borderColor: "#2e2e34", color: bx.text }} />
              </div>
            </div>

            <div className="mt-6">
              <button onClick={submit} disabled={saving || !start || !end || !type}
                className="h-10 px-5 rounded-md text-sm font-semibold disabled:opacity-50"
                style={{ background: "#0d4f4f", color: "#7fd9d9" }}>
                {saving ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </BargainsShell>
  );
}
