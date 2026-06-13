import { useEffect, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { Pin, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDepartment } from "@/hooks/useDepartment";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface Announcement {
  id: string; title: string; content: string; author_name: string;
  pinned: boolean; created_at: string; author_id: string;
}

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function BWall() {
  const { workspaceId } = useWorkspace();
  const { scope, newRowDepartmentId, department } = useDepartment();
  const { user, robloxUsername } = useAuth();
  const { hasPermission } = usePermissions();
  const canPost = hasPermission("post_wall");
  const canDelete = hasPermission("delete_wall");
  const [posts, setPosts] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [posting, setPosting] = useState(false);

  const fetch = async () => {
    const q = supabase.from("announcements").select("*")
      .eq("workspace_id", workspaceId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    const { data } = await scope(q);
    setPosts((data as any) || []);
  };

  useEffect(() => {
    if (!workspaceId) return;
    fetch();
    const ch = supabase.channel(`wall-${workspaceId}-${newRowDepartmentId || "main"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements", filter: `workspace_id=eq.${workspaceId}` }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [workspaceId, department?.id]);

  const post = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    setPosting(true);
    const { error } = await supabase.from("announcements").insert({
      workspace_id: workspaceId,
      department_id: newRowDepartmentId,
      title: title.trim(), content: content.trim(),
      pinned, author_id: user.id, author_name: robloxUsername || "Unknown",
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Posted");
    setOpen(false); setTitle(""); setContent(""); setPinned(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  return (
    <BargainsShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Wall</h1>
            <p className="text-sm mt-2" style={{ color: bx.textDim }}>Announcements and shout-outs from the team.</p>
          </div>
          {canPost && (
            <button onClick={() => setOpen(true)}
              className="h-10 px-4 rounded-md text-sm font-semibold text-white inline-flex items-center gap-1.5"
              style={{ background: bx.coral }}>
              <Plus className="w-4 h-4" /> New post
            </button>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="rounded-md border p-10 text-center" style={bx.cardStyle}>
            <p className="text-sm" style={{ color: bx.textDim }}>Nothing on the wall yet. Be the first to post.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(p => (
              <article key={p.id} className="rounded-md border p-5" style={bx.cardStyle}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {p.pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(245,90,74,0.15)", color: bx.coral }}>
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                    <h3 className="text-base font-bold truncate" style={{ color: bx.text }}>{p.title}</h3>
                  </div>
                  {canDelete && (
                    <button onClick={() => remove(p.id)} className="opacity-60 hover:opacity-100 hover:text-[#f55a4a]" style={{ color: bx.textDim }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed" style={{ color: bx.textDim }}>{p.content}</p>
                <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: "#22222a" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md grid place-items-center text-[10px] font-bold"
                      style={{ background: "#26262a", color: bx.text }}>{p.author_name.charAt(0).toUpperCase()}</div>
                    <span className="text-xs font-medium" style={{ color: bx.text }}>{p.author_name}</span>
                  </div>
                  <span className="text-xs" style={{ color: bx.textMuted }}>{timeAgo(p.created_at)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-lg rounded-md border p-6" style={bx.cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: bx.text }}>New announcement</h2>
              <button onClick={() => setOpen(false)} className="opacity-60 hover:opacity-100" style={{ color: bx.textDim }}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bx.textMuted }}>Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the headline?"
                  className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none"
                  style={{ background: "#141416", borderColor: "#26262a", color: bx.text }} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bx.textMuted }}>Message</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Share the details..."
                  className="mt-1.5 w-full px-3 py-2 rounded-md border text-sm outline-none resize-none"
                  style={{ background: "#141416", borderColor: "#26262a", color: bx.text }} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-[#f55a4a]" />
                <span className="text-sm" style={{ color: bx.textDim }}>Pin to top</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpen(false)} className="h-9 px-4 rounded-md text-sm font-medium hover:bg-[#1f1f22]" style={{ color: bx.textDim }}>Cancel</button>
              <button onClick={post} disabled={posting || !title.trim() || !content.trim()}
                className="h-9 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: bx.coral }}>{posting ? "Publishing..." : "Publish"}</button>
            </div>
          </div>
        </div>
      )}
    </BargainsShell>
  );
}
