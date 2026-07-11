import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  name: string;
  roblox_group_id: string | null;
  verified_official: boolean;
  marquee_featured: boolean;
};

async function callStaff<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("staff-actions", { body: { action, ...payload } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export default function MarqueeTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { workspaces } = await callStaff<{ workspaces: Row[] }>("list_marquee_workspaces", {
        query, featured_only: featuredOnly,
      });
      setRows(workspaces || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [featuredOnly]);

  const toggle = async (id: string, featured: boolean) => {
    setBusyId(id);
    // Optimistic
    setRows((r) => r.map((x) => (x.id === id ? { ...x, marquee_featured: featured } : x)));
    try {
      await callStaff("set_marquee_featured", { workspace_id: id, featured });
    } catch (e: any) {
      toast.error(e.message || "Failed");
      setRows((r) => r.map((x) => (x.id === id ? { ...x, marquee_featured: !featured } : x)));
    } finally {
      setBusyId(null);
    }
  };

  const featuredCount = rows.filter((r) => r.marquee_featured).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/40 backdrop-blur p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Toggle which workspaces appear in the <span className="text-foreground font-medium">"Trusted by Roblox communities"</span> marquee on the homepage.
            If no workspaces are featured, the marquee falls back to verified + newest.
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search workspaces by name…"
            className="pl-9"
          />
        </div>
        <Button onClick={load} variant="outline">Search</Button>
        <label className="flex items-center gap-2 text-sm shrink-0">
          <Switch checked={featuredOnly} onCheckedChange={setFeaturedOnly} />
          Featured only
        </label>
      </div>

      <div className="text-xs text-muted-foreground">
        {featuredCount} featured · {rows.length} shown
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No workspaces match.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 backdrop-blur px-4 py-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{w.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  Group {w.roblox_group_id || "—"}{w.verified_official ? " · Verified" : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {busyId === w.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={w.marquee_featured}
                  onCheckedChange={(v) => toggle(w.id, v)}
                  aria-label="Feature in marquee"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
