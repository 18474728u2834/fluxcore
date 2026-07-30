import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

type Finding = { severity: "critical" | "warning" | "info"; category: string; title: string; detail: string };
type Scan = {
  id: string;
  status: string;
  critical_count: number;
  warning_count: number;
  info_count: number;
  findings: Finding[];
  duration_ms: number | null;
  triggered_by: string;
  created_at: string;
};

const sevIcon = { critical: ShieldAlert, warning: AlertTriangle, info: Info } as const;
const sevClass: Record<string, string> = {
  critical: "text-destructive",
  warning: "text-amber-400",
  info: "text-muted-foreground",
};

export default function SecurityScansTab() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("security_scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) toast.error(error.message);
    setScans(((data as unknown) as Scan[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("security-breach-scan", { body: {} });
    setRunning(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Scan failed");
      return;
    }
    toast.success("Scan complete");
    load();
  };

  const latest = scans[0];

  return (
    <div className="space-y-4">
      <Card className="p-5 glass">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${latest?.status === "ok" ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
              {latest?.status === "ok"
                ? <ShieldCheck className="w-5 h-5 text-emerald-400" />
                : <ShieldAlert className="w-5 h-5 text-destructive" />}
            </div>
            <div>
              <h3 className="font-semibold">Automated breach & fault scan</h3>
              <p className="text-sm text-muted-foreground">
                Runs automatically every day. Probes public data exposure, access-control drift, compliance deadlines and integration faults.
              </p>
              {latest && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last run {new Date(latest.created_at).toLocaleString()} · {latest.duration_ms ?? 0}ms · {latest.triggered_by === "cron" ? "scheduled" : "manual"}
                </p>
              )}
            </div>
          </div>
          <Button onClick={runNow} disabled={running} variant="outline">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Run now
          </Button>
        </div>
      </Card>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : scans.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground glass">
          No scans recorded yet. The first daily scan will appear here, or run one now.
        </Card>
      ) : (
        scans.map((s) => (
          <Card key={s.id} className="p-4 glass">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Badge variant={s.status === "ok" ? "outline" : "destructive"}>
                  {s.status === "ok" ? "No breaches" : s.status}
                </Badge>
                <span className="text-sm">{new Date(s.created_at).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  {s.critical_count} critical · {s.warning_count} warnings · {s.info_count} info
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                {openId === s.id ? "Hide" : "Details"}
              </Button>
            </div>
            {openId === s.id && (
              <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                {(s.findings || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Every check passed — nothing to report.</p>
                )}
                {(s.findings || []).map((f, i) => {
                  const Icon = sevIcon[f.severity] || Info;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${sevClass[f.severity]}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {f.title} <span className="text-xs text-muted-foreground">· {f.category}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{f.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
