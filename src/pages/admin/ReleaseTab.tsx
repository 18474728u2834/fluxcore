import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Sparkles, Rocket } from "lucide-react";
import { toast } from "sonner";

const ICONS = ["Sparkles", "Heart", "Star", "TrendingUp", "BarChart3", "CheckCircle2", "ArrowUpRight", "Rocket", "Shield", "Zap"];

type Item = { title: string; desc: string; icon: string };
type Release = { version: string; subtitle?: string; items: Item[]; published_at?: string };

const FALLBACK_VERSION = "4.6.0";

function bump(version: string, kind: "patch" | "minor" | "major") {
  const [ma, mi, pa] = (version || "0.0.0").split(".").map((n) => parseInt(n, 10) || 0);
  if (kind === "major") return `${ma + 1}.0.0`;
  if (kind === "minor") return `${ma}.${mi + 1}.0`;
  return `${ma}.${mi}.${pa + 1}`;
}

export default function ReleaseTab() {
  const [current, setCurrent] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState("");
  const [subtitle, setSubtitle] = useState("Major update — here's what we've shipped");
  const [items, setItems] = useState<Item[]>([{ title: "", desc: "", icon: "Sparkles" }]);
  const [polishing, setPolishing] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "current_release").maybeSingle();
      const rel = (data?.value as unknown as Release) || null;
      setCurrent(rel);
      setVersion(bump(rel?.version || FALLBACK_VERSION, "minor"));
      setLoading(false);
    })();
  }, []);

  const liveVersion = current?.version || FALLBACK_VERSION;

  const setItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const polish = async () => {
    const filled = items.filter((i) => i.title.trim() || i.desc.trim());
    if (!filled.length) return toast.error("Add at least one label first");
    setPolishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("polish-release", {
        body: { version, items: filled.map(({ title, desc }) => ({ title, desc })) },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const out = (data as any).items as { title: string; desc: string }[];
      setItems(filled.map((it, idx) => ({ ...it, title: out[idx]?.title ?? it.title, desc: out[idx]?.desc ?? it.desc })));
      toast.success("Grammar polished");
    } catch (e: any) {
      toast.error(e.message || "AI could not polish this");
    } finally {
      setPolishing(false);
    }
  };

  const publish = async () => {
    const filled = items.filter((i) => i.title.trim() && i.desc.trim());
    if (!/^\d+\.\d+(\.\d+)?$/.test(version)) return toast.error("Version must look like 4.7.0");
    if (!filled.length) return toast.error("Add at least one complete label");
    setPublishing(true);
    const payload: Release = { version, subtitle, items: filled, published_at: new Date().toISOString() };
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "current_release", value: payload as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setPublishing(false);
    if (error) return toast.error(error.message);
    setCurrent(payload);
    toast.success(`v${version} pushed — every workspace owner will see it`);
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin" />;

  return (
    <div className="space-y-4">
      <Card className="p-4 glass space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Push a release update</h3>
            <p className="text-xs text-muted-foreground">
              Live version <Badge variant="outline" className="mx-1">v{liveVersion}</Badge>
              {current?.published_at && `· pushed ${new Date(current.published_at).toLocaleString()}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Recommended:</span>
            {(["patch", "minor", "major"] as const).map((k) => {
              const v = bump(liveVersion, k);
              return (
                <Badge
                  key={k}
                  variant={version === v ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => setVersion(v)}
                >
                  {k} · {v}
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Version</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="4.7.0" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Subtitle</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-4 glass space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Labels</h3>
          <Button variant="outline" size="sm" onClick={polish} disabled={polishing}>
            {polishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Fix grammar with AI
          </Button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-border/40 p-3 space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Label title (e.g. Kudos Wall)" value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} />
              <Select value={it.icon} onValueChange={(v) => setItem(i, { icon: v })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{ICONS.map((ic) => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Textarea placeholder="What changed — write it rough, the AI cleans it up" value={it.desc} onChange={(e) => setItem(i, { desc: e.target.value })} />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setItems((a) => [...a, { title: "", desc: "", icon: "Sparkles" }])}>
          <Plus className="w-4 h-4 mr-1" />Add label
        </Button>
      </Card>

      <Card className="p-4 glass space-y-3">
        <h3 className="font-semibold">Preview</h3>
        <div className="rounded-xl border border-border/40 p-4 space-y-3 bg-secondary/20">
          <div>
            <p className="font-semibold">What's New in Fluxcore v{version || "…"}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {items.filter((i) => i.title || i.desc).map((f, i) => (
            <div key={i} className="p-3 rounded-lg bg-secondary/40">
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
        <Button variant="hero" onClick={publish} disabled={publishing}>
          {publishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Rocket className="w-4 h-4 mr-1" />}
          Push update to all workspaces
        </Button>
      </Card>
    </div>
  );
}
