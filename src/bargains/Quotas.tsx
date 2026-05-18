import { useEffect, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { Filter, ArrowDownUp, Plus, MessageSquare, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { RobloxAvatar } from "@/components/RobloxAvatar";

interface MemberRow {
  user_id: string;
  roblox_username: string;
  roblox_user_id: string;
  role: string;
  minutes: number;
  sessionsHosted: number;
  warnings: number;
  messages: number;
  lastSeen: string | null;
}

export default function BQuotas() {
  const { workspaceId } = useWorkspace();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    (async () => {
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7); weekStart.setHours(0,0,0,0);
      const [mem, act, hosted] = await Promise.all([
        supabase.from("workspace_members").select("user_id, role, roblox_username, roblox_user_id").eq("workspace_id", workspaceId),
        supabase.from("activity_sessions").select("roblox_user_id, duration_seconds, idle_seconds, joined_at, left_at").eq("workspace_id", workspaceId).eq("discarded", false).gte("joined_at", weekStart.toISOString()),
        supabase.from("scheduled_sessions").select("host_id").eq("workspace_id", workspaceId).eq("status", "completed").gte("scheduled_at", weekStart.toISOString()),
      ]);

      const minutesMap = new Map<string, number>();
      const lastSeen = new Map<string, string>();
      const now = Date.now();
      for (const s of (act.data || []) as any[]) {
        const sec = s.duration_seconds != null
          ? Math.max(0, s.duration_seconds - (s.idle_seconds || 0))
          : Math.max(0, Math.floor((now - new Date(s.joined_at).getTime())/1000) - (s.idle_seconds || 0));
        minutesMap.set(s.roblox_user_id, (minutesMap.get(s.roblox_user_id) || 0) + Math.round(sec/60));
        const prev = lastSeen.get(s.roblox_user_id);
        if (!prev || s.joined_at > prev) lastSeen.set(s.roblox_user_id, s.joined_at);
      }
      const hostedMap = new Map<string, number>();
      for (const h of (hosted.data || []) as any[]) {
        if (h.host_id) hostedMap.set(h.host_id, (hostedMap.get(h.host_id) || 0) + 1);
      }

      const out: MemberRow[] = (mem.data || []).map((m: any) => ({
        user_id: m.user_id,
        roblox_username: m.roblox_username || "Unknown",
        roblox_user_id: m.roblox_user_id || "",
        role: m.role,
        minutes: minutesMap.get(m.roblox_user_id) || 0,
        sessionsHosted: hostedMap.get(m.user_id) || 0,
        warnings: 0,
        messages: 0,
        lastSeen: lastSeen.get(m.roblox_user_id) || null,
      }));
      setRows(out);
    })();
  }, [workspaceId]);

  const sorted = [...rows].sort((a,b) => sortDesc ? b.minutes - a.minutes : a.minutes - b.minutes);

  return (
    <BargainsShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: bx.text }}>Most Minutes</h1>

        {/* Toolbar */}
        <div className="flex items-center gap-1 -mx-2">
          {[
            { icon: Filter, label: "Filter" },
            { icon: ArrowDownUp, label: "Sort", active: true, onClick: () => setSortDesc(s => !s) },
          ].map(({ icon: Icon, label, active, onClick }) => (
            <button key={label} onClick={onClick}
              className="inline-flex items-center gap-2 px-3 h-8 rounded-md text-sm transition-colors"
              style={{
                color: active ? bx.coral : bx.textDim,
                background: active ? "rgba(245,90,74,0.10)" : "transparent",
              }}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sorted.map((r) => (
            <div key={r.user_id} className="rounded-xl border overflow-hidden" style={bx.cardStyle}>
              <div className="px-5 pt-3 pb-1">
                <button className="inline-flex items-center justify-center w-5 h-5 rounded text-[11px]"
                  style={{ background: "#22222a", color: bx.textDim }}>+</button>
              </div>
              <div className="px-5 pb-3 flex items-center gap-3">
                <RobloxAvatar username={r.roblox_username} userId={r.roblox_user_id} className="w-9 h-9 rounded-full" />
                <div className="font-semibold text-[15px]" style={{ color: bx.text }}>
                  {r.roblox_username} <span style={{ color: bx.textMuted }}>•</span>{" "}
                  <span style={{ color: bx.textDim }}>{r.role}</span>
                </div>
              </div>
              <div className="px-5 grid grid-cols-3 gap-2">
                {[
                  { v: r.minutes,        l: "Last Week's Minutes" },
                  { v: r.sessionsHosted, l: "Sessions Hosted" },
                  { v: 0,                l: "Last Week's Sessions" },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ background: "#141416", border: "1px solid #22222a" }}>
                    <div className="text-[1.6rem] font-bold leading-none tabular-nums tracking-tight" style={{ color: bx.text }}>{s.v}</div>
                    <div className="text-[11px] mt-1.5 font-medium" style={{ color: bx.textDim }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 mt-3 flex items-center gap-3 text-[11px]" style={{ background: "#141416", color: bx.textDim }}>
                <span className="inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" style={{ color: "#e0a64a" }} /> {r.warnings}</span>
                <span className="inline-flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> {r.messages}</span>
                <span className="ml-2">Last Seen: {r.lastSeen ? new Date(r.lastSeen).toLocaleDateString() : "Never"}</span>
              </div>
            </div>
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="rounded-xl border p-16 text-center" style={bx.cardStyle}>
            <p className="text-sm" style={{ color: bx.textDim }}>No members yet.</p>
          </div>
        )}
      </div>
    </BargainsShell>
  );
}
