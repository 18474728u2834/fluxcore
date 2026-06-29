import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Copy, Trash2, Edit, Lock, ExternalLink, GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface FormRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_open: boolean;
  target_role_id: string | null;
  auto_rank_on_accept: boolean;
  notify_webhook: string | null;
}
interface Question {
  id?: string;
  label: string;
  type: "short_text" | "long_text" | "choice" | "roblox_username" | "age" | "timezone";
  options: string[];
  required: boolean;
  position: number;
}

export default function Applications() {
  const { workspaceId, isOwner } = useWorkspace();
  const { hasPermission } = usePermissions();
  const canManage = isOwner || hasPermission("manage_applications");

  const [forms, setForms] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FormRow | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data } = await supabase.from("application_forms" as any).select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    setForms((data as any) || []);
    const { data: rs } = await supabase.from("workspace_roles").select("id,name").eq("workspace_id", workspaceId);
    setRoles((rs as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [workspaceId]);

  const startNew = () => {
    setEditingId("new");
    setDraft({ id: "new", slug: "", title: "", description: "", is_open: true, target_role_id: null, auto_rank_on_accept: false, notify_webhook: "" });
    setQuestions([
      { label: "What's your timezone?", type: "timezone", options: [], required: true, position: 0 },
      { label: "Why do you want to join?", type: "long_text", options: [], required: true, position: 1 },
    ]);
  };

  const editForm = async (f: FormRow) => {
    setEditingId(f.id);
    setDraft(f);
    const { data } = await supabase.from("application_form_questions" as any).select("*").eq("form_id", f.id).order("position");
    setQuestions(((data as any) || []).map((q: any) => ({ ...q, options: q.options || [] })));
  };

  const save = async () => {
    if (!draft || !workspaceId) return;
    let formId = draft.id;
    const payload = {
      workspace_id: workspaceId,
      slug: draft.slug || draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
      title: draft.title,
      description: draft.description,
      is_open: draft.is_open,
      target_role_id: draft.target_role_id,
      auto_rank_on_accept: draft.auto_rank_on_accept,
      notify_webhook: draft.notify_webhook,
    };
    if (formId === "new") {
      const { data, error } = await supabase.from("application_forms" as any).insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      formId = (data as any).id;
    } else {
      const { error } = await supabase.from("application_forms" as any).update(payload).eq("id", formId);
      if (error) { toast.error(error.message); return; }
      await supabase.from("application_form_questions" as any).delete().eq("form_id", formId);
    }
    if (questions.length) {
      const rows = questions.map((q, i) => ({
        form_id: formId, label: q.label, type: q.type, options: q.options, required: q.required, position: i,
      }));
      await supabase.from("application_form_questions" as any).insert(rows);
    }
    toast.success("Form saved");
    setEditingId(null); setDraft(null); setQuestions([]);
    load();
  };

  const removeForm = async (id: string) => {
    if (!confirm("Delete this form and all submissions?")) return;
    await supabase.from("application_forms" as any).delete().eq("id", id);
    load();
  };

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/#/apply/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Public link copied");
  };

  if (!canManage) {
    return (
      <DashboardLayout title="Applications">
        <div className="max-w-md mx-auto mt-16 glass rounded-xl p-8 text-center space-y-3">
          <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
          <h1 className="text-lg font-bold">No access</h1>
          <p className="text-sm text-muted-foreground">You need the <strong>manage_applications</strong> permission to view forms.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (editingId && draft) {
    return (
      <DashboardLayout title="Edit Application Form">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{editingId === "new" ? "New form" : "Edit form"}</h1>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setEditingId(null); setDraft(null); }}>Cancel</Button>
              <Button onClick={save}>Save form</Button>
            </div>
          </div>

          <div className="glass rounded-xl p-5 space-y-3">
            <Input placeholder="Title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            <Textarea placeholder="Description shown to applicants" value={draft.description || ""} onChange={e => setDraft({ ...draft, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">URL slug</label>
                <Input placeholder="auto from title" value={draft.slug} onChange={e => setDraft({ ...draft, slug: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Target role on accept</label>
                <select className="w-full bg-background border border-border rounded-md h-9 px-2 text-sm" value={draft.target_role_id || ""} onChange={e => setDraft({ ...draft, target_role_id: e.target.value || null })}>
                  <option value="">— None —</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3"><Switch checked={draft.is_open} onCheckedChange={v => setDraft({ ...draft, is_open: v })} /> <span className="text-sm">Form is open for submissions</span></div>
            <div className="flex items-center gap-3"><Switch checked={draft.auto_rank_on_accept} onCheckedChange={v => setDraft({ ...draft, auto_rank_on_accept: v })} /> <span className="text-sm">Auto-rank applicant on Accept</span></div>
            <Input placeholder="Discord webhook (optional)" value={draft.notify_webhook || ""} onChange={e => setDraft({ ...draft, notify_webhook: e.target.value })} />
          </div>

          <div className="glass rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Questions</h2>
              <Button size="sm" variant="secondary" onClick={() => setQuestions([...questions, { label: "", type: "short_text", options: [], required: true, position: questions.length }])}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {questions.map((q, i) => (
              <div key={i} className="border border-border/60 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Question" value={q.label} onChange={e => { const c = [...questions]; c[i] = { ...q, label: e.target.value }; setQuestions(c); }} />
                  <select className="bg-background border border-border rounded-md h-9 px-2 text-sm" value={q.type} onChange={e => { const c = [...questions]; c[i] = { ...q, type: e.target.value as any }; setQuestions(c); }}>
                    <option value="short_text">Short text</option>
                    <option value="long_text">Long text</option>
                    <option value="choice">Multiple choice</option>
                    <option value="roblox_username">Roblox username</option>
                    <option value="age">Age</option>
                    <option value="timezone">Timezone</option>
                  </select>
                  <Button size="icon" variant="ghost" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
                </div>
                {q.type === "choice" && (
                  <Input placeholder="Comma-separated options" value={q.options.join(", ")} onChange={e => { const c = [...questions]; c[i] = { ...q, options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }; setQuestions(c); }} />
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={q.required} onCheckedChange={v => { const c = [...questions]; c[i] = { ...q, required: v }; setQuestions(c); }} /> Required
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Applications">
      <div className="max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Applications</h1>
            <p className="text-sm text-muted-foreground">Build apply-to-join forms with auto-scoring and Roblox-verified submissions.</p>
          </div>
          <Button onClick={startNew}><Plus className="w-4 h-4 mr-1" /> New form</Button>
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : forms.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center text-sm text-muted-foreground">No application forms yet. Create one to start collecting submissions.</div>
        ) : (
          <div className="glass rounded-xl divide-y divide-border/40">
            {forms.map(f => (
              <div key={f.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{f.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${f.is_open ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {f.is_open ? "Open" : "Closed"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{f.description || "No description"}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copyLink(f.id)}><Copy className="w-3 h-3 mr-1" /> Link</Button>
                <Link to={`./${f.id}/queue`}><Button size="sm" variant="secondary"><ExternalLink className="w-3 h-3 mr-1" /> Queue</Button></Link>
                <Button size="sm" variant="ghost" onClick={() => editForm(f)}><Edit className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => removeForm(f.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
