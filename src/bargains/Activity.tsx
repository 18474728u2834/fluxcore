import { useEffect, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { RobloxAvatar } from "@/components/RobloxAvatar";

interface Entry {
  userId: string;
  username: string;
  minutes: number;
  inGame: boolean;
}

const PODIUM_BORDER = ["#e0b542", "#b8b8c2", "#c97a3a"]; // gold / silver / bronze

export default function BActivity() {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const [rows, setRows] = useState<Entry[]>([]);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7); weekStart.setHours(0,0,0,0);
      const [act, meRow] = await Promise.all([
        supabase.from("activity_sessions")
          .select("roblox_user_id, roblox_username, duration_seconds, idle_seconds, joined_at, left_at")
          .eq("workspace_id", workspaceId).eq("discarded", false)
          .gte("joined_at", weekStart.toISOString()),
        user ? supabase.from("workspace_members").select("roblox_user_id")
          .eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      const now = Date.now();
      const map = new Map<string, Entry>();
      for (const s of (act.data || []) as any[]) {
        if (!s.roblox_user_id) continue;
        const sec = s.duration_seconds != null
          ? Math.max(0, s.duration_seconds - (s.idle_seconds || 0))
          : Math.max(0, Math.floor((now - new Date(s.joined_at).getTime())/1000) - (s.idle_seconds || 0));
        const ex = map.get(s.roblox_user_id);
        const live = s.left_at == null;
        if (ex) { ex.minutes += Math.round(sec/60); if (live) ex.inGame = true; }
        else map.set(s.roblox_user_id, {
          userId: s.roblox_user_id,
          username: s.roblox_username || "Unknown",
          minutes: Math.round(sec/60),
          inGame: live,
        });
      }
      setRows(Array.from(map.values()).sort((a,b) => b.minutes - a.minutes));
      setMeId((meRow as any)?.data?.roblox_user_id || null);
    })();
  }, [workspaceId, user]);

  const podium = rows.slice(0, 3);
  const rest   = rows.slice(3);
  const myIdx  = meId ? rows.findIndex(r => r.userId === meId) : -1;
  const me     = myIdx >= 0 ? rows[myIdx] : null;

  return (
    <BargainsShell>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podium.map((p, i) => (
            <div key={p.userId} className="rounded-md border overflow-hidden"
              style={{ ...bx.cardStyle, borderTop: `3px solid ${PODIUM_BORDER[i]}` }}>
              <div className="p-4 flex items-center gap-3">
                <RobloxAvatar username={p.username} userId={p.userId} className="w-8 h-8 rounded-md" />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold truncate" style={{ color: bx.text }}>{p.username}</div>
                  <div className="text-xs flex items-center gap-2" style={{ color: bx.textDim }}>
                    <span>{ordinal(i+1)} - {p.minutes.toLocaleString()} minutes</span>
                    {p.inGame && <InGameBadge />}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 3 - podium.length) }).map((_, i) => (
            <div key={`ph-${i}`} className="rounded-md border p-4 opacity-40" style={bx.cardStyle}>
              <div className="text-xs" style={{ color: bx.textMuted }}>No entry</div>
            </div>
          ))}
        </div>

        {/* You row */}
        {me && (
          <div className="rounded-md border px-5 py-3.5 flex items-center" style={bx.cardStyle}>
            <span className="font-bold text-sm tabular-nums w-12" style={{ color: bx.text }}>{myIdx + 1}.</span>
            <span className="text-sm font-medium" style={{ color: bx.text }}>You</span>
            <span className="ml-auto text-sm tabular-nums" style={{ color: bx.text }}>{me.minutes.toLocaleString()} minutes</span>
          </div>
        )}

        {/* Rest of the leaderboard */}
        {rest.length > 0 && (
          <div className="rounded-md border divide-y" style={{ ...bx.cardStyle, borderColor: bx.borderColor }}>
            {rest.map((r, i) => {
              const rank = i + 4;
              const isMe = meId && r.userId === meId;
              return (
                <div key={r.userId} className="flex items-center gap-3 px-5 py-3"
                  style={{ borderColor: "#22222a", background: isMe ? "rgba(245,90,74,0.06)" : "transparent" }}>
                  <span className="font-bold text-sm tabular-nums w-10" style={{ color: bx.textDim }}>{rank}.</span>
                  <RobloxAvatar username={r.username} userId={r.userId} className="w-7 h-7 rounded-md" />
                  <span className="text-sm font-medium" style={{ color: bx.text }}>{r.username}</span>
                  {r.inGame && <InGameBadge />}
                  <span className="ml-auto text-sm tabular-nums" style={{ color: bx.textDim }}>{r.minutes.toLocaleString()} minutes</span>
                </div>
              );
            })}
          </div>
        )}

        {rows.length === 0 && (
          <div className="rounded-md border p-16 text-center" style={bx.cardStyle}>
            <p className="text-sm" style={{ color: bx.textDim }}>No activity recorded yet this week.</p>
          </div>
        )}
      </div>
    </BargainsShell>
  );
}

function ordinal(n: number) {
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

function InGameBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
      In Game
    </span>
  );
}
