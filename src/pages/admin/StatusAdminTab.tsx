import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

type Component = { id: string; name: string; slug: string; description: string | null; current_status: string; sort_order: number };
type Incident = { id: string; title: string; status: string; severity: string; started_at: string; resolved_at: string | null };
type Maintenance = { id: string; title: string; body: string | null; scheduled_start: string; scheduled_end: string; status: string };
type Banner = { id: string; message: string; level: string; link_url: string | null; link_label: string | null; active: boolean; placement: string; starts_at: string | null; ends_at: string | null };

const STATUSES = ["operational", "degraded_performance", "partial_outage", "major_outage", "under_maintenance"];
const INCIDENT_STATUSES = ["investigating", "identified", "monitoring", "resolved"];
const SEVERITIES = ["minor", "major", "critical", "maintenance"];
const LEVELS = ["info", "warning", "critical", "success"];

export default function StatusAdminTab() {
  return (
    <Tabs defaultValue="components" className="space-y-4">
      <TabsList>
        <TabsTrigger value="components">Components</TabsTrigger>
        <TabsTrigger value="incidents">Incidents</TabsTrigger>
        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        <TabsTrigger value="banners">Banners</TabsTrigger>
      </TabsList>
      <TabsContent value="components"><ComponentsTab /></TabsContent>
      <TabsContent value="incidents"><IncidentsTab /></TabsContent>
      <TabsContent value="maintenance"><MaintenanceTab /></TabsContent>
      <TabsContent value="banners"><BannersTab /></TabsContent>
    </Tabs>
  );
}

function ComponentsTab() {
  const [items, setItems] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [desc, setDesc] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("status_components").select("*").order("sort_order");
    setItems((data as Component[]) || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name || !slug) return;
    const { error } = await supabase.from("status_components").insert({ name, slug, description: desc, sort_order: items.length + 1 });
    if (error) return toast.error(error.message);
    setName(""); setSlug(""); setDesc(""); load(); toast.success("Component added");
  };
  const setStatus = async (id: string, status: string) => {
    await supabase.from("status_components").update({ current_status: status }).eq("id", id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("status_components").delete().eq("id", id); load();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3 glass">
        <h3 className="font-semibold">Add component</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Name (e.g. Marketing Site)" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Slug (e.g. web)" value={slug} onChange={e => setSlug(e.target.value)} />
          <Input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Add</Button>
      </Card>
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : items.map(c => (
        <Card key={c.id} className="p-3 flex items-center justify-between glass">
          <div>
            <div className="font-medium">{c.name} <span className="text-xs text-muted-foreground">({c.slug})</span></div>
            {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
          </div>
          <div className="flex items-center gap-2">
            <Select value={c.current_status} onValueChange={v => setStatus(c.id, v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replaceAll("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function IncidentsTab() {
  const [items, setItems] = useState<Incident[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [title, setTitle] = useState(""); const [severity, setSeverity] = useState("minor");
  const [firstUpdate, setFirstUpdate] = useState(""); const [affected, setAffected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Record<string, any[]>>({});
  const [newUpdate, setNewUpdate] = useState(""); const [newStatus, setNewStatus] = useState("investigating");

  const load = async () => {
    const [{ data: incs }, { data: comps }] = await Promise.all([
      supabase.from("status_incidents").select("*").order("started_at", { ascending: false }).limit(50),
      supabase.from("status_components").select("*").order("sort_order"),
    ]);
    setItems((incs as Incident[]) || []); setComponents((comps as Component[]) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title || !firstUpdate) return toast.error("Title and first update required");
    const { data, error } = await supabase.from("status_incidents").insert({ title, severity, status: "investigating" }).select().single();
    if (error || !data) return toast.error(error?.message || "Failed");
    await supabase.from("status_incident_updates").insert({ incident_id: data.id, body: firstUpdate, status: "investigating" });
    if (affected.length) {
      await supabase.from("status_incident_components").insert(affected.map(cid => ({ incident_id: data.id, component_id: cid })));
      await supabase.from("status_components").update({ current_status: severity === "critical" ? "major_outage" : severity === "major" ? "partial_outage" : "degraded_performance" }).in("id", affected);
    }
    setTitle(""); setFirstUpdate(""); setAffected([]); load(); toast.success("Incident posted");
  };

  const loadUpdates = async (id: string) => {
    const { data } = await supabase.from("status_incident_updates").select("*").eq("incident_id", id).order("created_at");
    setUpdates(u => ({ ...u, [id]: data || [] }));
    setExpanded(id);
  };

  const postUpdate = async (id: string) => {
    if (!newUpdate) return;
    await supabase.from("status_incident_updates").insert({ incident_id: id, body: newUpdate, status: newStatus });
    await supabase.from("status_incidents").update({ status: newStatus, resolved_at: newStatus === "resolved" ? new Date().toISOString() : null }).eq("id", id);
    if (newStatus === "resolved") {
      const { data: aff } = await supabase.from("status_incident_components").select("component_id").eq("incident_id", id);
      if (aff?.length) await supabase.from("status_components").update({ current_status: "operational" }).in("id", aff.map(a => a.component_id));
    }
    setNewUpdate(""); loadUpdates(id); load();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3 glass">
        <h3 className="font-semibold">Post new incident</h3>
        <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <Textarea placeholder="First update — what's happening?" value={firstUpdate} onChange={e => setFirstUpdate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Affected components</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {components.map(c => (
              <Badge key={c.id} variant={affected.includes(c.id) ? "default" : "outline"} className="cursor-pointer"
                onClick={() => setAffected(a => a.includes(c.id) ? a.filter(x => x !== c.id) : [...a, c.id])}>{c.name}</Badge>
            ))}
          </div>
        </div>
        <Button onClick={create}><Send className="w-4 h-4 mr-1" />Post incident</Button>
      </Card>
      {items.map(i => (
        <Card key={i.id} className="p-3 glass">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{i.title}</div>
              <div className="text-xs text-muted-foreground">{i.severity} · {i.status} · {new Date(i.started_at).toLocaleString()}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => expanded === i.id ? setExpanded(null) : loadUpdates(i.id)}>{expanded === i.id ? "Hide" : "Updates"}</Button>
          </div>
          {expanded === i.id && (
            <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
              {(updates[i.id] || []).map(u => (
                <div key={u.id} className="text-sm">
                  <Badge variant="outline" className="mr-2">{u.status}</Badge>
                  {u.body} <span className="text-xs text-muted-foreground">· {new Date(u.created_at).toLocaleString()}</span>
                </div>
              ))}
              {i.status !== "resolved" && (
                <div className="space-y-2 pt-2">
                  <Textarea placeholder="New update" value={newUpdate} onChange={e => setNewUpdate(e.target.value)} />
                  <div className="flex gap-2">
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>{INCIDENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={() => postUpdate(i.id)}>Post update</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function MaintenanceTab() {
  const [items, setItems] = useState<Maintenance[]>([]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const [start, setStart] = useState(""); const [end, setEnd] = useState("");

  const load = async () => {
    const { data } = await supabase.from("status_maintenance").select("*").order("scheduled_start", { ascending: false });
    setItems((data as Maintenance[]) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title || !start || !end) return;
    const { error } = await supabase.from("status_maintenance").insert({ title, body, scheduled_start: start, scheduled_end: end });
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); setStart(""); setEnd(""); load();
  };
  const remove = async (id: string) => { await supabase.from("status_maintenance").delete().eq("id", id); load(); };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3 glass">
        <h3 className="font-semibold">Schedule maintenance</h3>
        <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <Textarea placeholder="Details" value={body} onChange={e => setBody(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Start</Label><Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div><Label className="text-xs">End</Label><Input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></div>
        </div>
        <Button onClick={create}>Schedule</Button>
      </Card>
      {items.map(m => (
        <Card key={m.id} className="p-3 flex items-center justify-between glass">
          <div>
            <div className="font-medium">{m.title}</div>
            <div className="text-xs text-muted-foreground">{new Date(m.scheduled_start).toLocaleString()} → {new Date(m.scheduled_end).toLocaleString()}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="w-4 h-4" /></Button>
        </Card>
      ))}
    </div>
  );
}

function BannersTab() {
  const [items, setItems] = useState<Banner[]>([]);
  const [message, setMessage] = useState(""); const [level, setLevel] = useState("info");
  const [linkUrl, setLinkUrl] = useState(""); const [linkLabel, setLinkLabel] = useState("");
  const [placement, setPlacement] = useState("marketing");

  const load = async () => {
    const { data } = await supabase.from("site_banners").select("*").order("created_at", { ascending: false });
    setItems((data as Banner[]) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!message) return;
    const { error } = await supabase.from("site_banners").insert({ message, level, link_url: linkUrl || null, link_label: linkLabel || null, placement, active: true });
    if (error) return toast.error(error.message);
    setMessage(""); setLinkUrl(""); setLinkLabel(""); load(); toast.success("Banner posted");
  };
  const toggle = async (id: string, active: boolean) => { await supabase.from("site_banners").update({ active }).eq("id", id); load(); };
  const remove = async (id: string) => { await supabase.from("site_banners").delete().eq("id", id); load(); };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3 glass">
        <h3 className="font-semibold">Post site banner</h3>
        <Textarea placeholder="Banner message" value={message} onChange={e => setMessage(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={placement} onValueChange={setPlacement}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="marketing">Marketing site (/)</SelectItem>
              <SelectItem value="workspaces">Choose workspace page</SelectItem>
              <SelectItem value="all">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Link URL (optional)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
          <Input placeholder="Link label" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} />
        </div>
        <Button onClick={create}>Post banner</Button>
      </Card>
      {items.map(b => (
        <Card key={b.id} className="p-3 flex items-center justify-between glass">
          <div>
            <div className="font-medium">{b.message}</div>
            <div className="text-xs text-muted-foreground">{b.level} · {b.placement} {b.link_url && `· ${b.link_label || b.link_url}`}</div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={b.active} onCheckedChange={v => toggle(b.id, v)} />
            <Button variant="ghost" size="icon" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
