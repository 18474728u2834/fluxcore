import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Save, Trash2, ArrowUp, ArrowDown, Sparkles, Layout, Eye, Monitor, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { SiteDesignRenderer } from "@/components/SiteDesignRenderer";
import {
  DEFAULT_THEME, SECTION_LABELS, newSection, normalizeDesign,
  type Section, type SectionType, type SiteDesign, type SiteTheme,
} from "@/lib/siteDesign";

const SECTION_TYPES = Object.keys(SECTION_LABELS) as SectionType[];

type ThemePreset = { name: string; theme: SiteTheme };
const PRESET_KEY = "fluxcore.themePresets";

function readPresets(): ThemePreset[] {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writePresets(list: ThemePreset[]) {
  try { localStorage.setItem(PRESET_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/** Text input with an AI grammar-fix button. */
function AiField({
  label, value, onChange, kind, multiline,
}: { label: string; value: string; onChange: (v: string) => void; kind: string; multiline?: boolean }) {
  const [busy, setBusy] = useState(false);

  const polish = async () => {
    if (!value.trim()) return toast.error("Nothing to polish yet");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("polish-copy", { body: { text: value, kind } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      onChange((data as any).text);
      toast.success("Copy polished");
    } catch (e: any) {
      toast.error(e.message || "AI could not polish this text");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <button
          type="button"
          onClick={polish}
          disabled={busy}
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Fix with AI
        </button>
      </div>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function SectionEditor({
  section, onChange, onRemove, onMove, first, last,
}: {
  section: Section;
  onChange: (s: Section) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  first: boolean;
  last: boolean;
}) {
  const set = (patch: Partial<Section>) => onChange({ ...section, ...patch });
  const items = section.items || [];
  const setItem = (i: number, patch: Partial<{ title: string; desc: string }>) =>
    set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });

  const hasItems = ["features", "stats", "faq", "logos"].includes(section.type);
  const hasCta = ["hero", "cta"].includes(section.type);

  return (
    <div className="rounded-xl border border-border/50 p-4 space-y-3 bg-card/40">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{SECTION_LABELS[section.type]}</Badge>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" disabled={first} onClick={() => onMove(-1)} aria-label="Move up">
          <ArrowUp className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" disabled={last} onClick={() => onMove(1)} aria-label="Move down">
          <ArrowDown className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove section">
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      {section.type === "hero" && (
        <AiField label="Eyebrow" kind="eyebrow" value={section.eyebrow || ""} onChange={(v) => set({ eyebrow: v })} />
      )}
      {section.type !== "image" && (
        <AiField label="Title" kind="heading" value={section.title || ""} onChange={(v) => set({ title: v })} />
      )}
      {["hero", "features", "cta"].includes(section.type) && (
        <AiField label="Subtitle" kind="subheading" value={section.subtitle || ""} onChange={(v) => set({ subtitle: v })} />
      )}
      {section.type === "text" && (
        <AiField label="Body" kind="paragraph" multiline value={section.body || ""} onChange={(v) => set({ body: v })} />
      )}

      {hasCta && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Button label</Label>
            <Input value={section.ctaLabel || ""} onChange={(e) => set({ ctaLabel: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Button link</Label>
            <Input value={section.ctaHref || ""} onChange={(e) => set({ ctaHref: e.target.value })} placeholder="/login" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Secondary label</Label>
            <Input value={section.secondaryLabel || ""} onChange={(e) => set({ secondaryLabel: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Secondary link</Label>
            <Input value={section.secondaryHref || ""} onChange={(e) => set({ secondaryHref: e.target.value })} placeholder="/pricing" />
          </div>
        </div>
      )}

      {["hero", "image"].includes(section.type) && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Image URL</Label>
          <Input value={section.imageUrl || ""} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://…" />
        </div>
      )}

      {["hero", "text"].includes(section.type) && (
        <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
          <Label className="text-sm">Center the text</Label>
          <Switch checked={section.align !== "left"} onCheckedChange={(v) => set({ align: v ? "center" : "left" })} />
        </div>
      )}

      {hasItems && (
        <div className="space-y-2 pt-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Items</div>
          {items.map((it, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  value={it.title}
                  onChange={(e) => setItem(i, { title: e.target.value })}
                  placeholder={section.type === "stats" ? "99.9%" : "Title"}
                />
                <Button variant="ghost" size="icon" onClick={() => set({ items: items.filter((_, idx) => idx !== i) })} aria-label="Remove item">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              {section.type !== "logos" && (
                <AiField
                  label={section.type === "stats" ? "Label" : "Description"}
                  kind={section.type === "stats" ? "label" : "paragraph"}
                  value={it.desc}
                  onChange={(v) => setItem(i, { desc: v })}
                />
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1" onClick={() => set({ items: [...items, { title: "", desc: "" }] })}>
            <Plus className="w-3.5 h-3.5" /> Add item
          </Button>
        </div>
      )}
    </div>
  );
}

export default function WebsiteBuilderTab() {
  const [designs, setDesigns] = useState<SiteDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SiteDesign | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [presets, setPresets] = useState<ThemePreset[]>(() => readPresets());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("site_designs").select("*").order("updated_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error("Failed to load designs");
    const list = (data || []).map(normalizeDesign);
    setDesigns(list);
    if (!selectedId && list.length) { setSelectedId(list[0].id); setDraft(list[0]); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const select = (d: SiteDesign) => { setSelectedId(d.id); setDraft(d); };

  const create = async () => {
    const { data, error } = await supabase
      .from("site_designs")
      .insert({
        name: "New design",
        target: "landing",
        ui_label: "Fluxcore",
        theme: DEFAULT_THEME as any,
        sections: [newSection("hero"), newSection("features"), newSection("cta")] as any,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    const d = normalizeDesign(data);
    setDesigns((x) => [d, ...x]);
    select(d);
    toast.success("Design created");
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_designs")
      .update({
        name: draft.name,
        target: draft.target,
        ui_label: draft.ui_label,
        theme: draft.theme as any,
        sections: draft.sections as any,
      })
      .eq("id", draft.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setDesigns((x) => x.map((d) => (d.id === draft.id ? draft : d)));
    toast.success("Design saved");
  };

  const publish = async (on: boolean) => {
    if (!draft) return;
    if (on) {
      // Only one active design per target.
      await supabase.from("site_designs").update({ is_active: false }).eq("target", draft.target).neq("id", draft.id);
    }
    const { error } = await supabase.from("site_designs").update({ is_active: on }).eq("id", draft.id);
    if (error) return toast.error(error.message);
    toast.success(on ? "Design is now live" : "Design unpublished");
    setDraft({ ...draft, is_active: on });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("site_designs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setDesigns((x) => x.filter((d) => d.id !== id));
    if (selectedId === id) { setSelectedId(null); setDraft(null); }
    toast.success("Design deleted");
  };

  const setTheme = (patch: Partial<SiteTheme>) => draft && setDraft({ ...draft, theme: { ...draft.theme, ...patch } });
  const setSections = (sections: Section[]) => draft && setDraft({ ...draft, sections });

  const savePreset = () => {
    if (!draft) return;
    const name = window.prompt("Name this theme", draft.name || "My theme");
    if (!name?.trim()) return;
    const next = [...presets.filter((p) => p.name !== name.trim()), { name: name.trim(), theme: draft.theme }];
    setPresets(next);
    writePresets(next);
    toast.success("Theme saved");
  };

  const applyPreset = (p: ThemePreset) => {
    if (!draft) return;
    setDraft({ ...draft, theme: { ...p.theme } });
    toast.success(`Applied "${p.name}"`);
  };

  const deletePreset = (name: string) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    writePresets(next);
  };


  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl border border-border/50 p-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Layout className="w-4 h-4 text-primary" /> Website builder
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compose pages section by section, name the UI, and publish it to the landing page or as the workspace skin.
            All existing Nexus features keep working — you only design the look.
          </p>
        </div>
        <Button onClick={create} className="gap-2"><Plus className="w-4 h-4" /> New design</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          {designs.map((d) => (
            <div
              key={d.id}
              className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                selectedId === d.id ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/40"
              }`}
              onClick={() => select(d)}
            >
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-foreground truncate flex-1">{d.name}</div>
                {d.is_active && <Badge className="text-[10px]">Live</Badge>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                {d.target === "landing" ? <Eye className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                {d.target === "landing" ? "Landing page" : "Workspace design"} · {d.ui_label}
              </div>
            </div>
          ))}
          {!designs.length && <p className="text-sm text-muted-foreground">No designs yet.</p>}
        </div>

        {draft ? (
          <div className="space-y-4">
            <div className="glass rounded-xl border border-border/50 p-5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Design name</Label>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">What the UI is called</Label>
                  <Input value={draft.ui_label} onChange={(e) => setDraft({ ...draft, ui_label: e.target.value })} placeholder="Nexus UI" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["landing", "workspace"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDraft({ ...draft, target: t })}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      draft.target === t ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/40"
                    }`}
                  >
                    <div className="text-sm font-semibold text-foreground">
                      {t === "landing" ? "Landing page" : "Workspace design"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t === "landing"
                        ? "Replaces the public homepage at fluxcore.works."
                        : "Skins every workspace dashboard — colors, corners, font and UI name."}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={save} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </Button>
                <Button variant={draft.is_active ? "secondary" : "outline"} onClick={() => publish(!draft.is_active)}>
                  {draft.is_active ? "Unpublish" : "Publish live"}
                </Button>
                <Button variant="ghost" onClick={() => remove(draft.id)} className="gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>
            </div>

            <div className="glass rounded-xl border border-border/50 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Look</h3>
              <div className="grid gap-3 sm:grid-cols-4">
                {([
                  ["primary", "Accent"], ["background", "Background"], ["surface", "Cards"], ["foreground", "Text"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={draft.theme[key]}
                        onChange={(e) => setTheme({ [key]: e.target.value } as any)}
                        className="h-9 w-10 rounded border border-border bg-transparent"
                      />
                      <Input value={draft.theme[key]} onChange={(e) => setTheme({ [key]: e.target.value } as any)} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Corner radius: {draft.theme.radius}px</Label>
                  <input
                    type="range" min={0} max={28} value={draft.theme.radius}
                    onChange={(e) => setTheme({ radius: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Font</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(["outfit", "inter", "mono", "serif"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setTheme({ font: f })}
                        className={`rounded-md border px-2.5 py-1 text-xs capitalize ${
                          draft.theme.font === f ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground"
                        }`}
                      >{f}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Spacing</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(["compact", "comfortable", "spacious"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setTheme({ density: d })}
                        className={`rounded-md border px-2.5 py-1 text-xs capitalize ${
                          draft.theme.density === d ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground"
                        }`}
                      >{d}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <Label className="text-sm">Gradient glow</Label>
                <Switch checked={draft.theme.gradient} onCheckedChange={(v) => setTheme({ gradient: v })} />
              </div>

              <div className="space-y-2 pt-1 border-t border-border/50">
                <div className="flex flex-wrap items-center gap-2 pt-3">
                  <Button size="sm" variant="outline" className="gap-1" onClick={savePreset}>
                    <Save className="w-3.5 h-3.5" /> Save this theme
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    onClick={() => { setDraft({ ...draft, theme: { ...DEFAULT_THEME } }); toast.success("Theme reset to default"); }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to default
                  </Button>
                </div>
                {presets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((p) => (
                      <div key={p.name} className="flex items-center gap-1 rounded-md border border-border/60 pl-2.5 pr-1 py-1">
                        <button className="text-xs text-foreground" onClick={() => applyPreset(p)}>{p.name}</button>
                        <button
                          className="text-destructive/80 hover:text-destructive"
                          aria-label={`Delete ${p.name}`}
                          onClick={() => deletePreset(p.name)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {draft.target === "landing" && (
              <div className="glass rounded-xl border border-border/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Sections</h3>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Live preview</Label>
                    <Switch checked={showPreview} onCheckedChange={setShowPreview} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SECTION_TYPES.map((t) => (
                    <Button key={t} size="sm" variant="outline" className="gap-1"
                      onClick={() => setSections([...draft.sections, newSection(t)])}>
                      <Plus className="w-3.5 h-3.5" /> {SECTION_LABELS[t]}
                    </Button>
                  ))}
                </div>

                <div className="space-y-3">
                  {draft.sections.map((s, i) => (
                    <SectionEditor
                      key={s.id}
                      section={s}
                      first={i === 0}
                      last={i === draft.sections.length - 1}
                      onChange={(next) => setSections(draft.sections.map((x, idx) => (idx === i ? next : x)))}
                      onRemove={() => setSections(draft.sections.filter((_, idx) => idx !== i))}
                      onMove={(dir) => {
                        const arr = [...draft.sections];
                        const j = i + dir;
                        if (j < 0 || j >= arr.length) return;
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                        setSections(arr);
                      }}
                    />
                  ))}
                  {!draft.sections.length && (
                    <p className="text-sm text-muted-foreground">Add your first section above.</p>
                  )}
                </div>
              </div>
            )}

            {draft.target === "landing" && showPreview && (
              <div className="rounded-xl border border-border/50 overflow-hidden relative isolate">
                <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/50 bg-card relative z-10">Live preview</div>
                <div className="max-h-[640px] overflow-auto relative z-0" style={{ contain: "paint" }}>
                  <SiteDesignRenderer design={draft} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass rounded-xl border border-border/50 p-8 text-sm text-muted-foreground">
            Select a design on the left, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}
