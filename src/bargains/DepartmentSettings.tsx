import { useState, useEffect } from "react";
import { BargainsShell, bx } from "./Shell";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDepartment } from "@/hooks/useDepartment";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Save, Star, StarOff, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";

type Member = { id: string; roblox_username: string };

export default function BDepartmentSettings() {
  const { workspaceId, isOwner } = useWorkspace();
  const { department, loading } = useDepartment();
  const canManage = isOwner || !!department?.isLead;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [icon, setIcon] = useState("");
  const [hero, setHero] = useState("");
  const [saving, setSaving] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [leads, setLeads] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!department) return;
    setName(department.name);
    setDescription(department.description || "");
    setColor(department.primary_color || "#3b82f6");
    setIcon(department.icon || "");
    setHero(department.hero_image_url || "");
  }, [department?.id]);

  useEffect(() => {
    if (!workspaceId || !department?.id) return;
    (async () => {
      const [{ data: m }, { data: dm }, { data: dl }] = await Promise.all([
        supabase.from("workspace_members").select("id, roblox_username").eq("workspace_id", workspaceId).order("roblox_username"),
        supabase.from("department_members").select("member_id").eq("department_id", department.id),
        supabase.from("department_leads").select("member_id").eq("department_id", department.id),
      ]);
      setMembers((m as any) || []);
      setAssigned(new Set((dm || []).map((r: any) => r.member_id)));
      setLeads(new Set((dl || []).map((r: any) => r.member_id)));
    })();
  }, [workspaceId, department?.id]);

  if (loading) return <BargainsShell><div className="p-8 text-sm text-[#8a8a8e]">Loading…</div></BargainsShell>;
  if (!department) return <BargainsShell><div className="p-8 text-sm text-[#8a8a8e]">Department not found.</div></BargainsShell>;

  if (!canManage) {
    return (
      <BargainsShell>
        <div className="max-w-md mx-auto mt-16 rounded-md border p-8 text-center space-y-3" style={{ background: "#141416", borderColor: "#26262a" }}>
          <Lock className="w-8 h-8 mx-auto text-[#7a7a7e]" />
          <h1 className="text-lg font-bold">Leads only</h1>
          <p className="text-sm text-[#8a8a8e]">Only the workspace owner or a department lead can change these settings.</p>
        </div>
      </BargainsShell>
    );
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("departments").update({
      name: name.trim() || department.name,
      description: description.trim() || null,
      primary_color: color,
      icon: icon.trim() || null,
      hero_image_url: hero.trim() || null,
    }).eq("id", department.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
  };

  const toggleAssigned = async (memberId: string) => {
    const on = assigned.has(memberId);
    if (on) {
      const { error } = await supabase.from("department_members").delete()
        .eq("department_id", department.id).eq("member_id", memberId);
      if (error) { toast.error(error.message); return; }
      const ns = new Set(assigned); ns.delete(memberId); setAssigned(ns);
      // also drop lead status
      if (leads.has(memberId)) {
        await supabase.from("department_leads").delete()
          .eq("department_id", department.id).eq("member_id", memberId);
        const nl = new Set(leads); nl.delete(memberId); setLeads(nl);
      }
    } else {
      const { error } = await supabase.from("department_members").insert({ department_id: department.id, member_id: memberId });
      if (error) { toast.error(error.message); return; }
      const ns = new Set(assigned); ns.add(memberId); setAssigned(ns);
    }
  };

  const toggleLead = async (memberId: string) => {
    if (!isOwner) { toast.error("Only the workspace owner can change leads"); return; }
    const on = leads.has(memberId);
    if (on) {
      const { error } = await supabase.from("department_leads").delete()
        .eq("department_id", department.id).eq("member_id", memberId);
      if (error) { toast.error(error.message); return; }
      const nl = new Set(leads); nl.delete(memberId); setLeads(nl);
    } else {
      // ensure assigned
      if (!assigned.has(memberId)) {
        const { error: aerr } = await supabase.from("department_members").insert({ department_id: department.id, member_id: memberId });
        if (aerr) { toast.error(aerr.message); return; }
        const ns = new Set(assigned); ns.add(memberId); setAssigned(ns);
      }
      const { error } = await supabase.from("department_leads").insert({ department_id: department.id, member_id: memberId });
      if (error) { toast.error(error.message); return; }
      const nl = new Set(leads); nl.add(memberId); setLeads(nl);
    }
  };

  return (
    <BargainsShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: bx.text }}>{department.name} · Settings</h1>
          <p className="text-sm text-[#8a8a8e] mt-1">Manage this department's profile, members, and leads.</p>
        </div>

        <div className="rounded-md border p-5 space-y-4" style={{ background: "#141416", borderColor: "#26262a" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6a6a6e]">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6a6a6e]">Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="block h-10 w-20 rounded border bg-transparent" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6a6a6e]">Icon (emoji)</label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🏷️" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#6a6a6e]">Hero image URL</label>
              <Input value={hero} onChange={(e) => setHero(e.target.value)} placeholder="https://…" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-wider text-[#6a6a6e]">Description</label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save"}</Button>
        </div>

        <div className="rounded-md border p-5 space-y-3" style={{ background: "#141416", borderColor: "#26262a" }}>
          <h2 className="text-sm font-semibold">Members & leads</h2>
          <p className="text-[11px] text-[#6a6a6e]">Toggle members to add them to this department. Stars mark leads — leads can manage everything inside this department.</p>
          {members.length === 0 ? (
            <p className="text-sm text-[#8a8a8e]">No workspace members yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {members.map((m) => {
                const inDept = assigned.has(m.id);
                const isLead = leads.has(m.id);
                return (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded border" style={{ background: inDept ? color + "22" : "#0f0f10", borderColor: "#26262a" }}>
                    <button onClick={() => toggleAssigned(m.id)} className="flex-1 text-left text-sm flex items-center gap-2">
                      {inDept ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      {m.roblox_username}
                    </button>
                    {isOwner && (
                      <button onClick={() => toggleLead(m.id)} title={isLead ? "Remove lead" : "Make lead"} className="p-1 rounded hover:bg-[#22222a]" style={{ color: isLead ? "#f59e0b" : "#6a6a6e" }}>
                        {isLead ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BargainsShell>
  );
}
