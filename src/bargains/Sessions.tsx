import { useEffect, useState } from "react";
import { BargainsShell, bx } from "./Shell";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { RobloxAvatar } from "@/components/RobloxAvatar";

const DAYS = ["S","M","T","W","T","F","S"];

interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  host_name: string | null;
  host_id: string | null;
}

export default function BSessions() {
  const { workspaceId } = useWorkspace();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d;
  });
  const [selected, setSelected] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const from = new Date(selected); const to = new Date(selected); to.setDate(to.getDate()+2);
    supabase.from("scheduled_sessions")
      .select("id, title, scheduled_at, host_name, host_id")
      .eq("workspace_id", workspaceId)
      .gte("scheduled_at", from.toISOString())
      .lt("scheduled_at", to.toISOString())
      .order("scheduled_at", { ascending: true })
      .then(({ data }) => setSessions((data as any) || []));
  }, [workspaceId, selected]);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate()+i); return d;
  });
  const today = new Date(); today.setHours(0,0,0,0);

  const groupLabel = (d: Date) => {
    if (d.toDateString() === today.toDateString()) return "Today";
    const tom = new Date(today); tom.setDate(tom.getDate()+1);
    if (d.toDateString() === tom.toDateString()) return "Tomorrow";
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  };

  return (
    <BargainsShell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Week strip */}
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#1f1f22]" style={{ color: bx.textDim }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          {week.map((d, i) => {
            const isSel = d.toDateString() === selected.toDateString();
            return (
              <button key={i} onClick={() => setSelected(d)} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase" style={{ color: bx.textMuted }}>{DAYS[d.getDay()]}</span>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
                  style={{
                    background: isSel ? bx.coral : "#1a1a1c",
                    color: isSel ? "#fff" : bx.text,
                    border: isSel ? "none" : `1px solid ${bx.borderColor}`,
                  }}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#1f1f22]" style={{ color: bx.textDim }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-[2.25rem] font-bold tracking-[-0.035em]" style={{ color: bx.text }}>{groupLabel(selected)}</h1>
          <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold"
            style={{ background: bx.coral, color: "#fff" }}>
            <Plus className="w-4 h-4" /> Schedule
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl border p-16 text-center" style={bx.cardStyle}>
            <CalIcon className="w-10 h-10 mx-auto mb-3" style={{ color: bx.textMuted }} />
            <p className="text-sm" style={{ color: bx.textDim }}>No sessions scheduled for this day.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s) => {
              const d = new Date(s.scheduled_at);
              const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={s.id} className="rounded-xl border p-5 transition-transform hover:-translate-y-0.5"
                  style={bx.cardStyle}>
                  <div className="text-xs mb-1.5" style={{ color: bx.textDim }}>
                    {groupLabel(d)} at {time}
                  </div>
                  <div className="text-lg font-bold mb-5" style={{ color: bx.text }}>{s.title}</div>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#22222a" }}>
                    {s.host_user_id ? (
                      <RobloxAvatar username={s.host_username || ""} userId={s.host_user_id} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full" style={{ background: "#22222a" }} />
                    )}
                    {s.multi_server && (
                      <span className="text-[11px] px-2.5 py-1 rounded-md font-medium" style={{ background: "#22222a", color: bx.textDim }}>Multi Server</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BargainsShell>
  );
}
