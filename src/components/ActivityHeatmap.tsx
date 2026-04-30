import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Loader2, Flame } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap() {
  const { workspaceId } = useWorkspace();
  const [grid, setGrid] = useState<number[][]>(() => Array.from({ length: 7 }, () => Array(24).fill(0)));
  const [loading, setLoading] = useState(true);
  const [max, setMax] = useState(0);

  useEffect(() => {
    const load = async () => {
      // last 30 days
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("activity_sessions")
        .select("joined_at, duration_seconds")
        .eq("workspace_id", workspaceId)
        .eq("discarded", false)
        .gte("joined_at", since.toISOString());

      const g = Array.from({ length: 7 }, () => Array(24).fill(0));
      let m = 0;
      for (const r of data || []) {
        const d = new Date(r.joined_at);
        const day = (d.getDay() + 6) % 7; // Mon=0
        const hour = d.getHours();
        const mins = (r.duration_seconds || 0) / 60;
        g[day][hour] += mins;
        if (g[day][hour] > m) m = g[day][hour];
      }
      setGrid(g);
      setMax(m);
      setLoading(false);
    };
    load();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  const intensity = (v: number) => {
    if (max === 0 || v === 0) return 0;
    return Math.min(1, v / max);
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" /> Activity Heatmap
        </h3>
        <span className="text-xs text-muted-foreground">Last 30 days · minutes per hour</span>
      </div>
      <div className="p-5 overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1 ml-10 mb-1">
            {HOURS.map((h) => (
              <div key={h} className="w-5 text-[9px] text-muted-foreground text-center">
                {h % 3 === 0 ? h : ""}
              </div>
            ))}
          </div>
          {DAYS.map((day, di) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <div className="w-9 text-[10px] text-muted-foreground">{day}</div>
              {HOURS.map((h) => {
                const v = grid[di][h];
                const a = intensity(v);
                return (
                  <div
                    key={h}
                    title={`${day} ${h}:00 — ${Math.round(v)} min`}
                    className="w-5 h-5 rounded-sm border border-border/30"
                    style={{ backgroundColor: a === 0 ? "hsl(var(--muted))" : `hsl(var(--primary) / ${0.15 + a * 0.85})` }}
                  />
                );
              })}
            </div>
          ))}
          <div className="flex items-center gap-2 mt-3 ml-10 text-[10px] text-muted-foreground">
            <span>Less</span>
            {[0.15, 0.4, 0.65, 0.9].map((a) => (
              <div key={a} className="w-4 h-3 rounded-sm" style={{ backgroundColor: `hsl(var(--primary) / ${a})` }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
