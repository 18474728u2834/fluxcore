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
import { MessageSquare, Upload, Loader2, Trash2, Send } from "lucide-react";

type Category = "Shift" | "Training" | "Event";

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
};

const CATEGORIES: Category[] = ["Shift", "Training", "Event"];

const defaultTemplate = (workspaceId: string, category: Category): Template => ({
  workspace_id: workspaceId,
  category,
  use_embed: true,
  title: "🟢 {category} Starting Now",
  description: "**{title}** is starting!",
  color: category === "Training" ? "#f59e0b" : category === "Event" ? "#8b5cf6" : "#22c55e",
  image_url: null,
  image_position: "bottom",
  link_mode: "embedded",
  link_label: "Click to join",
  link_position: "field",
  show_claims: true,
  show_host: true,
  show_time: true,
  plain_message: "🟢 **{title}** ({category}) is starting now! {link}",
});

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
        if (CATEGORIES.includes(row.category)) next[row.category as Category] = row as Template;
      });
      setTemplates(next);
      setLoading(false);
    })();
  }, [workspaceId]);

  const current = templates[active];

  const update = (patch: Partial<Template>) =>
    setTemplates((prev) => ({ ...prev, [active]: { ...prev[active], ...patch } }));

  const save = async () => {
    setSaving(true);
    const row = { ...current, workspace_id: workspaceId, category: active };
    const { error } = await supabase
      .from("webhook_templates")
      .upsert(row as any, { onConflict: "workspace_id,category" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(`${active} template saved`);
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file");
    if (file.size > 4 * 1024 * 1024) return toast.error("Max 4MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${workspaceId}/${active.toLowerCase()}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("webhook-images").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data: pub } = supabase.storage.from("webhook-images").getPublicUrl(path);
    update({ image_url: pub.publicUrl });
    setUploading(false);
    toast.success("Image uploaded — remember to save");
  };

  const removeImage = () => update({ image_url: null });

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
    () => "{title} {category} {host} {time} {claims} {link} {workspace}",
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
        Customize what gets sent to Discord when a session starts. Each category (Shift / Training / Event)
        has its own template. Footer always shows <strong>Fluxcore Systems</strong>.
        Placeholders you can use: <code className="text-[10px]">{placeholders}</code>.
      </p>

      <Tabs value={active} onValueChange={(v) => setActive(v as Category)}>
        <TabsList className="grid grid-cols-3 w-full">
          {CATEGORIES.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
        </TabsList>

        {CATEGORIES.map((c) => (
          <TabsContent key={c} value={c} className="space-y-4 pt-4">
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

                {/* Image */}
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
                        <Button size="sm" variant="ghost" onClick={removeImage} className="text-destructive">
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

                {/* Link */}
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
