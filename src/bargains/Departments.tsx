import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Plus, Trash2, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";

type Dept = { id: string; name: string; slug: string; primary_color: string | null; icon: string | null };
type Member = { id: string; roblox_username: string };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
}

export default function Departments() {
  const { workspaceId, isOwner } = useWorkspace();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Set<string>>>({});
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [newIcon, setNewIcon] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    if (!workspaceId) return;
    setLoading(true);
    const [{ data: dList }, { data: mList }] = await Promise.all([
      supabase.from("departments").select("id, name, slug, primary_color, icon").eq("workspace_id", workspaceId).order("name"),
      supabase.from("workspace_members").select("id, roblox_username").eq("workspace_id", workspaceId).order("roblox_username"),
    ]);
    setDepts((dList as Dept[]) || []);
    setMembers((mList as Member[]) || []);
    const ids = ((dList as Dept[]) || []).map((d) => d.id);
    if (ids.length) {
      const { data: dm } = await supabase
        .from("department_members")
        .select("department_id, member_id")
        .in("department_id", ids);
      const map: Record<string, Set<string>> = {};
      ids.forEach((id) => (map[id] = new Set()));
      (dm || []).forEach((row: any) => map[row.department_id]?.add(row.member_id));
      setAssignments(map);
    } else {
      setAssignments({});
    }
    setLoading(false);
  }

  useEffect(() => { reload(); }, [workspaceId]);

  async function createDept() {
    if (!workspaceId || !newName.trim()) return;
    const slug = slugify(newName);
    if (!slug) { toast.error("Pick a name with letters"); return; }
    const { error } = await supabase.from("departments").insert({
      workspace_id: workspaceId, name: newName.trim(), slug,
      primary_color: newColor, icon: newIcon.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    setNewName(""); setNewIcon("");
    toast.success(`Created /${slug}`);
    reload();
  }

  async function deleteDept(id: string) {
    if (!confirm("Delete this department? Members keep their workspace access.")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    reload();
  }

  async function toggleMember(deptId: string, memberId: string) {
    const set = assignments[deptId] || new Set<string>();
    if (set.has(memberId)) {
      const { error } = await supabase.from("department_members").delete().eq("department_id", deptId).eq("member_id", memberId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("department_members").insert({ department_id: deptId, member_id: memberId });
      if (error) { toast.error(error.message); return; }
    }
    reload();
  }

  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto mt-16 rounded-md border p-8 text-center space-y-3" style={{ background: "#141416", borderColor: "#26262a" }}>
        <Lock className="w-8 h-8 mx-auto text-[#7a7a7e]" />
        <h1 className="text-lg font-bold">Owners only</h1>
        <p className="text-sm text-[#8a8a8e]">Only the workspace owner can create and manage departments.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Departments</h1>
        <p className="text-sm text-[#8a8a8e] mt-0.5">Create teams inside this workspace. Members can switch into a department from the sidebar; department-scoped announcements, documents, and sessions stay private to its assigned members.</p>
      </div>

      <div className="rounded-md border p-5 space-y-3" style={{ background: "#1a1a1c", borderColor: "#26262a" }}>
        <h2 className="text-sm font-semibold">New department</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[11px] uppercase tracking-wider text-[#6a6a6e]">Name</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Human Resources" />
            {newName && <p className="text-[11px] text-[#6a6a6e] mt-1">URL: /{slugify(newName)}</p>}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#6a6a6e]">Color</label>
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="block h-10 w-14 rounded border bg-transparent" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#6a6a6e]">Icon (emoji, optional)</label>
            <Input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="🏷️" className="w-20" />
          </div>
          <Button onClick={createDept} disabled={!newName.trim()}><Plus className="w-4 h-4 mr-1" /> Create</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#8a8a8e]">Loading…</p>
      ) : depts.length === 0 ? (
        <p className="text-sm text-[#8a8a8e]">No departments yet.</p>
      ) : (
        <div className="space-y-4">
          {depts.map((d) => {
            const set = assignments[d.id] || new Set();
            return (
              <div key={d.id} className="rounded-md border" style={{ background: "#1a1a1c", borderColor: "#26262a" }}>
                <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "#22222a" }}>
                  <span className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: d.primary_color || "#3b82f6" }}>
                    {d.icon || d.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{d.name}</div>
                    <div className="text-[11px] text-[#6a6a6e]">/{d.slug} · {set.size} member{set.size === 1 ? "" : "s"}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteDept(d.id)} className="text-[#f55a4a]">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <div className="text-[11px] uppercase tracking-wider text-[#6a6a6e] mb-2 flex items-center gap-1"><UsersIcon className="w-3 h-3" /> Assigned members</div>
                  {members.length === 0 ? (
                    <p className="text-sm text-[#8a8a8e]">No workspace members yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {members.map((m) => {
                        const on = set.has(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleMember(d.id, m.id)}
                            className="text-xs px-2 py-1 rounded border transition-colors"
                            style={{
                              background: on ? (d.primary_color || "#3b82f6") : "#141416",
                              color: on ? "#fff" : "#cfcfd1",
                              borderColor: on ? (d.primary_color || "#3b82f6") : "#26262a",
                            }}
                          >
                            {m.roblox_username}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
