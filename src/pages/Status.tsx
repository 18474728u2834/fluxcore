import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, AlertOctagon, Wrench, Loader2 } from "lucide-react";

type Component = { id: string; name: string; slug: string; description: string | null; current_status: string };
type Check = { component_id: string; status: string; checked_at: string };
type Incident = { id: string; title: string; status: string; severity: string; started_at: string; resolved_at: string | null };
type Update = { id: string; incident_id: string; body: string; status: string; created_at: string };
type Maintenance = { id: string; title: string; body: string | null; scheduled_start: string; scheduled_end: string; status: string };

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  operational: { label: "Operational", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  degraded_performance: { label: "Degraded performance", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: AlertTriangle },
  partial_outage: { label: "Partial outage", color: "text-orange-500 bg-orange-500/10 border-orange-500/20", icon: AlertTriangle },
  major_outage: { label: "Major outage", color: "text-red-500 bg-red-500/10 border-red-500/20", icon: AlertOctagon },
  under_maintenance: { label: "Maintenance", color: "text-sky-500 bg-sky-500/10 border-sky-500/20", icon: Wrench },
};

export default function Status() {
  const [components, setComponents] = useState<Component[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [incComponents, setIncComponents] = useState<{ incident_id: string; component_id: string }[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Fluxcore Status";
    (async () => {
      const since = new Date(Date.now() - 90 * 86400_000).toISOString();
      const [{ data: comps }, { data: chks }, { data: incs }, { data: upds }, { data: ic }, { data: mnt }] = await Promise.all([
        supabase.from("status_components").select("*").order("sort_order"),
        supabase.from("status_checks").select("component_id,status,checked_at").gte("checked_at", since).order("checked_at", { ascending: false }).limit(10000),
        supabase.from("status_incidents").select("*").gte("started_at", since).order("started_at", { ascending: false }),
        supabase.from("status_incident_updates").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("status_incident_components").select("incident_id,component_id"),
        supabase.from("status_maintenance").select("*").gte("scheduled_end", new Date().toISOString()).order("scheduled_start"),
      ]);
      setComponents((comps as Component[]) || []);
      setChecks((chks as Check[]) || []);
      setIncidents((incs as Incident[]) || []);
      setUpdates((upds as Update[]) || []);
      setIncComponents((ic as any) || []);
      setMaintenance((mnt as Maintenance[]) || []);
      setLoading(false);
    })();
  }, []);

  const overall = useMemo(() => {
    if (components.some(c => c.current_status === "major_outage")) return "major_outage";
    if (components.some(c => c.current_status === "partial_outage")) return "partial_outage";
    if (components.some(c => c.current_status === "degraded_performance")) return "degraded_performance";
    if (components.some(c => c.current_status === "under_maintenance")) return "under_maintenance";
    return "operational";
  }, [components]);

  // Uptime% per component (last 90d). Combine automated pings + incidents.
  const uptimeByComp = useMemo(() => {
    const out: Record<string, { pct: number; days: { date: string; status: string }[] }> = {};
    const now = Date.now();
    for (const c of components) {
      const cChecks = checks.filter(k => k.component_id === c.id);
      const cIncs = incidents.filter(i => incComponents.some(ic => ic.component_id === c.id && ic.incident_id === i.id));
      const days: { date: string; status: string }[] = [];
      let upCount = 0;
      for (let d = 89; d >= 0; d--) {
        const day = new Date(now - d * 86400_000);
        const dayStart = new Date(day.setHours(0, 0, 0, 0));
        const dayEnd = new Date(dayStart.getTime() + 86400_000);
        const dayChecks = cChecks.filter(k => { const t = new Date(k.checked_at).getTime(); return t >= dayStart.getTime() && t < dayEnd.getTime(); });
        const dayIncs = cIncs.filter(i => {
          const s = new Date(i.started_at).getTime();
          const e = i.resolved_at ? new Date(i.resolved_at).getTime() : now;
          return s < dayEnd.getTime() && e > dayStart.getTime();
        });
        let status: string = "operational";
        if (dayIncs.some(i => i.severity === "critical")) status = "major_outage";
        else if (dayIncs.some(i => i.severity === "major")) status = "partial_outage";
        else if (dayIncs.length) status = "degraded_performance";
        else if (dayChecks.length) {
          const downs = dayChecks.filter(k => k.status !== "operational").length;
          if (downs > 0) status = downs / dayChecks.length > 0.3 ? "partial_outage" : "degraded_performance";
        }
        if (status === "operational") upCount++;
        days.push({ date: dayStart.toISOString(), status });
      }
      const considered = days.filter(d => d.status !== "no_data").length || 1;
      const upConsidered = days.filter(d => d.status === "operational").length;
      out[c.id] = { pct: (upConsidered / considered) * 100, days };
    }
    return out;
  }, [components, checks, incidents, incComponents]);

  const overallMeta = STATUS_META[overall];
  const OverallIcon = overallMeta.icon;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-outfit">
      <header className="border-b border-border/40">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">Fluxcore<span className="text-primary"> · Status</span></Link>
          <a href="https://fluxcore.works" className="text-sm text-muted-foreground hover:text-foreground">fluxcore.works →</a>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <Card className={`p-6 border ${overallMeta.color} glass`}>
          <div className="flex items-center gap-3">
            <OverallIcon className="w-7 h-7" />
            <div>
              <div className="text-xl font-semibold">{overall === "operational" ? "All systems operational" : overallMeta.label}</div>
              <div className="text-xs text-muted-foreground">Updated {new Date().toLocaleString()}</div>
            </div>
          </div>
        </Card>

        {maintenance.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Scheduled maintenance</h2>
            <div className="space-y-2">
              {maintenance.map(m => (
                <Card key={m.id} className="p-4 glass">
                  <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-sky-500" /><span className="font-medium">{m.title}</span></div>
                  {m.body && <p className="text-sm text-muted-foreground mt-1">{m.body}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(m.scheduled_start).toLocaleString()} → {new Date(m.scheduled_end).toLocaleString()}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Components</h2>
          <div className="space-y-3">
            {components.map(c => {
              const meta = STATUS_META[c.current_status] || STATUS_META.operational;
              const Icon = meta.icon;
              const ut = uptimeByComp[c.id];
              return (
                <Card key={c.id} className="p-4 glass">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium flex items-center gap-2"><Icon className="w-4 h-4" />{c.name}</div>
                      {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                    </div>
                    <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                  </div>
                  {ut && (
                    <div>
                      <div className="flex gap-[2px] h-8">
                        {ut.days.map((d, i) => (
                          <div key={i} title={`${new Date(d.date).toLocaleDateString()} — ${d.status.replace(/_/g, " ")}`}
                            className={`flex-1 rounded-sm ${d.status === "operational" ? "bg-emerald-500" : d.status === "degraded_performance" ? "bg-amber-500" : d.status === "partial_outage" ? "bg-orange-500" : d.status === "major_outage" ? "bg-red-500" : "bg-muted"}`} />
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>90 days ago</span>
                        <span>{ut.pct.toFixed(2)}% uptime</span>
                        <span>Today</span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past incidents</h2>
          {incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incidents reported in the last 90 days.</p>
          ) : (
            <div className="space-y-3">
              {incidents.map(i => (
                <Card key={i.id} className="p-4 glass">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{i.title}</div>
                    <Badge variant="outline">{i.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{i.severity} · {new Date(i.started_at).toLocaleString()}{i.resolved_at && ` → resolved ${new Date(i.resolved_at).toLocaleString()}`}</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {updates.filter(u => u.incident_id === i.id).map(u => (
                      <div key={u.id} className="border-l-2 border-border/40 pl-3">
                        <Badge variant="outline" className="text-xs mr-2">{u.status}</Badge>
                        {u.body}
                        <div className="text-xs text-muted-foreground mt-0.5">{new Date(u.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <footer className="border-t border-border/40 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-xs text-muted-foreground flex justify-between">
          <span>© Fluxcore Systems</span>
          <a href="https://fluxcore.works" className="hover:text-foreground">Back to Fluxcore</a>
        </div>
      </footer>
    </div>
  );
}
