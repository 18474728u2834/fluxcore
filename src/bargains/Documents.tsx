import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BargainsShell, bx } from "./Shell";
import { Plus, FileText, BookOpen, Link2, MoreHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDepartment } from "@/hooks/useDepartment";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface Doc {
  id: string; title: string; content: string; doc_type: string;
  signature_type: string; signature_word: string | null; auto_assign: boolean;
  deadline: string | null; created_at: string; external_url?: string | null;
}

export default function BDocuments() {
  const { workspaceId, isOwner: isWsOwner } = useWorkspace();
  const { hasPermission } = usePermissions();
  const isOwner = isWsOwner || hasPermission("manage_documents");
  const { scope, newRowDepartmentId, department } = useDepartment();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [docType, setDocType] = useState("policy");
  const [externalUrl, setExternalUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const q = supabase.from("workspace_documents")
      .select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    const { data } = await scope(q);
    setDocs((data || []) as any);
  };
  useEffect(() => { load(); }, [workspaceId, department?.id]);

  const create = async () => {
    if (!title.trim() || !user) return;
    if (docType === "external") {
      if (!/^https?:\/\//i.test(externalUrl.trim())) { toast.error("Enter a valid https link"); return; }
    } else if (!content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("workspace_documents").insert({
      workspace_id: workspaceId,
      department_id: newRowDepartmentId,
      title: title.trim(),
      content: docType === "external" ? (content.trim() || "External document hosted outside Fluxcore.") : content.trim(),
      external_url: docType === "external" ? externalUrl.trim() : null,
      doc_type: docType, signature_type: "checkbox", auto_assign: false, created_by: user.id,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Created"); setOpen(false); setTitle(""); setContent(""); setExternalUrl(""); load(); }
    setSaving(false);
  };



  const groups = [
    { key: "policy", label: "Policies", Icon: FileText },
    { key: "handbook", label: "Handbooks", Icon: BookOpen },
    { key: "external", label: "External documents", Icon: Link2 },
  ];


  return (
    <BargainsShell>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Documents</h1>
          <p className="text-sm mt-2" style={{ color: bx.textDim }}>Policies, handbooks, and signed agreements</p>
        </div>

        {groups.map(g => {
          const list = docs.filter(d => {
            const t = (d.doc_type || "policy").toLowerCase();
            if (g.key === "external") return t === "external" || !!d.external_url;
            return t === g.key && !d.external_url;
          });
          return (
            <div key={g.key} className="rounded-md border p-5" style={bx.cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md flex items-center justify-center"
                    style={{ background: "#1d3a2f", color: "#7ee0b8" }}><g.Icon className="w-4 h-4" /></div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: bx.text }}>{g.label}</div>
                    <div className="text-xs" style={{ color: bx.textMuted }}>{list.length} items</div>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setDocType(g.key); setOpen(true); }}
                      className="h-9 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 text-white"
                      style={{ background: "#22c55e" }}>
                      <Plus className="w-3.5 h-3.5" /> Add content
                    </button>
                    <button className="h-9 w-9 rounded-md inline-flex items-center justify-center" style={{ background: "#242427", color: bx.textDim }}>
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {list.length === 0 ? (
                <div className="rounded-md border-2 border-dashed p-8 text-center text-sm" style={{ borderColor: "#26262a", color: bx.textMuted }}>
                  No {g.label.toLowerCase()} yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map(d => (
                    <button key={d.id} onClick={() => navigate(`/w/${workspaceId}/documents/${d.id}`)}
                      className="group text-left rounded-xl border p-4 flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:border-[#2f74a8]/60"
                      style={{ ...bx.cardInner, boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset" }}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(47,116,168,0.14)", color: "#7fbde8" }}>
                          <g.Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate" style={{ color: bx.text }}>{d.title}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: bx.textMuted }}>
                            {new Date(d.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-3" style={{ color: bx.textDim }}>
                        {d.content.slice(0, 180) || "No description"}
                      </p>
                      <div className="mt-auto pt-2 flex items-center justify-between border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md"
                          style={{ background: "rgba(255,255,255,0.05)", color: bx.textMuted }}>
                          {d.external_url ? "External" : g.label.replace(/s$/, "")}
                        </span>
                        <span className="text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#7fbde8" }}>
                          Open →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-xl rounded-md border p-7 relative" style={bx.cardStyle}>
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-[#7a7a7e] hover:text-white"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-bold" style={{ color: bx.text }}>New document</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: bx.textDim }}>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none" style={{ background: "#242427", borderColor: "#2e2e34", color: bx.text }} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: bx.textDim }}>Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none" style={{ background: "#242427", borderColor: "#2e2e34", color: bx.text }}>
                  <option value="policy">Policy</option>
                  <option value="handbook">Handbook</option>
                  <option value="external">External document / policy</option>
                </select>
              </div>
              {docType === "external" && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: bx.textDim }}>Document link</label>
                  <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://..." className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none" style={{ background: "#242427", borderColor: "#2e2e34", color: bx.text }} />
                  <p className="text-[11px] mt-1.5" style={{ color: bx.textMuted }}>Staff are redirected to this link, then return to sign.</p>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: bx.textDim }}>{docType === "external" ? "Summary (optional)" : "Content"}</label>
                <textarea value={content} onChange={e => setContent(e.target.value)} className="mt-1.5 w-full min-h-[160px] p-3 rounded-md border text-sm outline-none resize-y" style={{ background: "#242427", borderColor: "#2e2e34", color: bx.text }} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-md text-sm font-medium" style={{ background: "#242427", color: bx.text }}>Cancel</button>
              <button onClick={create} disabled={saving} className="h-10 px-5 rounded-md text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#22c55e" }}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </BargainsShell>
  );
}
