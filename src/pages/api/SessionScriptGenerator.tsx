import { useState } from "react";
import { Loader2, Plus, Sparkles, Upload, X, Wand2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CodeBlock } from "./ApiLayout";

type Field = { key: string; label: string; example: string };

const DEFAULT_FIELDS: Field[] = [
  { key: "host", label: "Host", example: "@NovaDev" },
  { key: "time", label: "Time", example: "8 PM EST" },
  { key: "link", label: "Game Link", example: "https://roblox.com/games/1234" },
];

export function SessionScriptGenerator() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sessionName, setSessionName] = useState("Training Session");
  const [description, setDescription] = useState("");
  const [gameLink, setGameLink] = useState("");
  const [pingRole, setPingRole] = useState("");
  const [notes, setNotes] = useState("");
  const [fields, setFields] = useState<Field[]>(DEFAULT_FIELDS);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ module_script: string; handler_script: string; instructions: string } | null>(null);

  const addField = () => setFields([...fields, { key: "", label: "", example: "" }]);
  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));
  const updateField = (i: number, patch: Partial<Field>) => {
    setFields(fields.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  };

  const onUpload = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 4 - images.length);
    const datas: string[] = [];
    for (const f of arr) {
      if (f.size > 4 * 1024 * 1024) {
        toast.error(`${f.name} is over 4 MB`);
        continue;
      }
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      datas.push(data);
    }
    setImages([...images, ...datas]);
  };

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const cleanFields = fields
        .filter(f => f.key.trim() && f.label.trim())
        .map(f => ({ key: f.key.trim(), label: f.label.trim(), example: f.example.trim() }));
      if (cleanFields.length === 0) {
        toast.error("Add at least one field");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("generate-session-script", {
        body: {
          session_name: sessionName,
          description,
          game_link: gameLink,
          ping_role_id: pingRole,
          notes,
          fields: cleanFields,
          images,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
      setStep(3);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setResult(null);
  };

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card/40 to-card/10 p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">AI Session Board Generator</h2>
            <p className="text-xs text-muted-foreground">Generate a ModuleScript + handler that updates your in-game session board (SurfaceGui) live.</p>
          </div>
        </div>
        <div className="flex gap-1 text-[10px]">
          {[1, 2, 3].map(n => (
            <div key={n} className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {n}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold">1. Tell us about your sessions</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Label label="Session name">
              <input className="input-field" value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Training Session" />
            </Label>
            <Label label="Game link (optional)">
              <input className="input-field" value={gameLink} onChange={e => setGameLink(e.target.value)} placeholder="https://www.roblox.com/games/..." />
            </Label>
          </div>

          <Label label="Description (what is this board for?)">
            <textarea className="input-field min-h-[60px]" value={description} onChange={e => setDescription(e.target.value)} placeholder="Lobby board showing the next training session..." />
          </Label>

          <Label label="Anything specific about your board? (optional)">
            <input className="input-field" value={pingRole} onChange={e => setPingRole(e.target.value)} placeholder="e.g. Part named SessionBoard, 30s refresh..." />
          </Label>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TextLabels on your board</div>
            <p className="text-xs text-muted-foreground">Each key should match a TextLabel name inside your SurfaceGui. The script fills them in live.</p>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className="input-field col-span-3" placeholder="key (host)" value={f.key} onChange={e => updateField(i, { key: e.target.value })} />
                  <input className="input-field col-span-3" placeholder="Label (Host)" value={f.label} onChange={e => updateField(i, { label: e.target.value })} />
                  <input className="input-field col-span-5" placeholder="Example value" value={f.example} onChange={e => updateField(i, { example: e.target.value })} />
                  <button onClick={() => removeField(i)} className="col-span-1 h-9 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <button onClick={addField} className="text-xs flex items-center gap-1 text-primary hover:underline">
              <Plus className="w-3 h-3" /> Add field
            </button>
          </div>

          <Label label="Anything else? (style, colors, behaviour)">
            <textarea className="input-field min-h-[50px]" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Format time as 12h EST, show ‘LIVE NOW’ if session is active..." />
          </Label>

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
              Next: Upload board photo →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold">2. Upload screenshots of your session template (optional)</div>
          <p className="text-xs text-muted-foreground">Drop in screenshots of how your session announcements look in Discord, in-game, or anywhere else. The AI will mimic the layout. Up to 4 images, 4 MB each.</p>

          <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => onUpload(e.target.files)} />
            <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <div className="text-sm font-medium">Click to upload images</div>
            <div className="text-xs text-muted-foreground">PNG, JPG, WebP</div>
          </label>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border">
                  <img src={src} className="w-full h-full object-cover" />
                  <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="h-9 px-3 rounded-md border border-border text-sm">← Back</button>
            <button onClick={generate} disabled={loading} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Wand2 className="w-3.5 h-3.5" /> Generate scripts</>}
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-4">
          <div className="text-sm font-semibold">3. Your scripts are ready</div>
          {result.instructions && (
            <div className="rounded-md border border-border bg-card/30 p-4 text-sm text-foreground/90 whitespace-pre-wrap">{result.instructions}</div>
          )}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">ModuleScript — place in ReplicatedStorage</div>
            <CodeBlock code={result.module_script} lang="Lua" />
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Handler Script — place in ServerScriptService</div>
            <CodeBlock code={result.handler_script} lang="Lua" />
          </div>
          <div className="flex justify-end">
            <button onClick={reset} className="h-9 px-4 rounded-md border border-border text-sm">Generate another</button>
          </div>
        </div>
      )}

      <style>{`
        .input-field {
          width: 100%;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: hsl(var(--foreground));
        }
        .input-field:focus { outline: none; border-color: hsl(var(--primary)); }
      `}</style>
    </div>
  );
}

function Label({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      {children}
    </label>
  );
}
