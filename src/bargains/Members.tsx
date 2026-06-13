import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BargainsShell, bx } from "./Shell";
import { Search, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDepartment } from "@/hooks/useDepartment";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const PAGE_SIZE = 50;

export default function BMembers() {
  const { workspaceId, isOwner } = useWorkspace();
  const { department } = useDepartment();
  const [members, setMembers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      const all: any[] = [];
      const CHUNK = 1000;
      for (let from = 0; ; from += CHUNK) {
        const { data, error } = await supabase.from("workspace_members")
          .select("id, user_id, role, joined_at, roblox_username, roblox_user_id")
          .eq("workspace_id", workspaceId)
          .order("joined_at", { ascending: false })
          .range(from, from + CHUNK - 1);
        if (error || !data || data.length === 0) break;
        all.push(...data);
        if (data.length < CHUNK) break;
      }

      const ownerRes = await supabase.rpc("get_workspace_owner_info" as any, { _workspace_id: workspaceId });
      const list = all.map((m: any) => ({ ...m, created_at: m.joined_at, joined_fluxcore: true }));
      const ownerInfo: any = (ownerRes.data as any)?.[0];
      const ownerId = ownerInfo?.owner_id;
      if (ownerId) {
        const idx = list.findIndex(m => m.user_id === ownerId);
        if (idx >= 0) {
          list[idx].role = "Owner";
          const [o] = list.splice(idx, 1);
          list.unshift(o);
        } else {
          list.unshift({
            user_id: ownerId,
            role: "Owner",
            created_at: new Date().toISOString(),
            roblox_username: ownerInfo.roblox_username || "Owner",
            roblox_user_id: ownerInfo.roblox_user_id || "",
            joined_fluxcore: true,
          });
        }
      }

      // Roblox group roster — show everyone (including lowest ranks) who isn't already a Fluxcore member
      const { data: ws } = await supabase.from("workspaces").select("roblox_group_id").eq("id", workspaceId).maybeSingle();
      const groupId = (ws as any)?.roblox_group_id;
      if (groupId) {
        try {
          const knownIds = new Set(list.map(m => String(m.roblox_user_id)));
          let cursor: string | null = "";
          let safety = 0;
          while (cursor !== null && safety < 100) {
            safety++;
            const url = `https://groups.roblox.com/v1/groups/${groupId}/users?limit=100&sortOrder=Desc${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const json: any = await res.json();
            for (const row of (json?.data || [])) {
              const uid = String(row?.user?.userId || "");
              if (!uid || knownIds.has(uid)) continue;
              knownIds.add(uid);
              list.push({
                roblox_user_id: uid,
                roblox_username: row?.user?.username || "Unknown",
                role: row?.role?.name || "Member",
                created_at: null,
                joined_fluxcore: false,
              });
            }
            cursor = json?.nextPageCursor || null;
          }
        } catch (e) {
          console.error("Roblox group roster fetch failed:", e);
        }
      }

      // When viewing inside a department, restrict to members assigned to it.
      let scoped = list;
      if (department?.id) {
        const { data: dm } = await supabase
          .from("department_members")
          .select("workspace_members!inner(roblox_user_id)")
          .eq("department_id", department.id);
        const deptRobloxIds = new Set((dm || []).map((r: any) => String(r.workspace_members?.roblox_user_id)).filter(Boolean));
        scoped = list.filter((m) => deptRobloxIds.has(String(m.roblox_user_id)));
      }

      if (!cancelled) setMembers(scoped);
    })();
    return () => { cancelled = true; };
  }, [workspaceId, reloadKey, department?.id]);

  useEffect(() => { setPage(1); }, [q]);

  const filtered = members.filter(m => (m.roblox_username || "").toLowerCase().includes(q.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const handleAdd = async () => {
    const raw = addQuery.trim();
    if (!raw) return;
    setAdding(true);
    try {
      let userId = "";
      let username = "";
      if (/^\d+$/.test(raw)) {
        userId = raw;
        const r = await fetch(`https://users.roblox.com/v1/users/${raw}`);
        if (!r.ok) throw new Error("Roblox user not found");
        const j = await r.json();
        username = j?.name || "";
      } else {
        const r = await fetch("https://users.roblox.com/v1/usernames/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [raw], excludeBannedUsers: false }),
        });
        if (!r.ok) throw new Error("Lookup failed");
        const j = await r.json();
        const u = j?.data?.[0];
        if (!u) throw new Error("Roblox user not found");
        userId = String(u.id);
        username = u.name;
      }

      const { error } = await supabase.from("workspace_members").insert({
        workspace_id: workspaceId,
        roblox_user_id: userId,
        roblox_username: username,
        role: "Member",
      });
      if (error) {
        if ((error.message || "").toLowerCase().includes("duplicate")) throw new Error("Already a member");
        throw error;
      }
      toast.success(`Added ${username}`);
      setAddOpen(false);
      setAddQuery("");
      setReloadKey(k => k + 1);
    } catch (e: any) {
      toast.error(e?.message || "Failed to add");
    }
    setAdding(false);
  };

  return (
    <BargainsShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Members</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: bx.textMuted }}>{filtered.length} total</span>
            {isOwner && (
              <button onClick={() => setAddOpen(true)}
                className="h-9 px-3 rounded-md text-sm font-medium border flex items-center gap-1.5 hover:bg-[#1f1f22]"
                style={{ color: bx.text, borderColor: "#26262a", background: "#1a1a1c" }}>
                <Plus className="w-3.5 h-3.5" /> Add member
              </button>
            )}
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: bx.textMuted }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members..."
            className="w-full h-10 pl-9 pr-3 rounded-md text-sm outline-none border"
            style={{ background: "#1a1a1c", borderColor: "#26262a", color: bx.text }} />
        </div>

        <div className="rounded-md border overflow-hidden" style={bx.cardStyle}>
          {paged.map((m, i) => {
            const target = m.id ? `/w/${workspaceId}/members/${m.id}` : null;
            const inner = (
              <>
                <RobloxAvatar username={m.roblox_username || "?"} userId={m.roblox_user_id || ""} className="w-10 h-10 rounded-md" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2" style={{ color: bx.text }}>
                    {m.roblox_username || "Unknown"}
                    {!m.joined_fluxcore && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider"
                        style={{ background: "#26262a", color: bx.textMuted }}>Not on Fluxcore</span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: bx.textMuted }}>
                    {m.created_at ? `Joined ${new Date(m.created_at).toLocaleDateString()}` : "From Roblox group"}
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider"
                  style={{ background: "rgba(245,90,74,0.12)", color: bx.coral }}>{m.role}</span>
              </>
            );
            const className = "flex items-center gap-4 px-5 py-3.5 hover:bg-[#1f1f22] transition-colors" + (target ? " cursor-pointer" : "");
            const style = { borderTop: i === 0 ? "none" : "1px solid #22222a" };
            return target ? (
              <Link key={m.user_id || m.roblox_user_id || i} to={target} className={className} style={style as any}>{inner}</Link>
            ) : (
              <div key={m.roblox_user_id || i} className={className} style={style as any}>{inner}</div>
            );
          })}

          {filtered.length === 0 && <div className="p-12 text-center text-sm" style={{ color: bx.textDim }}>No members found.</div>}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: bx.textMuted }}>
              Page {currentPage} of {totalPages} · Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="h-9 px-3 rounded-md text-sm font-medium border disabled:opacity-40 hover:bg-[#1f1f22]"
                style={{ color: bx.text, borderColor: "#26262a", background: "#1a1a1c" }}>Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="h-9 px-3 rounded-md text-sm font-medium border disabled:opacity-40 hover:bg-[#1f1f22]"
                style={{ color: bx.text, borderColor: "#26262a", background: "#1a1a1c" }}>Next</button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm" style={{ background: "#141416", borderColor: "#26262a", color: bx.text }}>
          <DialogHeader>
            <DialogTitle style={{ color: bx.text }}>Add member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs" style={{ color: bx.textMuted }}>Enter a Roblox username or user ID.</p>
            <input
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="e.g. Builderman or 156"
              className="w-full h-10 px-3 rounded-md text-sm outline-none border"
              style={{ background: "#1a1a1c", borderColor: "#26262a", color: bx.text }}
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={adding || !addQuery.trim()}
              className="w-full h-10 rounded-md text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: bx.coral, color: "#fff" }}>
              {adding && <Loader2 className="w-4 h-4 animate-spin" />} Add member
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </BargainsShell>
  );
}
