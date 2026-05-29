import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ExternalLink, Lock, Unlock, Globe, Loader2, Sparkles } from "lucide-react";

interface Portal {
  id: string;
  subdomain: string;
  workspace_id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  accent_color: string | null;
  roblox_group_url: string | null;
  links: { label: string; url: string }[];
  status: string;
  closed_reason: string | null;
  created_at: string;
}

const empty = {
  subdomain: "",
  workspace_id: "",
  name: "",
  tagline: "",
  logo_url: "",
  accent_color: "#10b981",
  roblox_group_url: "",
  links_text: "",
};

export default function PartnerPortalsTab() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("partner_portals").select("*").order("created_at", { ascending: false });
    setPortals((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const sub = form.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!sub || !form.workspace_id.trim() || !form.name.trim()) {
      toast.error("Subdomain, workspace ID and name are required");
      return;
    }
    const links = form.links_text
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [label, url] = line.split("|").map(s => s?.trim());
        return label && url ? { label, url } : null;
      })
      .filter(Boolean) as { label: string; url: string }[];

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("partner_portals").insert({
      subdomain: sub,
      workspace_id: form.workspace_id.trim(),
      name: form.name.trim(),
      tagline: form.tagline.trim() || null,
      logo_url: form.logo_url.trim() || null,
      accent_color: form.accent_color || "#10b981",
      roblox_group_url: form.roblox_group_url.trim() || null,
      links,
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Portal ${sub}.fluxcore.works created`);
    setOpen(false);
    setForm(empty);
    load();
  };

  const reopen = async (id: string) => {
    const { error } = await supabase.from("partner_portals").update({ status: "active", closed_reason: null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Portal re-opened");
    load();
  };

  const close = async () => {
    if (!closingId) return;
    const { error } = await supabase.from("partner_portals").update({ status: "closed", closed_reason: closeReason || "No reason provided" }).eq("id", closingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Portal closed");
    setClosingId(null);
    setCloseReason("");
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name} portal?`)) return;
    const { error } = await supabase.from("partner_portals").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Portal deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Partner Portals</h2>
          <p className="text-sm text-muted-foreground">Custom-branded subdomain staff portals (e.g. shoply.fluxcore.works)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> New Portal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create partner portal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Subdomain</Label>
                  <Input value={form.subdomain} onChange={e => setForm({ ...form, subdomain: e.target.value })} placeholder="shoply" />
                  <p className="text-[10px] text-muted-foreground mt-1">→ {form.subdomain || "name"}.fluxcore.works</p>
                </div>
                <div>
                  <Label>Workspace ID</Label>
                  <Input value={form.workspace_id} onChange={e => setForm({ ...form, workspace_id: e.target.value })} placeholder="uuid" />
                </div>
              </div>
              <div>
                <Label>Display name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Shoply Shopping" />
              </div>
              <div>
                <Label>Tagline</Label>
                <Input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="Roblox's leading Ro-Store" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Logo URL</Label>
                  <Input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>Accent color</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })} className="w-14 p-1 h-10" />
                    <Input value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <Label>Roblox group URL</Label>
                <Input value={form.roblox_group_url} onChange={e => setForm({ ...form, roblox_group_url: e.target.value })} placeholder="https://www.roblox.com/communities/..." />
              </div>
              <div>
                <Label>Important links</Label>
                <Textarea
                  value={form.links_text}
                  onChange={e => setForm({ ...form, links_text: e.target.value })}
                  placeholder={"Game | https://roblox.com/games/...\nDiscord | https://discord.gg/..."}
                  rows={4}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">One link per line: <code>Label | URL</code></p>
              </div>
              <Button onClick={create} disabled={saving} className="w-full">
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Create portal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : portals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No partner portals yet. Create one to give a partner a custom subdomain.
        </div>
      ) : (
        <div className="grid gap-3">
          {portals.map(p => (
            <div key={p.id} className="rounded-lg border border-border bg-card/40 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {p.logo_url ? (
                  <img src={p.logo_url} alt="" className="w-10 h-10 rounded-lg" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white" style={{ background: p.accent_color || "#10b981" }}>
                    {p.name[0]}
                  </div>
                )}
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {p.name}
                    {p.status === "closed" ? (
                      <Badge variant="destructive">Closed</Badge>
                    ) : (
                      <Badge>Active</Badge>
                    )}
                  </div>
                  <a href={`https://${p.subdomain}.fluxcore.works`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    {p.subdomain}.fluxcore.works <ExternalLink className="w-3 h-3" />
                  </a>
                  {p.status === "closed" && p.closed_reason && (
                    <p className="text-xs text-destructive mt-1">Reason: {p.closed_reason}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {p.status === "closed" ? (
                  <Button size="sm" variant="outline" onClick={() => reopen(p.id)}>
                    <Unlock className="w-3 h-3 mr-1" /> Re-open
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { setClosingId(p.id); setCloseReason(""); }}>
                    <Lock className="w-3 h-3 mr-1" /> Close
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(p.id, p.name)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!closingId} onOpenChange={(v) => !v && setClosingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close portal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason (shown to visitors)</Label>
            <Textarea value={closeReason} onChange={e => setCloseReason(e.target.value)} rows={3} placeholder="Breach of TOS" />
            <Button onClick={close} variant="destructive" className="w-full">
              <Lock className="w-4 h-4 mr-1" /> Close portal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
