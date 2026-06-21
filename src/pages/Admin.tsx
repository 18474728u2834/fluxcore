import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Trash2, UserPlus, Sparkles, Download, MessageSquare, ScrollText, Database, Plus, Ban } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PremiumGrantManager } from "@/components/PremiumGrantManager";
import PartnerPortalsTab from "@/pages/admin/PartnerPortalsTab";
import StatusAdminTab from "@/pages/admin/StatusAdminTab";

type WhoAmI = {
  user_id: string;
  roblox_username: string;
  role: "owner_admin" | "admin";
  owner_admin: boolean;
  permissions: "*" | string[];
};

const ALL_PERMS = [
  { key: "manage_admins", label: "Manage admins" },
  { key: "create_premium_grants", label: "Create Premium grant links" },
  { key: "claim_premium_self", label: "Grant Premium to own workspace" },
  { key: "support_reply", label: "Reply to support tickets" },
  { key: "support_assign", label: "Assign / change ticket status" },
  { key: "export_user_data", label: "Export user data (GDPR)" },
  { key: "delete_users", label: "Delete user accounts" },
  { key: "delete_workspaces", label: "Delete workspaces" },
  { key: "moderate_chats", label: "Moderate workspace chats" },
  { key: "manage_blacklist", label: "Manage Fluxcore blacklist" },
  { key: "manage_status", label: "Manage status page & banners" },
  { key: "send_admin_email", label: "Send admin emails (to users or all owners)" },
];

async function callStaff<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("staff-actions", {
    body: { action, ...payload },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState<WhoAmI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    (async () => {
      try {
        const w = await callStaff<WhoAmI>("whoami");
        setMe(w);
      } catch {
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, navigate]);

  const has = (p: string) => !!me && (me.permissions === "*" || me.permissions.includes(p));

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-2">
          <Shield className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Restricted</h1>
          <p className="text-sm text-muted-foreground">You are not a Fluxcore staff member.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Shield className="w-7 h-7 text-primary" /> Staff Dashboard</h1>
            <p className="text-sm text-muted-foreground">Signed in as <span className="text-foreground font-medium">{me.roblox_username}</span> · {me.owner_admin ? "Owner Admin" : "Admin"}</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/workspaces")}>Back to app</Button>
        </header>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {me.owner_admin && <TabsTrigger value="admins">Admins</TabsTrigger>}
            {(has("create_premium_grants") || has("claim_premium_self")) && <TabsTrigger value="premium">Premium</TabsTrigger>}
            {(has("support_reply") || has("support_assign")) && <TabsTrigger value="support">Support</TabsTrigger>}
            {(has("export_user_data") || has("delete_users")) && <TabsTrigger value="users">User Data</TabsTrigger>}
            {has("delete_workspaces") && <TabsTrigger value="workspaces">Workspaces</TabsTrigger>}
            {has("moderate_chats") && <TabsTrigger value="chats">Wall Moderation</TabsTrigger>}
            {has("manage_blacklist") && <TabsTrigger value="blacklist">FC Blacklist</TabsTrigger>}
            <TabsTrigger value="portals">Partner Portals</TabsTrigger>
            {has("manage_status") && <TabsTrigger value="status">Status & Banners</TabsTrigger>}
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><Overview /></TabsContent>
          {me.owner_admin && <TabsContent value="admins"><AdminsTab /></TabsContent>}
          {(has("create_premium_grants") || has("claim_premium_self")) && (
            <TabsContent value="premium"><PremiumTab canClaimSelf={has("claim_premium_self")} canCreateGrants={has("create_premium_grants")} /></TabsContent>
          )}
          {(has("support_reply") || has("support_assign")) && (
            <TabsContent value="support"><SupportTab me={me} canAssign={has("support_assign")} /></TabsContent>
          )}
          {(has("export_user_data") || has("delete_users")) && <TabsContent value="users"><UsersTab canExport={has("export_user_data")} canDelete={has("delete_users")} /></TabsContent>}
          {has("delete_workspaces") && <TabsContent value="workspaces"><WorkspacesTab /></TabsContent>}
          {has("moderate_chats") && <TabsContent value="chats"><ChatsTab /></TabsContent>}
          {has("manage_blacklist") && <TabsContent value="blacklist"><BlacklistTab /></TabsContent>}
          <TabsContent value="portals"><PartnerPortalsTab /></TabsContent>
          {has("manage_status") && <TabsContent value="status"><StatusAdminTab /></TabsContent>}
          <TabsContent value="audit"><AuditTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: any) {
  return <div className={`rounded-lg border border-border bg-card/40 backdrop-blur p-4 ${className}`}>{children}</div>;
}

function Overview() {
  const [stats, setStats] = useState({ admins: 0, openTickets: 0, audits: 0 });
  useEffect(() => {
    (async () => {
      const [a, t, l] = await Promise.all([
        supabase.from("staff_admins").select("id", { count: "exact", head: true }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("staff_audit_log").select("id", { count: "exact", head: true }),
      ]);
      setStats({ admins: a.count || 0, openTickets: t.count || 0, audits: l.count || 0 });
    })();
  }, []);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><div className="text-sm text-muted-foreground">Staff members</div><div className="text-3xl font-bold mt-2">{stats.admins}</div></Card>
      <Card><div className="text-sm text-muted-foreground">Open support tickets</div><div className="text-3xl font-bold mt-2">{stats.openTickets}</div></Card>
      <Card><div className="text-sm text-muted-foreground">Audit log entries</div><div className="text-3xl font-bold mt-2">{stats.audits}</div></Card>
    </div>
  );
}

function AdminsTab() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [perms, setPerms] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: a } = await supabase.from("staff_admins").select("*").order("created_at");
    const { data: p } = await supabase.from("staff_permissions").select("admin_id, permission");
    const grouped: Record<string, string[]> = {};
    (p || []).forEach((row: any) => { (grouped[row.admin_id] ||= []).push(row.permission); });
    setAdmins(a || []);
    setPerms(grouped);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!username.trim()) return;
    setBusy(true);
    try {
      await callStaff("add_admin", { roblox_username: username.trim() });
      toast.success("Admin added");
      setUsername(""); setOpen(false);
      await load();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this admin?")) return;
    try { await callStaff("remove_admin", { admin_id: id }); toast.success("Removed"); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const togglePerm = async (admin_id: string, perm: string, on: boolean) => {
    const current = perms[admin_id] || [];
    const next = on ? [...new Set([...current, perm])] : current.filter((x) => x !== perm);
    setPerms({ ...perms, [admin_id]: next });
    try { await callStaff("set_permissions", { admin_id, permissions: next }); }
    catch (e: any) { toast.error(e.message); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><UserPlus className="w-4 h-4 mr-2" />Add admin</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add staff admin</DialogTitle></DialogHeader>
            <Label>Roblox username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="exact username" />
            <p className="text-xs text-muted-foreground">User must already be verified on Fluxcore.</p>
            <DialogFooter><Button onClick={add} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="space-y-3">
          {admins.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">{a.roblox_username} {a.role === "owner_admin" && <Badge className="ml-2">Owner Admin</Badge>}</div>
                  <div className="text-xs text-muted-foreground">Added {new Date(a.created_at).toLocaleString()}</div>
                </div>
                {a.role !== "owner_admin" && (
                  <Button variant="destructive" size="sm" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4" /></Button>
                )}
              </div>
              {a.role !== "owner_admin" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {ALL_PERMS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={(perms[a.id] || []).includes(p.key)}
                        onCheckedChange={(v) => togglePerm(a.id, p.key, !!v)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              )}
              {a.role === "owner_admin" && <p className="text-xs text-muted-foreground">Owner Admin has all permissions implicitly.</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PremiumTab({ canClaimSelf, canCreateGrants }: { canClaimSelf: boolean; canCreateGrants: boolean }) {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [wsId, setWsId] = useState("");
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const loadWorkspaces = async () => {
    if (!canClaimSelf) return;
    try {
      const r = await callStaff<{ workspaces: any[] }>("list_all_workspaces", {});
      setWorkspaces(r.workspaces || []);
    } catch (e: any) { toast.error(e.message); }
  };

  useEffect(() => { loadWorkspaces(); }, [canClaimSelf]);

  const grant = async () => {
    if (!wsId) return;
    setBusy(true);
    try {
      await callStaff("grant_self_premium", { workspace_id: wsId, days: Number(days) });
      toast.success("Premium granted");
      loadWorkspaces();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => w.name?.toLowerCase().includes(q) || w.id?.includes(q));
  }, [workspaces, query]);

  return (
    <div className="space-y-6">
      {canClaimSelf && (
        <Card>
          <div className="flex items-center gap-2 mb-3"><Sparkles className="w-5 h-5 text-primary" /><h3 className="font-semibold">Grant Premium to any workspace</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <Label>Search workspaces</Label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by name or ID…" />
            </div>
            <div><Label>Days</Label><Input type="number" value={days} onChange={(e) => setDays(e.target.value)} /></div>
          </div>
          <div className="mt-3 max-h-72 overflow-y-auto rounded border border-border divide-y divide-border/40">
            {filtered.length === 0 && <div className="p-3 text-sm text-muted-foreground">No workspaces.</div>}
            {filtered.map((w) => {
              const active = wsId === w.id;
              const isPremium = w.premium && (!w.premium_until || new Date(w.premium_until) > new Date());
              return (
                <button
                  key={w.id}
                  onClick={() => setWsId(w.id)}
                  className={`w-full text-left p-2 flex items-center justify-between hover:bg-muted/30 ${active ? "bg-primary/10" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{w.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{w.id}</div>
                  </div>
                  {isPremium && <Badge variant="outline" className="text-[10px]">Premium</Badge>}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={grant} disabled={busy || !wsId}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Grant {days} days</Button>
          </div>
        </Card>
      )}
      {canCreateGrants && <Card><PremiumGrantManager /></Card>}
    </div>
  );
}

function SupportTab({ me, canAssign }: { me: WhoAmI; canAssign: boolean }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");

  const load = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("updated_at", { ascending: false }).limit(100);
    setTickets(data || []);
  };
  useEffect(() => { load(); }, []);

  const openTicket = async (t: any) => {
    setActive(t);
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", t.id).order("created_at");
    setMessages(data || []);
  };

  const send = async () => {
    if (!reply.trim() || !active) return;
    try {
      await callStaff("support_reply", { ticket_id: active.id, content: reply });
      setReply("");
      openTicket(active);
    } catch (e: any) { toast.error(e.message); }
  };

  const update = async (updates: any) => {
    if (!active) return;
    try { await callStaff("support_update", { ticket_id: active.id, ...updates }); load(); openTicket(active); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-1 max-h-[70vh] overflow-y-auto">
        <h3 className="font-semibold mb-2">Tickets</h3>
        <div className="space-y-2">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => openTicket(t)} className={`w-full text-left p-2 rounded border ${active?.id === t.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/30"}`}>
              <div className="text-sm font-medium truncate">{t.subject}</div>
              <div className="text-xs text-muted-foreground flex justify-between"><span>{t.roblox_username}</span><Badge variant="outline" className="text-[10px]">{t.status}</Badge></div>
            </button>
          ))}
        </div>
      </Card>
      <Card className="md:col-span-2">
        {!active ? <p className="text-muted-foreground text-sm">Select a ticket</p> : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{active.subject}</h3>
                <p className="text-xs text-muted-foreground">From {active.roblox_username}</p>
              </div>
              {canAssign && (
                <select value={active.status} onChange={(e) => update({ status: e.target.value })} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              )}
            </div>
            <div className="text-sm whitespace-pre-wrap p-3 rounded bg-muted/30 border border-border">{active.message}</div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className={`p-2 rounded border ${m.user_id === me.user_id ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                  <div className="text-xs text-muted-foreground">{m.roblox_username} · {new Date(m.created_at).toLocaleString()}</div>
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            </div>
            <div>
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" rows={3} />
              <div className="flex justify-end mt-2"><Button onClick={send} disabled={!reply.trim()}><MessageSquare className="w-4 h-4 mr-2" />Send</Button></div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function UsersTab({ canDelete, canExport }: { canDelete: boolean; canExport: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setBusy(true);
    try {
      const r = await callStaff<{ users: any[] }>("search_users", { query: q });
      setResults(r.users);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const exportData = async (u: any) => {
    try {
      const r = await callStaff<{ payload: any }>("export_user_data", { user_id: u.user_id });
      const blob = new Blob([JSON.stringify(r.payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `fluxcore-export-${u.roblox_username}-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e: any) { toast.error(e.message); }
  };

  const requestRemoval = async (u: any) => {
    const reason = prompt(`Request account removal for ${u.roblox_username}?\n\nThe user will be shown a full-screen approval prompt next time they open Fluxcore.\n\nReason (optional):`, "");
    if (reason === null) return;
    try {
      await callStaff("request_account_removal", { user_id: u.user_id, reason });
      toast.success("Removal request sent — awaiting user approval");
    } catch (e: any) { toast.error(e.message); }
  };

  const del = async (u: any) => {
    if (!confirm(`PERMANENTLY delete ${u.roblox_username} right now? This bypasses approval and removes their workspaces, memberships and account.`)) return;
    try { await callStaff("delete_user", { user_id: u.user_id }); toast.success("Deleted"); setResults(results.filter((x) => x.user_id !== u.user_id)); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <Label>Search by Roblox username or user ID</Label>
        <div className="flex gap-2 mt-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="e.g. Novavoff" />
          <Button onClick={search} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Search</Button>
        </div>
      </Card>
      <div className="space-y-2">
        {results.map((u) => (
          <Card key={u.user_id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{u.roblox_username}</div>
                <div className="text-xs text-muted-foreground">Roblox ID {u.roblox_user_id} · verified {new Date(u.verified_at).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {canExport && <Button variant="outline" size="sm" onClick={() => exportData(u)}><Download className="w-4 h-4 mr-1" />Export</Button>}
                {canDelete && <Button variant="outline" size="sm" onClick={() => requestRemoval(u)}>Request removal</Button>}
                {canDelete && <Button variant="destructive" size="sm" onClick={() => del(u)}><Trash2 className="w-4 h-4 mr-1" />Force delete</Button>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WorkspacesTab() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState("");

  const load = async () => {
    setBusy(true);
    try { const r = await callStaff<{ workspaces: any[] }>("list_workspaces", { query: q }); setList(r.workspaces); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);

  const del = async (w: any) => {
    if (!confirm(`Delete workspace "${w.name}"? This cannot be undone.`)) return;
    try { await callStaff("delete_workspace", { workspace_id: w.id }); setList(list.filter((x) => x.id !== w.id)); toast.success("Deleted"); }
    catch (e: any) { toast.error(e.message); }
  };

  const close = async () => {
    if (!closingId) return;
    try {
      await callStaff("close_workspace", { workspace_id: closingId, reason: closeReason });
      toast.success("Workspace closed");
      setClosingId(null); setCloseReason("");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const reopen = async (w: any) => {
    try { await callStaff("reopen_workspace", { workspace_id: w.id }); toast.success("Workspace re-opened"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name…" onKeyDown={(e) => e.key === "Enter" && load()} />
          <Button onClick={load} disabled={busy}>Search</Button>
        </div>
      </Card>
      <div className="space-y-2">
        {list.map((w) => (
          <Card key={w.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold flex items-center gap-2">
                  {w.name}
                  {w.premium && <Badge>Premium</Badge>}
                  {w.closed_at && <Badge variant="destructive">Closed</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{w.id}</div>
                {w.closed_at && w.closed_reason && (
                  <div className="text-xs text-destructive mt-1">Reason: {w.closed_reason}</div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {w.closed_at ? (
                  <Button size="sm" variant="outline" onClick={() => reopen(w)}>Re-open</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { setClosingId(w.id); setCloseReason(""); }}>Close</Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => del(w)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!closingId} onOpenChange={(v) => !v && setClosingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close workspace</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason (shown to owner & members)</Label>
            <Textarea value={closeReason} onChange={(e) => setCloseReason(e.target.value)} rows={3} placeholder="Breach of TOS" />
            <Button onClick={close} variant="destructive" className="w-full">Close workspace</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChatsTab() {
  const [wsId, setWsId] = useState("");
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try { const r = await callStaff<{ workspaces: { id: string; name: string }[] }>("list_chat_workspaces", {}); setWorkspaces(r.workspaces); }
      catch (e: any) { toast.error(e.message); }
    })();
  }, []);

  const load = async (id: string) => {
    setWsId(id);
    setBusy(true);
    try { const r = await callStaff<{ events: any[] }>("list_chats", { workspace_id: id }); setEvents(r.events); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this Wall post?")) return;
    try { await callStaff("delete_chat", { event_id: id }); setEvents(events.filter((e) => e.id !== id)); }
    catch (e: any) { toast.error(e.message); }
  };

  const filteredWs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => w.name.toLowerCase().includes(q));
  }, [workspaces, query]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold">Wall Moderation</div>
            <p className="text-xs text-muted-foreground mt-0.5">Pick a workspace, or load all to see who posted what.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={wsId === "" && events.length ? "default" : "outline"} onClick={() => load("")} disabled={busy}>Load all workspaces</Button>
          </div>
        </div>
        <div className="mt-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workspaces…" />
        </div>
        <div className="mt-2 max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
          {filteredWs.map((w) => (
            <button
              key={w.id}
              onClick={() => load(w.id)}
              disabled={busy}
              className={`text-left text-xs px-2 py-1.5 rounded border truncate transition ${wsId === w.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
            >
              {w.name}
            </button>
          ))}
          {!filteredWs.length && <div className="text-xs text-muted-foreground col-span-full py-2">No workspaces.</div>}
        </div>
      </Card>
      <div className="space-y-2">
        {events.map((e) => (
          <Card key={e.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-semibold truncate">{e.title}</div>
                  {e.pinned && <Badge variant="outline" className="text-[10px]">Pinned</Badge>}
                  {!wsId && e.workspace_name && <Badge variant="secondary" className="text-[10px]">{e.workspace_name}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{e.author_name} · {new Date(e.created_at).toLocaleString()}</div>
                <div className="text-sm break-words whitespace-pre-wrap mt-1">{e.content}</div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => del(e.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AuditTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("staff_audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = `${r.admin_username || ""} ${r.action} ${r.target_type || ""} ${r.target_id || ""} ${JSON.stringify(r.details || {})}`.toLowerCase();
      return blob.includes(q);
    });
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <Card>
        <Label>Search audit log</Label>
        <Input className="mt-1" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by admin, action, target or details…" />
      </Card>
      {loading ? <Loader2 className="animate-spin" /> : filtered.map((r) => {
        const summary = r.details?.summary as string | undefined;
        return (
          <Card key={r.id}>
            <div className="flex justify-between text-sm gap-3">
              <div className="min-w-0">
                <div>
                  <span className="font-semibold">{r.admin_username || r.admin_user_id.slice(0, 8)}</span>{" "}
                  {summary
                    ? <span>{summary}</span>
                    : <>
                        <span className="text-primary">{r.action}</span>
                        {r.target_type && <span className="text-muted-foreground"> · {r.target_type}/{r.target_id?.slice(0, 8)}</span>}
                      </>}
                </div>
                {!summary && r.details && Object.keys(r.details).length > 0 && (
                  <pre className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap break-all">{JSON.stringify(r.details)}</pre>
                )}
              </div>
              <div className="text-xs text-muted-foreground shrink-0">{new Date(r.created_at).toLocaleString()}</div>
            </div>
          </Card>
        );
      })}
      {!loading && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No matching entries.</p>}
    </div>
  );
}

function BlacklistTab() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [username, setUsername] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { entries } = await callStaff<{ entries: any[] }>("list_blacklist", { query: q });
      setItems(entries);
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const add = async () => {
    if (!username.trim()) return;
    setBusy(true);
    try {
      await callStaff("add_blacklist", { roblox_username: username.trim(), reason: reason.trim() });
      toast.success(`${username} blacklisted`);
      setUsername(""); setReason("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the blacklist?`)) return;
    try {
      await callStaff("remove_blacklist", { entry_id: id });
      toast.success("Removed");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Ban className="w-4 h-4 text-destructive" /> Add to Fluxcore Blacklist</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Blacklisted users will be locked out of every Fluxcore workspace. They keep access only to the support page so they can appeal.
        </p>
        <div className="grid md:grid-cols-[1fr_2fr_auto] gap-2">
          <Input placeholder="Roblox username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button onClick={add} disabled={busy || !username.trim()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Blacklist</>}
          </Button>
        </div>
      </Card>

      <div className="flex gap-2">
        <Input placeholder="Search by username or Roblox ID" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <Button variant="outline" onClick={load}>Search</Button>
      </div>

      <div className="space-y-2">
        {loading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
        {!loading && items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No one is currently blacklisted.</p>}
        {items.map((r) => (
          <Card key={r.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold flex items-center gap-2">
                <Ban className="w-4 h-4 text-destructive" />
                {r.roblox_username}
                <span className="text-xs text-muted-foreground font-normal">#{r.roblox_user_id}</span>
              </div>
              {r.reason && <div className="text-sm text-muted-foreground mt-1">{r.reason}</div>}
              <div className="text-[11px] text-muted-foreground mt-1">
                Added by {r.blacklisted_by_username || "unknown"} · {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => remove(r.id, r.roblox_username)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
