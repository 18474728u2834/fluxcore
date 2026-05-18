import { useEffect, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { RobloxAvatar } from "@/components/RobloxAvatar";

export default function BMembers() {
  const { workspaceId } = useWorkspace();
  const [members, setMembers] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [memRes, wsRes] = await Promise.all([
        supabase.from("workspace_members")
          .select("user_id, role, created_at, roblox_username, roblox_user_id")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        supabase.from("workspaces").select("owner_id, created_at").eq("id", workspaceId).maybeSingle(),
      ]);
      const list = (memRes.data || []) as any[];
      const ownerId = (wsRes.data as any)?.owner_id;
      if (ownerId && !list.some(m => m.user_id === ownerId)) {
        const { data: vu } = await supabase
          .from("verified_users")
          .select("roblox_username, roblox_user_id")
          .eq("user_id", ownerId)
          .maybeSingle();
        list.unshift({
          user_id: ownerId,
          role: "Owner",
          created_at: (wsRes.data as any)?.created_at || new Date().toISOString(),
          roblox_username: (vu as any)?.roblox_username || "Owner",
          roblox_user_id: (vu as any)?.roblox_user_id || "",
        });
      } else if (ownerId) {
        // Promote owner row to top and re-label
        const idx = list.findIndex(m => m.user_id === ownerId);
        if (idx >= 0) { list[idx].role = "Owner"; const [o] = list.splice(idx, 1); list.unshift(o); }
      }
      setMembers(list);
    })();
  }, [workspaceId]);

  const filtered = members.filter(m => (m.roblox_username || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <BargainsShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Members</h1>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: bx.textMuted }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members..."
            className="w-full h-10 pl-9 pr-3 rounded-md text-sm outline-none border"
            style={{ background: "#1a1a1c", borderColor: "#26262a", color: bx.text }} />
        </div>

        <div className="rounded-md border overflow-hidden" style={bx.cardStyle}>
          {filtered.map((m, i) => (
            <div key={m.user_id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1f1f22] transition-colors"
              style={{ borderTop: i === 0 ? "none" : "1px solid #22222a" }}>
              <RobloxAvatar username={m.roblox_username || "?"} userId={m.roblox_user_id || ""} className="w-10 h-10 rounded-md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: bx.text }}>{m.roblox_username || "Unknown"}</div>
                <div className="text-xs" style={{ color: bx.textMuted }}>Joined {new Date(m.created_at).toLocaleDateString()}</div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider"
                style={{ background: "rgba(245,90,74,0.12)", color: bx.coral }}>{m.role}</span>
            </div>
          ))}
          {filtered.length === 0 && <div className="p-12 text-center text-sm" style={{ color: bx.textDim }}>No members found.</div>}
        </div>
      </div>
    </BargainsShell>
  );
}
