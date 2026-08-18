import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Trash2, ImageIcon, FileDown, Plus } from "lucide-react";
import { toast } from "sonner";

type Creation = {
  id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  published: boolean;
  sort_order: number;
  created_at: string;
};

export const signCreationUrl = async (path: string | null) => {
  if (!path) return null;
  const { data } = await supabase.storage.from("creations").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
};

const prettySize = (bytes?: number | null) => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

export default function CreationsTab() {
  const [items, setItems] = useState<Creation[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [published, setPublished] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("creations")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const rows = (data as Creation[]) || [];
    setItems(rows);
    const map: Record<string, string> = {};
    await Promise.all(rows.map(async (r) => {
      const url = await signCreationUrl(r.image_path);
      if (url) map[r.id] = url;
    }));
    setPreviews(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const uploadTo = async (f: File, folder: string) => {
    const ext = f.name.split(".").pop() || "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("creations").upload(path, f, { contentType: f.type || undefined });
    if (error) throw error;
    return path;
  };

  const create = async () => {
    if (!name.trim()) { toast.error("Give the creation a name"); return; }
    setBusy(true);
    try {
      const image_path = image ? await uploadTo(image, "images") : null;
      const file_path = file ? await uploadTo(file, "files") : null;
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("creations").insert({
        name: name.trim(),
        description: description.trim() || null,
        image_path,
        file_path,
        file_name: file?.name ?? null,
        file_size: file?.size ?? null,
        published,
        created_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Creation published");
      setName(""); setDescription(""); setImage(null); setFile(null); setPublished(true);
      load();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const togglePublished = async (c: Creation) => {
    const { error } = await supabase.from("creations").update({ published: !c.published }).eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (c: Creation) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const paths = [c.image_path, c.file_path].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("creations").remove(paths);
    const { error } = await supabase.from("creations").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const download = async (c: Creation) => {
    const url = await signCreationUrl(c.file_path);
    if (!url) return toast.error("No file attached");
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card/40 backdrop-blur p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">New creation</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fluxcore Application Center v2" />
          </div>
          <div className="space-y-2">
            <Label>Cover picture</Label>
            <Input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this creation, how to use it..." />
          </div>
          <div className="space-y-2">
            <Label>File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={published} onCheckedChange={setPublished} id="pub" />
            <Label htmlFor="pub">Visible on the public creations channel</Label>
          </div>
        </div>
        <Button onClick={create} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Publish creation
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No creations yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card/40 backdrop-blur overflow-hidden flex flex-col">
              <div className="aspect-video bg-muted/30 flex items-center justify-center overflow-hidden">
                {previews[c.id] ? (
                  <img src={previews[c.id]} alt={`${c.name} cover`} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{c.name}</h3>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${c.published ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
                    {c.published ? "Live" : "Hidden"}
                  </span>
                </div>
                {c.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">{c.description}</p>}
                {c.file_name && (
                  <p className="text-xs text-muted-foreground">{c.file_name} · {prettySize(c.file_size)}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {c.file_path && (
                    <Button size="sm" variant="outline" onClick={() => download(c)}>
                      <FileDown className="w-3.5 h-3.5 mr-1.5" /> Download
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => togglePublished(c)}>
                    {c.published ? "Hide" : "Publish"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(c)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
