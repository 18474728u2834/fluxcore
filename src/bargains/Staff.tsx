import { useEffect, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { Ban, AlertTriangle, X, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface Row {
  id: string; roblox_username: string; roblox_user_id: string;
  reason: string | null; blacklisted_at: string;
}

export default function BStaff() {
  const { workspaceId, isOwner } = useWorkspace();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canManage = isOwner || hasPermission("manage_members");

  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [u, setU] = useState("");
  const [uid, setUid] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);

  const fetch = async () => {
    const { data } = await supabase.from("workspace_blacklist").select("*")
      .eq("workspace_id", workspaceId).order("blacklisted_at", { ascending: false });
    setRows((data as any) || []);
  };

  useEffect(() => { if (workspaceId) fetch(); }, [workspaceId]);

  const add = async () => {
    if (!u.trim() || !uid.trim() || !user) return;
    setAdding(true);
    const { error } = await supabase.from("workspace_blacklist").insert({
      workspace_id: workspaceId, roblox_username: u.trim(), roblox_user_id: uid.trim(),
      reason: reason.trim() || null, blacklisted_by: user.id,
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    await supabase.from("workspace_members").delete()
      .eq("workspace_id", workspaceId).eq("roblox_user_id", uid.trim());
    toast.success(`${u} blacklisted`);
    setOpen(false); setU(""); setUid(""); setReason(""); fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("workspace_blacklist").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); fetch(); }
  };

  return (
    <BargainsShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Staff</h1>
            <p className="text-sm mt-2" style={{ color: bx.textDim }}>Blacklisted users barred from this workspace.</p>
          </div>
          {canManage && (
            <button onClick={() => setOpen(true)}
              className="h-10 px-4 rounded-md text-sm font-semibold text-white inline-flex items-center gap-1.5"
              style={{ background: bx.coral }}>
              <Ban className="w-4 h-4" /> Blacklist user
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-md border p-4" style={bx.cardStyle}>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bx.textMuted }}>Total blacklisted</div>
            <div className="text-3xl font-bold mt-1" style={{ color: bx.text }}>{rows.length}</div>
          </div>
          <div className="rounded-md border p-4" style={bx.cardStyle}>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bx.textMuted }}>Last 7 days</div>
            <div className="text-3xl font-bold mt-1" style={{ color: bx.text }}>
              {rows.filter(r => Date.now() - new Date(r.blacklisted_at).getTime() < 7 * 86400000).length}
            </div>
          </div>
          <div className="rounded-md border p-4" style={bx.cardStyle}>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bx.textMuted }}>With reason</div>
            <div className="text-3xl font-bold mt-1" style={{ color: bx.text }}>{rows.filter(r => r.reason).length}</div>
          </div>
        </div>

        <div className="rounded-md border overflow-hidden" style={bx.cardStyle}>
          <div className="px-5 py-3.5 border-b text-[11px] font-semibold uppercase tracking-wider"
            style={{ borderColor: "#22222a", color: bx.textMuted }}>Blacklist</div>
          {rows.length === 0 ? (
            <div className="p-10 text-center text-sm" style={{ color: bx.textDim }}>No blacklisted users.</div>
          ) : rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-3.5"
              style={{ borderTop: i === 0 ? "none" : "1px solid #22222a" }}>
              <div className="w-10 h-10 rounded-md grid place-items-center" style={{ background: "rgba(245,90,74,0.12)" }}>
                <UserX className="w-4 h-4" style={{ color: bx.coral }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: bx.text }}>{r.roblox_username}</div>
                <div className="text-xs truncate" style={{ color: bx.textMuted }}>
                  {r.reason || "No reason given"} • {new Date(r.blacklisted_at).toLocaleDateString()}
                </div>
              </div>
              {canManage && (
                <button onClick={() => remove(r.id)} className="text-xs font-medium hover:text-white px-3 py-1.5 rounded-md hover:bg-[#1f1f22]" style={{ color: bx.textDim }}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-md border p-6" style={bx.cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: bx.text }}>Blacklist user</h2>
              <button onClick={() => setOpen(false)} className="opacity-60 hover:opacity-100" style={{ color: bx.textDim }}><X className="w-4 h-4" /></button>
            </div>

            <div className="rounded-md p-3 flex items-start gap-2 mb-4" style={{ background: "rgba(245,90,74,0.10)", border: "1px solid rgba(245,90,74,0.25)" }}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: bx.coral }} />
              <p className="text-xs" style={{ color: "#ffb8af" }}>This removes the user from your members and stops them rejoining via invite.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bx.textMuted }}>Roblox username</label>
                <input value={u} onChange={(e) => setU(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none"
                  style={{ background: "#141416", borderColor: "#26262a", color: bx.text }} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bx.textMuted }}>Roblox user ID</label>
                <input value={uid} onChange={(e) => setUid(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none"
                  style={{ background: "#141416", borderColor: "#26262a", color: bx.text }} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bx.textMuted }}>Reason (optional)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                  className="mt-1.5 w-full px-3 py-2 rounded-md border text-sm outline-none resize-none"
                  style={{ background: "#141416", borderColor: "#26262a", color: bx.text }} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpen(false)} className="h-9 px-4 rounded-md text-sm font-medium hover:bg-[#1f1f22]" style={{ color: bx.textDim }}>Cancel</button>
              <button onClick={add} disabled={adding || !u.trim() || !uid.trim()}
                className="h-9 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: bx.coral }}>{adding ? "Blacklisting..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </BargainsShell>
  );
}
