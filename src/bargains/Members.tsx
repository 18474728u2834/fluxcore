import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BargainsShell, bx } from "./Shell";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { RobloxAvatar } from "@/components/RobloxAvatar";

const PAGE_SIZE = 50;

export default function BMembers() {
  const { workspaceId } = useWorkspace();
  const [members, setMembers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      // Page through Supabase's 1000-row cap so we get every member.
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
      const list = all.map((m: any) => ({ ...m, created_at: m.joined_at }));
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
          });
        }
      }
      setMembers(list);
    })();
  }, [workspaceId]);

  useEffect(() => { setPage(1); }, [q]);

  const filtered = members.filter(m => (m.roblox_username || "").toLowerCase().includes(q.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <BargainsShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Members</h1>
          <span className="text-xs" style={{ color: bx.textMuted }}>{filtered.length} total</span>
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
                  <div className="text-sm font-semibold" style={{ color: bx.text }}>{m.roblox_username || "Unknown"}</div>
                  <div className="text-xs" style={{ color: bx.textMuted }}>Joined {new Date(m.created_at).toLocaleDateString()}</div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider"
                  style={{ background: "rgba(245,90,74,0.12)", color: bx.coral }}>{m.role}</span>
              </>
            );
            const className = "flex items-center gap-4 px-5 py-3.5 hover:bg-[#1f1f22] transition-colors cursor-pointer";
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
    </BargainsShell>
  );
}
