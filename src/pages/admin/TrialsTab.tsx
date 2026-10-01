import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Search, X } from "lucide-react";
import { toast } from "sonner";

interface WsRow { id: string; name: string; owner_id: string }
type BetaVersion = "v3" | "v4";

export default function TrialsTab() {
  const [version, setVersion] = useState<BetaVersion>("v4");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<WsRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [trials, setTrials] = useState<Array<{ workspace_id: string; note: string | null; created_at: string; name?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const table = version === "v4" ? "nexus_v4_beta_access" : "nexus_v3_trials";

  const loadTrials = async () => {
    setLoading(true);
    const { data } = await supabase
      .from(table)
      .select("workspace_id, note, created_at")
      .order("created_at", { ascending: false });
    const rows = data || [];
    let named = rows as any[];
    if (rows.length) {
      const { data: ws } = await supabase.from("workspaces").select("id, name").in("id", rows.map(r => r.workspace_id));
      const byId = Object.fromEntries((ws || []).map((w: any) => [w.id, w.name]));
      named = rows.map(r => ({ ...r, name: byId[r.workspace_id] }));
    }
    setTrials(named);
    setLoading(false);
  };

  useEffect(() => { setResults([]); loadTrials(); }, [version]);

  const enabledIds = useMemo(() => new Set(trials.map(t => t.workspace_id)), [trials]);

  const search = async () => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("workspaces")
      .select("id, name, owner_id")
      .ilike("name", `%${term}%`)
      .limit(10);
    setResults((data as WsRow[]) || []);
    setSearching(false);
  };

  const grant = async (ws: WsRow) => {
    setBusy(ws.id);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from(table).insert({
      workspace_id: ws.id,
      enabled_by: auth.user?.id ?? null,
    });
    setBusy(null);
    if (error) return toast.error("Could not grant trial access");
    toast.success(`Nexus UI ${version === "v4" ? "4.0 beta" : "3.0"} unlocked for ${ws.name}`);
    loadTrials();
  };

  const revoke = async (workspaceId: string) => {
    setBusy(workspaceId);
    const { error } = await supabase.from(table).delete().eq("workspace_id", workspaceId);
    setBusy(null);
    if (error) return toast.error("Could not revoke trial access");
    toast.success("Trial access revoked");
    loadTrials();
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl border border-border/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Nexus beta access
          </h2>
          <div className="inline-flex rounded-md border border-border p-1">
            <Button size="sm" variant={version === "v4" ? "secondary" : "ghost"} onClick={() => setVersion("v4")}>4.0 Beta</Button>
            <Button size="sm" variant={version === "v3" ? "secondary" : "ghost"} onClick={() => setVersion("v3")}>3.0</Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Only listed workspaces can pick Nexus UI {version === "v4" ? "4.0 Beta" : "3.0"} in Theme settings.
        </p>

        <div className="flex gap-2 mt-4">
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") search(); }}
            placeholder="Search a workspace by name…"
          />
          <Button onClick={search} disabled={searching} className="gap-2">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map(w => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm text-foreground truncate">{w.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">{w.id}</div>
                </div>
                {enabledIds.has(w.id) ? (
                  <span className="text-xs text-primary">Already in the trial</span>
                ) : (
                  <Button size="sm" disabled={busy === w.id} onClick={() => grant(w)}>
                    {busy === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Grant access"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-xl border border-border/50 p-6">
        <h3 className="text-sm font-semibold text-foreground">Workspaces in the trial</h3>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : trials.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">No workspaces have Nexus UI {version === "v4" ? "4.0 Beta" : "3.0"} yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {trials.map(t => (
              <div key={t.workspace_id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm text-foreground truncate">{t.name || "Unknown workspace"}</div>
                  <div className="text-[11px] text-muted-foreground">Granted {new Date(t.created_at).toLocaleDateString()}</div>
                </div>
                <Button size="sm" variant="ghost" disabled={busy === t.workspace_id} onClick={() => revoke(t.workspace_id)} className="gap-1 text-destructive">
                  {busy === t.workspace_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
