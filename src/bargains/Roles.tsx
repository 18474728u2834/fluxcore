import { useEffect, useMemo, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDepartment } from "@/hooks/useDepartment";
import { Plus, Download, Loader2, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { ALL_PERMISSIONS, usePermissions } from "@/hooks/usePermissions";

interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string[];
  roblox_role_id: string | null;
}

// Group permissions into sections like the Hyra screenshot
const PERM_GROUPS: { title: string; keys: string[] }[] = [
  { title: "GENERAL", keys: ["view_activity", "view_config", "view_message_logs"] },
  { title: "SESSIONS", keys: ["host_shift", "host_training", "host_event", "create_shift", "create_training", "create_event", "flight_dispatch"] },
  { title: "MEMBERS", keys: ["manage_members", "promote_members", "demote_members"] },
  { title: "CONTENT", keys: ["post_wall", "delete_wall", "manage_documents", "manage_loa", "manage_applications"] },
];

function PermSwitch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative inline-flex items-center w-10 h-5 rounded-full transition-colors"
      style={{ background: on ? bx.coral : "#2c2c30" }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

export default function BRoles({ embedded = false }: { embedded?: boolean } = {} as any) {
  const { workspaceId, isOwner } = useWorkspace();
  const { hasPermission } = usePermissions();
  const canEditRoles = isOwner || hasPermission("edit_roles");
  const { scope, newRowDepartmentId, department } = useDepartment();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [autoSync, setAutoSync] = useState(false);

  const selected = useMemo(() => roles.find(r => r.id === selectedId) || null, [roles, selectedId]);

  const fetchRoles = async () => {
    const q = supabase.from("workspace_roles")
      .select("id, name, color, position, permissions, roblox_role_id")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true });
    const { data } = await scope(q);
    const list = ((data || []) as any[]).map(r => ({
      ...r,
      permissions: Array.isArray(r.permissions) ? (r.permissions as string[]) : [],
    })) as Role[];
    setRoles(list);
    setSelectedId(prev => prev && list.some(r => r.id === prev) ? prev : (list[0]?.id || null));
  };

  useEffect(() => {
    if (!workspaceId) return;
    fetchRoles().finally(() => setLoading(false));
  }, [workspaceId, department?.id]);

  useEffect(() => {
    if (!workspaceId) return;
    supabase.from("workspaces").select("auto_rank_enabled").eq("id", workspaceId).maybeSingle()
      .then(({ data }) => setAutoSync(!!(data as any)?.auto_rank_enabled));
  }, [workspaceId]);

  const createRole = async () => {
    const { data, error } = await supabase.from("workspace_roles").insert({
      workspace_id: workspaceId,
      department_id: newRowDepartmentId,
      name: "New role", color: bx.coral, permissions: [], position: roles.length,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await fetchRoles();
    setSelectedId(data.id);
  };

  const deleteRole = async (id: string) => {
    await supabase.from("workspace_members").update({ role_id: null, role: "Member" }).eq("role_id", id);
    await supabase.from("workspace_roles").delete().eq("id", id);
    toast.success("Role deleted");
    fetchRoles();
  };

  const updateRole = async (patch: Partial<Role>) => {
    if (!selected) return;
    const next = { ...selected, ...patch };
    setRoles(rs => rs.map(r => r.id === selected.id ? next : r));
    await supabase.from("workspace_roles").update({
      name: next.name, color: next.color, permissions: next.permissions,
    }).eq("id", selected.id);
  };

  const togglePerm = (key: string) => {
    if (!selected) return;
    const has = selected.permissions.includes(key);
    const perms = has ? selected.permissions.filter(p => p !== key) : [...selected.permissions, key];
    updateRole({ permissions: perms });
  };

  const importRoles = async () => {
    setImporting(true);
    try {
      const res = await supabase.functions.invoke("roblox-rank", {
        body: { action: "import_roles", workspace_id: workspaceId },
      });
      const errMsg = res.error?.message || (res.data as any)?.error;
      if (errMsg) toast.error("Import failed: " + errMsg);
      else { toast.success(`Imported ${(res.data as any)?.imported || 0} roles`); fetchRoles(); }
    } catch (e: any) { toast.error(e.message); }
    setImporting(false);
  };

  const toggleAutoSync = async () => {
    const next = !autoSync;
    setAutoSync(next);
    const { error } = await supabase.from("workspaces").update({ auto_rank_enabled: next }).eq("id", workspaceId);
    if (error) { toast.error(error.message); setAutoSync(!next); return; }
    toast.success(next ? "Auto-add members enabled" : "Auto-add disabled");
  };

  const Wrap = ({ children }: { children: React.ReactNode }) =>
    embedded ? <>{children}</> : <BargainsShell>{children}</BargainsShell>;

  if (!canEditRoles) {
    return (
      <Wrap>
        <div className="max-w-md mx-auto mt-20 rounded-md border p-8 text-center" style={bx.cardStyle}>
          <Shield className="w-8 h-8 mx-auto mb-3" style={{ color: bx.textMuted }} />
          <p className="text-sm" style={{ color: bx.textDim }}>You need the Edit Roles permission to manage roles.</p>
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          {!embedded && <h1 className="text-[2rem] font-bold tracking-[-0.03em] leading-none" style={{ color: bx.text }}>Roles</h1>}
          <div className="flex items-center gap-3 ml-auto">
            <label className="flex items-center gap-2 text-xs" style={{ color: bx.textDim }}>
              <PermSwitch on={autoSync} onChange={toggleAutoSync} />
              Auto-add new members every minute
            </label>
            <button onClick={importRoles} disabled={importing}
              className="h-9 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 border"
              style={{ background: "#1a1a1c", color: bx.text, borderColor: "#2e2e34" }}>
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Import Roles
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" style={{ color: bx.coral }} /></div>
        ) : (
          <div className="grid grid-cols-12 gap-5 min-h-[520px]">
            {/* Sidebar */}
            <div className="col-span-4 rounded-md border overflow-hidden flex flex-col" style={bx.cardStyle}>
              <button onClick={createRole}
                className="m-3 h-10 rounded-md text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                style={{ background: bx.coral, color: "#fff" }}>
                <Plus className="w-4 h-4" /> Create Role
              </button>
              <div className="flex-1 overflow-y-auto">
                {roles.map(r => (
                  <button key={r.id} onClick={() => setSelectedId(r.id)}
                    className="w-full text-left px-4 py-3 text-sm flex items-center gap-2.5 border-l-2 transition-colors"
                    style={{
                      background: selectedId === r.id ? "#222226" : "transparent",
                      color: selectedId === r.id ? bx.text : bx.textDim,
                      borderLeftColor: selectedId === r.id ? bx.coral : "transparent",
                    }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                    {r.name}
                  </button>
                ))}
                {roles.length === 0 && (
                  <div className="p-6 text-center text-xs" style={{ color: bx.textMuted }}>No roles yet.</div>
                )}
              </div>
            </div>

            {/* Editor */}
            <div className="col-span-8 rounded-md border p-6" style={bx.cardStyle}>
              {!selected ? (
                <div className="text-center py-20 text-sm" style={{ color: bx.textDim }}>Select a role to edit</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold" style={{ color: bx.text }}>Edit Role — {selected.name}</h2>
                    <button onClick={() => deleteRole(selected.id)}
                      className="h-8 w-8 rounded-md inline-flex items-center justify-center hover:bg-[#2a2a2e]"
                      style={{ color: bx.textDim }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: bx.textDim }}>Role Name</label>
                      <input value={selected.name} onChange={e => updateRole({ name: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border text-sm outline-none"
                        style={{ background: "#141416", borderColor: "#2e2e34", color: bx.text }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: bx.textDim }}>Color</label>
                      <input type="color" value={selected.color} onChange={e => updateRole({ color: e.target.value })}
                        className="h-10 w-20 rounded-md border-0 cursor-pointer bg-transparent" />
                    </div>
                  </div>

                  <div className="text-xs font-bold mb-3" style={{ color: bx.textDim }}>PERMISSIONS</div>
                  <div className="space-y-5">
                    {PERM_GROUPS.map(group => (
                      <div key={group.title}>
                        <div className="text-[10px] font-bold tracking-wider mb-2" style={{ color: bx.textMuted }}>{group.title}</div>
                        <div className="rounded-md border overflow-hidden" style={{ borderColor: "#26262a", background: "#141416" }}>
                          {group.keys.map((key, i) => {
                            const perm = ALL_PERMISSIONS.find(p => p.key === key);
                            if (!perm) return null;
                            const on = selected.permissions.includes(key);
                            return (
                              <div key={key} className="flex items-center justify-between px-4 py-3"
                                style={{ borderTop: i === 0 ? "none" : "1px solid #22222a" }}>
                                <div className="min-w-0 pr-4">
                                  <div className="text-sm font-semibold" style={{ color: bx.text }}>{perm.label}</div>
                                  <div className="text-xs mt-0.5" style={{ color: bx.textMuted }}>{perm.description}</div>
                                </div>
                                <PermSwitch on={on} onChange={() => togglePerm(key)} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Wrap>
  );
}
