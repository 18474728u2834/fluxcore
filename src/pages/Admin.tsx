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
import { RobloxAppCenterTab } from "@/pages/admin/RobloxAppCenterTab";
import MarqueeTab from "@/pages/admin/MarqueeTab";
import SecurityScansTab from "@/pages/admin/SecurityScansTab";
import SessionBoardTab from "@/pages/admin/SessionBoardTab";
import FlightHubTab from "@/pages/admin/FlightHubTab";
import ReleaseTab from "@/pages/admin/ReleaseTab";
import CreationsTab from "@/pages/admin/CreationsTab";
import LicenseGateTab from "@/pages/admin/LicenseGateTab";
import DOMPurify from "dompurify";

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
  { key: "view_security_scans", label: "View daily breach & fault scans" },
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
            {has("manage_status") && <TabsTrigger value="marquee">Homepage Marquee</TabsTrigger>}
            {has("send_admin_email") && <TabsTrigger value="email">Email Sender</TabsTrigger>}
            {has("view_security_scans") && <TabsTrigger value="security">Security Scans</TabsTrigger>}
            {me.roblox_username === "Novavoff" && <TabsTrigger value="roblox_app">Roblox App Center</TabsTrigger>}
            {me.roblox_username === "Novavoff" && <TabsTrigger value="creations">Creations</TabsTrigger>}
            {me.roblox_username === "Novavoff" && <TabsTrigger value="license">License Gate</TabsTrigger>}
            <TabsTrigger value="session_board">Session Board</TabsTrigger>
            <TabsTrigger value="flight_hub">Flight Hub</TabsTrigger>
            {has("manage_status") && <TabsTrigger value="release">Release Updates</TabsTrigger>}
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
          {has("manage_status") && <TabsContent value="marquee"><MarqueeTab /></TabsContent>}
          {has("send_admin_email") && <TabsContent value="email"><EmailSenderTab /></TabsContent>}
          {has("view_security_scans") && <TabsContent value="security"><SecurityScansTab /></TabsContent>}
          {me.roblox_username === "Novavoff" && <TabsContent value="roblox_app"><RobloxAppCenterTab /></TabsContent>}
          {me.roblox_username === "Novavoff" && <TabsContent value="creations"><CreationsTab /></TabsContent>}
          {me.roblox_username === "Novavoff" && <TabsContent value="license"><LicenseGateTab /></TabsContent>}
          <TabsContent value="session_board"><SessionBoardTab /></TabsContent>
          <TabsContent value="flight_hub"><FlightHubTab /></TabsContent>
          {has("manage_status") && <TabsContent value="release"><ReleaseTab /></TabsContent>}
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

function EmailSenderTab() {
  const [view, setView] = useState<"compose" | "sent">("compose");
  const [target, setTarget] = useState<"specific_email" | "roblox_user" | "all_owners">("specific_email");
  const [email, setEmail] = useState("");
  const [robloxUsername, setRobloxUsername] = useState("");
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [preheader, setPreheader] = useState("");
  const [bodyHtml, setBodyHtml] = useState(
    "<p>Hi there,</p>\n<p>Write your message here. You can use <strong>bold</strong>, <em>italic</em>, lists, and <a href=\"https://fluxcore.works\">links</a>.</p>"
  );
  const [images, setImages] = useState<string[]>([]);
  const [includeNewsletter, setIncludeNewsletter] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const uploadImage = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5 MB)"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `admin-email/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("webhook-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("webhook-images").getPublicUrl(path);
      setImages((arr) => [...arr, data.publicUrl]);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const sendNow = async () => {
    if (!subject.trim() || !bodyHtml.trim()) { toast.error("Subject and body are required"); return; }
    if (target === "specific_email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { toast.error("Enter a valid email"); return; }
    if (target === "roblox_user" && !robloxUsername.trim()) { toast.error("Enter a Roblox username"); return; }
    setBusy(true);
    try {
      const r = await callStaff<any>("send_admin_email", {
        target, email, roblox_username: robloxUsername,
        subject, heading: heading || subject, preheader, body_html: bodyHtml,
        images, include_newsletter_cta: includeNewsletter,
      });
      setLastResult(r);
      toast.success(`Queued ${r.sent}/${r.recipients} emails${r.suppressed ? `, ${r.suppressed} suppressed` : ""}${r.failed ? `, ${r.failed} failed` : ""}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  // Live preview HTML that mirrors the rendered email template
  const previewHtml = useMemo(() => {
    const imgHtml = images.map((src) => `<img src="${src}" alt="" style="display:block;width:100%;height:auto;border-radius:10px;margin-bottom:10px"/>`).join("");
    const newsletter = includeNewsletter
      ? `<div style="margin-top:14px;padding:14px 18px;border-radius:12px;border:1px solid #1f2937;background:#0b1220;text-align:center"><p style="color:#d1d5db;font-size:13px;margin:0 0 6px">Want occasional product updates from Fluxcore?</p><a href="https://fluxcore.works/newsletter" style="color:#06b6d4;font-size:14px;font-weight:600;text-decoration:none">Subscribe to our newsletter →</a></div>`
      : "";
    return `<div style="background:#ffffff;padding:24px 0;font-family:Outfit,system-ui,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:0 16px"><div style="text-align:center;padding:8px 0 16px"><span style="font-size:20px;font-weight:700;color:#06b6d4">Fluxcore</span></div><div style="background:#0b1220;border:1px solid #1f2937;border-radius:14px;padding:28px;color:#e5e7eb"><h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 14px">${(heading || subject || "(no subject)").replace(/</g, "&lt;")}</h1>${imgHtml}<div style="color:#d1d5db;font-size:15px;line-height:24px">${bodyHtml}</div><hr style="border-color:#1f2937;margin:22px 0 12px"/><p style="color:#9ca3af;font-size:12px;margin:0">Sent by Fluxcore staff</p></div>${newsletter}<p style="color:#9ca3af;font-size:11px;text-align:center;padding:16px 8px 0">You're receiving this because you operate a workspace on Fluxcore.</p></div></div>`;
  }, [bodyHtml, heading, subject, images, includeNewsletter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={view === "compose" ? "default" : "outline"} size="sm" onClick={() => setView("compose")}>Compose</Button>
        <Button variant={view === "sent" ? "default" : "outline"} size="sm" onClick={() => setView("sent")}>Sent emails</Button>
      </div>

      {view === "sent" ? <SentEmailsList /> : (
      <>
      <Card>
        <div className="space-y-1 mb-4">
          <h2 className="text-lg font-semibold">Admin Email Sender</h2>
          <p className="text-sm text-muted-foreground">Send a branded Fluxcore email to a specific user or broadcast to all workspace owners. Images and live preview supported.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {[
            { v: "specific_email", l: "Specific email" },
            { v: "roblox_user", l: "Roblox user" },
            { v: "all_owners", l: "All workspace owners" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setTarget(o.v as any)}
              className={`rounded-lg border p-3 text-sm text-left transition ${target === o.v ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}
            >
              {o.l}
            </button>
          ))}
        </div>

        {target === "specific_email" && (
          <div className="mb-3">
            <Label>Recipient email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
        )}
        {target === "roblox_user" && (
          <div className="mb-3">
            <Label>Roblox username</Label>
            <Input value={robloxUsername} onChange={(e) => setRobloxUsername(e.target.value)} placeholder="Novavoff" />
            <p className="text-xs text-muted-foreground mt-1">Will email the address linked to their Fluxcore account.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>Heading (optional)</Label>
            <Input value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Defaults to subject" />
          </div>
        </div>
        <div className="mb-3">
          <Label>Preheader (preview text)</Label>
          <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} maxLength={150} />
        </div>
        <div className="mb-3">
          <Label>Body (HTML)</Label>
          <Textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={10}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">Allowed: &lt;p&gt;, &lt;a&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;br&gt;, &lt;h2&gt;, &lt;h3&gt;, &lt;img&gt;. Scripts, styles, event handlers are stripped.</p>
        </div>

        <div className="mb-3 space-y-2">
          <Label>Images (max 6, 5 MB each)</Label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" disabled={uploading || images.length >= 6}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} />
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="w-20 h-20 object-cover rounded border border-border" />
                  <button onClick={() => setImages((arr) => arr.filter((_, k) => k !== i))}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Checkbox id="newsletter" checked={includeNewsletter} onCheckedChange={(v) => setIncludeNewsletter(Boolean(v))} />
          <Label htmlFor="newsletter" className="cursor-pointer text-sm font-normal">
            Include "Subscribe to newsletter" CTA at the bottom
          </Label>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {target === "all_owners" ? "⚠️ This will email every workspace owner. Use for service notices only." : "Only the chosen recipient will receive this."}
          </p>
          <Button
            disabled={busy}
            onClick={() => (target === "all_owners" ? setConfirmOpen(true) : sendNow())}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Send email
          </Button>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium mb-2">Live preview (recipient's view)</div>
        <iframe
          title="Email preview"
          srcDoc={previewHtml}
          className="w-full h-[520px] rounded-lg border border-border bg-white"
        />
      </Card>

      {lastResult && (
        <Card>
          <div className="text-sm">
            <div className="font-medium mb-1">Last send result</div>
            <div className="text-muted-foreground">
              Recipients: {lastResult.recipients} · Sent: {lastResult.sent} · Suppressed: {lastResult.suppressed} · Failed: {lastResult.failed}
            </div>
            {lastResult.errors?.length ? (
              <ul className="mt-2 text-xs text-destructive list-disc pl-5">
                {lastResult.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
              </ul>
            ) : null}
          </div>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broadcast to all workspace owners?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will queue an email to every workspace owner with a verified email address. Make sure this is a service notice — Fluxcore does not allow marketing or promotional broadcasts.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={sendNow} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}

function SentEmailsList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await callStaff<any>("list_sent_emails");
        setItems(r.entries || []);
      } catch (e: any) {
        toast.error(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!items.length) return <Card><p className="text-sm text-muted-foreground text-center py-6">No emails sent yet.</p></Card>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <div className="text-sm font-medium mb-3">Sent emails ({items.length})</div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {items.map((e) => {
            const d = e.details || {};
            return (
              <button key={e.id} onClick={() => setSelected(e)}
                className={`w-full text-left rounded-lg border p-3 transition ${selected?.id === e.id ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}>
                <div className="text-sm font-medium truncate">{d.subject || "(no subject)"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {d.target} · {d.recipients} recipient{d.recipients === 1 ? "" : "s"} · {d.sent ?? 0} sent
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {e.admin_username} · {new Date(e.created_at).toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
      <Card>
        {selected ? (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Subject</div>
              <div className="text-sm font-medium">{selected.details?.subject}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Recipients ({selected.details?.recipients})</div>
              <div className="text-xs">{(selected.details?.recipient_sample || []).join(", ")}{selected.details?.recipients > (selected.details?.recipient_sample?.length || 0) ? " …" : ""}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Body</div>
              <div className="rounded-lg border border-border p-3 bg-white text-black prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.details?.body_html || "<em>(no body stored)</em>", { USE_PROFILES: { html: true } }) }} />
            </div>
            {selected.details?.images?.length ? (
              <div className="flex flex-wrap gap-2">
                {selected.details.images.map((src: string, i: number) => (
                  <img key={i} src={src} alt="" className="w-20 h-20 object-cover rounded border border-border" />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Select a sent email to read it.</p>
        )}
      </Card>
    </div>
  );
}
