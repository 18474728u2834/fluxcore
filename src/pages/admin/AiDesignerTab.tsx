import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sparkles, ImagePlus, X, Loader2, Globe, Search } from "lucide-react";
import { SiteDesignRenderer } from "@/components/SiteDesignRenderer";
import { normalizeDesign, type SiteDesign } from "@/lib/siteDesign";

/** Downscales an uploaded image and returns a compact JPEG data URL. */
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function AiDesignerTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [brief, setBrief] = useState("");
  const [urls, setUrls] = useState("");
  const [search, setSearch] = useState("");
  const [useSearch, setUseSearch] = useState(false);
  const [target, setTarget] = useState<"landing" | "workspace">("landing");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SiteDesign | null>(null);
  const [sources, setSources] = useState<string[]>([]);

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const next: string[] = [];
      for (const f of Array.from(files).slice(0, 4 - images.length)) next.push(await toDataUrl(f));
      setImages((x) => [...x, ...next].slice(0, 4));
    } catch {
      toast.error("Could not read that image");
    }
  };

  const generate = async () => {
    if (!brief.trim() && !images.length && !urls.trim()) {
      return toast.error("Add a brief, an image or a reference URL first");
    }
    setBusy(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("ai-site-designer", {
      body: {
        brief,
        target,
        images,
        urls: urls.split(/[\s,]+/).filter(Boolean),
        search: useSearch ? search || brief.slice(0, 120) : "",
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message || "Generation failed");
    if ((data as any)?.error) return toast.error((data as any).error);

    const d = (data as any).design;
    setResult(normalizeDesign({ id: "preview", is_active: false, ...d }));
    setSources(((data as any).sources || []) as string[]);
    toast.success("Design generated");
  };

  const persist = async (publish: boolean) => {
    if (!result) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("site_designs")
      .insert({
        name: result.name,
        target: result.target,
        ui_label: result.ui_label,
        theme: result.theme as any,
        sections: result.sections as any,
      })
      .select("*")
      .single();
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    if (publish) {
      await supabase.from("site_designs").update({ is_active: false }).eq("target", result.target).neq("id", data.id);
      await supabase.from("site_designs").update({ is_active: true }).eq("id", data.id);
    }
    setSaving(false);
    toast.success(publish ? "Design published live" : "Saved — open Website Builder to edit it");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" /> AI website designer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>What should it build?</Label>
            <Textarea
              rows={6}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="A landing page for an airline group — dark navy, gold accents, hero about running flights, feature grid for sessions, quotas and ranking, FAQ and a signup CTA."
            />
          </div>

          <div className="space-y-2">
            <Label>Reference images</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={`Reference ${i + 1}`} className="h-16 w-24 rounded-md object-cover border" />
                  <button
                    onClick={() => setImages((x) => x.filter((_, j) => j !== i))}
                    className="absolute -right-2 -top-2 rounded-full bg-background border p-0.5"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="mr-1 h-4 w-4" /> Upload
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => addImages(e.target.files)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" /> Reference websites
            </Label>
            <Input
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://hyra.io, https://planetaryapp.us"
            />
            <p className="text-xs text-muted-foreground">Their palette, fonts and tone get read and matched.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5" /> Search the web first
              </Label>
              <Switch checked={useSearch} onCheckedChange={setUseSearch} />
            </div>
            {useSearch && (
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="modern SaaS landing pages 2026" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant={target === "landing" ? "secondary" : "outline"} size="sm" onClick={() => setTarget("landing")}>
              Landing page
            </Button>
            <Button variant={target === "workspace" ? "secondary" : "outline"} size="sm" onClick={() => setTarget("workspace")}>
              Workspace
            </Button>
          </div>

          <Button className="w-full" onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {busy ? "Designing…" : "Generate design"}
          </Button>
        </CardContent>
      </Card>

      <Card className="relative isolate overflow-hidden">
        <CardHeader className="relative z-10 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{result ? result.name : "Preview"}</CardTitle>
          {result && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => persist(false)} disabled={saving}>
                Save as draft
              </Button>
              <Button size="sm" onClick={() => persist(true)} disabled={saving}>
                Publish live
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex h-[520px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Upload pictures, write what you want, hit generate.
            </div>
          ) : (
            <>
              {sources.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {sources.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {s.replace(/^https?:\/\//, "").slice(0, 40)}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="max-h-[620px] overflow-auto rounded-lg border" style={{ contain: "paint" }}>
                <SiteDesignRenderer design={result} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
