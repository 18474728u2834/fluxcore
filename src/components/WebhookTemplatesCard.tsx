import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageSquare, Upload, Loader2, Trash2, Send, Plus, ChevronDown, ChevronRight, Sparkles,
} from "lucide-react";

type Category = "Shift" | "Training" | "Event";

type AdvField = { name: string; value: string; inline: boolean };
type AdvEmbed = {
  author: { name: string; url: string; icon_url: string };
  title: string;
  url: string;
  description: string;
  color: string;
  fields: AdvField[];
  image_url: string;
  thumbnail_url: string;
  footer: { text: string; icon_url: string };
  timestamp: boolean;
};

type Template = {
  workspace_id: string;
  category: Category;
  use_embed: boolean;
  title: string;
  description: string;
  color: string;
  image_url: string | null;
  image_position: "middle" | "bottom";
  link_mode: "embedded" | "plain";
  link_label: string;
  link_position: "field" | "description" | "below";
  show_claims: boolean;
  show_host: boolean;
  show_time: boolean;
  plain_message: string | null;
  // advanced
  advanced_mode: boolean;
  content: string | null;
  username: string | null;
  avatar_url: string | null;
  embeds: AdvEmbed[];
};

const CATEGORIES: Category[] = ["Shift", "Training", "Event"];

const blankField = (): AdvField => ({ name: "", value: "", inline: false });
const blankEmbed = (color = "#22c55e"): AdvEmbed => ({
  author: { name: "", url: "", icon_url: "" },
  title: "🟢 {category} Starting Now",
  url: "",
  description: "**{title}** is starting now!\n\n{link}",
  color,
  fields: [
    { name: "🕐 Starts", value: "{time}", inline: true },
    { name: "👤 Host", value: "{host}", inline: true },
  ],
  image_url: "",
  thumbnail_url: "",
  footer: { text: "", icon_url: "" },
  timestamp: true,
});

const defaultTemplate = (workspaceId: string, category: Category): Template => {
  const color = category === "Training" ? "#f59e0b" : category === "Event" ? "#8b5cf6" : "#22c55e";
  return {
    workspace_id: workspaceId,
    category,
    use_embed: true,
    title: "🟢 {category} Starting Now",
    description: "**{title}** is starting!",
    color,
    image_url: null,
    image_position: "bottom",
    link_mode: "embedded",
    link_label: "Click to join",
    link_position: "field",
    show_claims: true,
    show_host: true,
    show_time: true,
    plain_message: "🟢 **{title}** ({category}) is starting now! {link}",
    advanced_mode: false,
    content: "",
    username: null,
    avatar_url: null,
    embeds: [blankEmbed(color)],
  };
};

const normalizeEmbeds = (raw: any, fallbackColor: string): AdvEmbed[] => {
  if (!Array.isArray(raw) || raw.length === 0) return [blankEmbed(fallbackColor)];
  return raw.map((e: any) => ({
    author: { name: e?.author?.name || "", url: e?.author?.url || "", icon_url: e?.author?.icon_url || "" },
    title: e?.title || "",
    url: e?.url || "",
    description: e?.description || "",
    color: e?.color || fallbackColor,
    fields: Array.isArray(e?.fields)
      ? e.fields.map((f: any) => ({ name: f?.name || "", value: f?.value || "", inline: !!f?.inline }))
      : [],
    image_url: e?.image_url || "",
    thumbnail_url: e?.thumbnail_url || "",
    footer: { text: e?.footer?.text || "", icon_url: e?.footer?.icon_url || "" },
    timestamp: !!e?.timestamp,
  }));
};

export function WebhookTemplatesCard({ workspaceId }: { workspaceId: string }) {
  const [templates, setTemplates] = useState<Record<Category, Template>>(() => ({
    Shift: defaultTemplate(workspaceId, "Shift"),
    Training: defaultTemplate(workspaceId, "Training"),
    Event: defaultTemplate(workspaceId, "Event"),
  }));
  const [active, setActive] = useState<Category>("Shift");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [openEmbed, setOpenEmbed] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("webhook_templates")
        .select("*")
        .eq("workspace_id", workspaceId);
      const next: Record<Category, Template> = {
        Shift: defaultTemplate(workspaceId, "Shift"),
        Training: defaultTemplate(workspaceId, "Training"),
        Event: defaultTemplate(workspaceId, "Event"),
      };
      (data || []).forEach((row: any) => {
        if (!CATEGORIES.includes(row.category)) return;
        const def = defaultTemplate(workspaceId, row.category);
        next[row.category as Category] = {
          ...def,
          ...row,
          content: row.content ?? "",
          embeds: normalizeEmbeds(row.embeds, row.color || def.color),
        } as Template;
      });
      setTemplates(next);
      setLoading(false);
    })();
  }, [workspaceId]);

  const current = templates[active];

  const update = (patch: Partial<Template>) =>
    setTemplates((prev) => ({ ...prev, [active]: { ...prev[active], ...patch } }));

  const updateEmbed = (idx: number, patch: Partial<AdvEmbed>) => {
    const embeds = current.embeds.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    update({ embeds });
  };
  const updateField = (eIdx: number, fIdx: number, patch: Partial<AdvField>) => {
    const embeds = current.embeds.map((e, i) =>
      i === eIdx ? { ...e, fields: e.fields.map((f, j) => (j === fIdx ? { ...f, ...patch } : f)) } : e,
    );
    update({ embeds });
  };

  const save = async () => {
    setSaving(true);
    const row = {
      workspace_id: workspaceId,
      category: active,
      use_embed: current.use_embed,
      title: current.title,
      description: current.description,
      color: current.color,
      image_url: current.image_url,
      image_position: current.image_position,
      link_mode: current.link_mode,
      link_label: current.link_label,
      link_position: current.link_position,
      show_claims: current.show_claims,
      show_host: current.show_host,
      show_time: current.show_time,
      plain_message: current.plain_message,
      advanced_mode: current.advanced_mode,
      content: current.content,
      username: current.username,
      avatar_url: current.avatar_url,
      embeds: current.embeds as any,
    };
    const { error } = await supabase
      .from("webhook_templates")
      .upsert(row as any, { onConflict: "workspace_id,category" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(`${active} template saved`);
  };

  const uploadImage = async (file: File, onUrl: (url: string) => void) => {
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file");
    if (file.size > 4 * 1024 * 1024) return toast.error("Max 4MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${workspaceId}/${active.toLowerCase()}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("webhook-images").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data: pub } = supabase.storage.from("webhook-images").getPublicUrl(path);
    onUrl(pub.publicUrl);
    setUploading(false);
    toast.success("Image uploaded — remember to save");
  };

  const sendTest = async () => {
    await save();
    setTesting(true);
    const res = await supabase.functions.invoke("discord-notify", {
      body: { action: "test", workspace_id: workspaceId, category: active },
    });
    setTesting(false);
    if (res.data?.success) toast.success("Test sent to Discord");
    else toast.error(res.data?.error || res.error?.message || "Test failed");
  };

  const placeholders = useMemo(
    () => "{title} {category} {host} {time} {claims} {link} {rawLink} {workspace} {invite}",
    [],
  );

  if (loading) {
    return (
      <div className="glass rounded-xl p-5 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground text-sm">Discord Webhook Templates</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Customize what gets sent to Discord per category. Flip <strong>Advanced (Discohook-style)</strong>
        for full control — multiple embeds, author, fields, images, thumbnail, footer, timestamp, and
        custom webhook username/avatar. The last embed's footer is always branded
        <strong> Fluxcore Systems</strong>.
        Placeholders: <code className="text-[10px]">{placeholders}</code>.
      </p>

      <Tabs value={active} onValueChange={(v) => { setActive(v as Category); setOpenEmbed(0); }}>
        <TabsList className="grid grid-cols-3 w-full">
          {CATEGORIES.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
        </TabsList>

        {CATEGORIES.map((c) => (
          <TabsContent key={c} value={c} className="space-y-4 pt-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-gradient-to-r from-primary/10 to-transparent px-3 py-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <div>
                  <Label className="text-xs">Advanced (Discohook-style)</Label>
                  <p className="text-[11px] text-muted-foreground">Multiple embeds, fields, author, thumbnail, timestamp…</p>
                </div>
              </div>
              <Switch checked={current.advanced_mode} onCheckedChange={(v) => update({ advanced_mode: v })} />
            </div>

            {current.advanced_mode ? (
              <AdvancedEditor
                current={current}
                update={update}
                updateEmbed={updateEmbed}
                updateField={updateField}
                openEmbed={openEmbed}
                setOpenEmbed={setOpenEmbed}
                uploadImage={uploadImage}
                uploading={uploading}
                fileRef={fileRef}
              />
            ) : (
              <SimpleEditor
                current={current}
                update={update}
                uploadImage={(f) => uploadImage(f, (url) => update({ image_url: url }))}
                uploading={uploading}
                fileRef={fileRef}
              />
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save {active} template
              </Button>
              <Button size="sm" variant="secondary" onClick={sendTest} disabled={testing}>
                {testing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                Send test to Discord
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* ---------- Simple Editor (original) ---------- */

function SimpleEditor({
  current, update, uploadImage, uploading, fileRef,
}: {
  current: Template;
  update: (p: Partial<Template>) => void;
  uploadImage: (file: File) => void;
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
        <div>
          <Label className="text-xs">Send as rich embed</Label>
          <p className="text-[11px] text-muted-foreground">Off = send a plain text message instead</p>
        </div>
        <Switch checked={current.use_embed} onCheckedChange={(v) => update({ use_embed: v })} />
      </div>

      {current.use_embed ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Embed title</Label>
              <Input value={current.title} onChange={(e) => update({ title: e.target.value })} className="bg-muted border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Accent color</Label>
              <Input type="color" value={current.color} onChange={(e) => update({ color: e.target.value })} className="bg-muted border-border h-10 p-1" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea rows={2} value={current.description} onChange={(e) => update({ description: e.target.value })} className="bg-muted border-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
              <Label className="text-xs">Show start time</Label>
              <Switch checked={current.show_time} onCheckedChange={(v) => update({ show_time: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
              <Label className="text-xs">Show host</Label>
              <Switch checked={current.show_host} onCheckedChange={(v) => update({ show_host: v })} />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
              <Label className="text-xs">Show role claims</Label>
              <Switch checked={current.show_claims} onCheckedChange={(v) => update({ show_claims: v })} />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <Label className="text-xs">Image</Label>
            {current.image_url ? (
              <div className="flex items-start gap-3">
                <img src={current.image_url} alt="" className="w-20 h-20 rounded object-cover border border-border" />
                <div className="flex-1 space-y-2">
                  <Select value={current.image_position} onValueChange={(v) => update({ image_position: v as any })}>
                    <SelectTrigger className="bg-muted border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="middle">Middle (thumbnail · top-right)</SelectItem>
                      <SelectItem value="bottom">Bottom (large · embed image)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => update({ image_url: null })} className="text-destructive">
                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} />
                <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  Upload image
                </Button>
              </>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <Label className="text-xs">Game link</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={current.link_mode} onValueChange={(v) => update({ link_mode: v as any })}>
                <SelectTrigger className="bg-muted border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="embedded">Text with link embedded</SelectItem>
                  <SelectItem value="plain">Just the link as text</SelectItem>
                </SelectContent>
              </Select>
              <Select value={current.link_position} onValueChange={(v) => update({ link_position: v as any })}>
                <SelectTrigger className="bg-muted border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="field">In a field inside the embed</SelectItem>
                  <SelectItem value="description">Appended to the description</SelectItem>
                  <SelectItem value="below">Below the embed (in message content)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {current.link_mode === "embedded" && (
              <Input value={current.link_label} onChange={(e) => update({ link_label: e.target.value })}
                placeholder="Click to join"
                className="bg-muted border-border text-xs" />
            )}
          </div>
        </>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs">Plain message</Label>
          <Textarea rows={3} value={current.plain_message || ""} onChange={(e) => update({ plain_message: e.target.value })} className="bg-muted border-border" />
          <p className="text-[10px] text-muted-foreground">Use {"{link}"} for the game link.</p>
        </div>
      )}
    </>
  );
}

/* ---------- Advanced (Discohook-style) Editor ---------- */

function AdvancedEditor({
  current, update, updateEmbed, updateField, openEmbed, setOpenEmbed,
  uploadImage, uploading, fileRef,
}: {
  current: Template;
  update: (p: Partial<Template>) => void;
  updateEmbed: (idx: number, p: Partial<AdvEmbed>) => void;
  updateField: (eIdx: number, fIdx: number, p: Partial<AdvField>) => void;
  openEmbed: number;
  setOpenEmbed: (n: number) => void;
  uploadImage: (file: File, onUrl: (url: string) => void) => void;
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
}) {
  const addEmbed = () => {
    if (current.embeds.length >= 10) return toast.error("Discord max 10 embeds");
    const embeds = [...current.embeds, blankEmbed(current.color)];
    update({ embeds });
    setOpenEmbed(embeds.length - 1);
  };
  const removeEmbed = (idx: number) => {
    const embeds = current.embeds.filter((_, i) => i !== idx);
    update({ embeds: embeds.length ? embeds : [blankEmbed(current.color)] });
    setOpenEmbed(0);
  };
  const addField = (idx: number) => {
    const e = current.embeds[idx];
    if (e.fields.length >= 25) return toast.error("Discord max 25 fields");
    updateEmbed(idx, { fields: [...e.fields, blankField()] });
  };
  const removeField = (eIdx: number, fIdx: number) => {
    const e = current.embeds[eIdx];
    updateEmbed(eIdx, { fields: e.fields.filter((_, i) => i !== fIdx) });
  };

  return (
    <div className="space-y-4">
      {/* Webhook identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border bg-muted/20 p-3">
        <div className="space-y-1">
          <Label className="text-xs">Webhook username (override)</Label>
          <Input value={current.username || ""} onChange={(e) => update({ username: e.target.value || null })}
            placeholder="e.g. Fluxcore Alerts" className="bg-muted border-border text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Avatar URL (override)</Label>
          <Input value={current.avatar_url || ""} onChange={(e) => update({ avatar_url: e.target.value || null })}
            placeholder="https://…" className="bg-muted border-border text-xs" />
        </div>
      </div>

      {/* Message content */}
      <div className="space-y-1">
        <Label className="text-xs">Message content (above embeds)</Label>
        <Textarea rows={2} value={current.content || ""} onChange={(e) => update({ content: e.target.value })}
          placeholder="@everyone Optional plain message above the embeds…"
          className="bg-muted border-border text-xs" />
      </div>

      {/* Embeds */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Embeds ({current.embeds.length}/10)</Label>
          <Button size="sm" variant="secondary" onClick={addEmbed} disabled={current.embeds.length >= 10}>
            <Plus className="w-3 h-3 mr-1" /> Add embed
          </Button>
        </div>

        {current.embeds.map((embed, idx) => {
          const open = openEmbed === idx;
          return (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 overflow-hidden"
                 style={{ borderLeft: `3px solid ${embed.color}` }}>
              <button
                type="button"
                onClick={() => setOpenEmbed(open ? -1 : idx)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40"
              >
                <div className="flex items-center gap-2 text-xs">
                  {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span className="font-medium">Embed #{idx + 1}</span>
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {embed.title || embed.description || "(empty)"}
                  </span>
                  {idx === current.embeds.length - 1 && (
                    <span className="text-[9px] uppercase tracking-wide text-primary">Footer: Fluxcore Systems</span>
                  )}
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); removeEmbed(idx); }}
                  className="text-destructive hover:opacity-80 p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </span>
              </button>

              {open && (
                <div className="p-3 space-y-3 border-t border-border">
                  {/* Author */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Author</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input placeholder="Author name" value={embed.author.name}
                        onChange={(e) => updateEmbed(idx, { author: { ...embed.author, name: e.target.value } })}
                        className="bg-muted border-border text-xs" />
                      <Input placeholder="Author URL" value={embed.author.url}
                        onChange={(e) => updateEmbed(idx, { author: { ...embed.author, url: e.target.value } })}
                        className="bg-muted border-border text-xs" />
                      <Input placeholder="Author icon URL" value={embed.author.icon_url}
                        onChange={(e) => updateEmbed(idx, { author: { ...embed.author, icon_url: e.target.value } })}
                        className="bg-muted border-border text-xs" />
                    </div>
                  </div>

                  {/* Title + URL + Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Title</Label>
                      <Input value={embed.title} onChange={(e) => updateEmbed(idx, { title: e.target.value })}
                        className="bg-muted border-border text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Title URL</Label>
                      <Input value={embed.url} onChange={(e) => updateEmbed(idx, { url: e.target.value })}
                        placeholder="https://…" className="bg-muted border-border text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Color</Label>
                    <Input type="color" value={embed.color}
                      onChange={(e) => updateEmbed(idx, { color: e.target.value })}
                      className="bg-muted border-border h-9 p-1 w-20" />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Description (markdown)</Label>
                    <Textarea rows={3} value={embed.description}
                      onChange={(e) => updateEmbed(idx, { description: e.target.value })}
                      className="bg-muted border-border text-xs" />
                  </div>

                  {/* Fields */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] text-muted-foreground">Fields ({embed.fields.length}/25)</Label>
                      <Button size="sm" variant="ghost" onClick={() => addField(idx)} disabled={embed.fields.length >= 25}>
                        <Plus className="w-3 h-3 mr-1" /> Field
                      </Button>
                    </div>
                    {embed.fields.map((f, fi) => (
                      <div key={fi} className="rounded border border-border bg-muted/30 p-2 space-y-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input placeholder="Field name" value={f.name}
                            onChange={(e) => updateField(idx, fi, { name: e.target.value })}
                            className="bg-muted border-border text-xs" />
                          <Input placeholder="Field value" value={f.value}
                            onChange={(e) => updateField(idx, fi, { value: e.target.value })}
                            className="bg-muted border-border text-xs" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Switch checked={f.inline} onCheckedChange={(v) => updateField(idx, fi, { inline: v })} />
                            Inline
                          </label>
                          <Button size="sm" variant="ghost" onClick={() => removeField(idx, fi)}
                            className="text-destructive h-7 px-2">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Images */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Image (bottom, large)</Label>
                      <Input value={embed.image_url}
                        onChange={(e) => updateEmbed(idx, { image_url: e.target.value })}
                        placeholder="https://… or upload"
                        className="bg-muted border-border text-xs" />
                      <Button size="sm" variant="secondary" disabled={uploading}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file"; input.accept = "image/*";
                          input.onchange = (ev: any) => {
                            const f = ev.target.files?.[0];
                            if (f) uploadImage(f, (url) => updateEmbed(idx, { image_url: url }));
                          };
                          input.click();
                        }}>
                        {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />} Upload
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Thumbnail (top-right, small)</Label>
                      <Input value={embed.thumbnail_url}
                        onChange={(e) => updateEmbed(idx, { thumbnail_url: e.target.value })}
                        placeholder="https://… or upload"
                        className="bg-muted border-border text-xs" />
                      <Button size="sm" variant="secondary" disabled={uploading}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file"; input.accept = "image/*";
                          input.onchange = (ev: any) => {
                            const f = ev.target.files?.[0];
                            if (f) uploadImage(f, (url) => updateEmbed(idx, { thumbnail_url: url }));
                          };
                          input.click();
                        }}>
                        {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />} Upload
                      </Button>
                    </div>
                  </div>

                  {/* Footer + timestamp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Footer text {idx === current.embeds.length - 1 && <span className="text-primary">(forced to "Fluxcore Systems")</span>}
                      </Label>
                      <Input value={embed.footer.text}
                        disabled={idx === current.embeds.length - 1}
                        onChange={(e) => updateEmbed(idx, { footer: { ...embed.footer, text: e.target.value } })}
                        className="bg-muted border-border text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Footer icon URL</Label>
                      <Input value={embed.footer.icon_url}
                        onChange={(e) => updateEmbed(idx, { footer: { ...embed.footer, icon_url: e.target.value } })}
                        className="bg-muted border-border text-xs" />
                    </div>
                  </div>
                  <label className="flex items-center justify-between rounded border border-border bg-muted/30 px-3 py-2">
                    <span className="text-xs">Include timestamp</span>
                    <Switch checked={embed.timestamp} onCheckedChange={(v) => updateEmbed(idx, { timestamp: v })} />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" />
    </div>
  );
}
