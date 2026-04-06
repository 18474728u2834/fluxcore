import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, Loader2, Trash2, Edit, GripVertical, Download, Users, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ALL_PERMISSIONS, PermissionKey } from "@/hooks/usePermissions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string[];
  created_at: string;
}

interface Member {
  id: string;
  roblox_username: string;
  roblox_user_id: string;
  role: string;
  role_id: string | null;
}

export default function Roles() {
  const { workspaceId, isOwner } = useWorkspace();
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  const fetchRoles = async () => {
    const { data } = await supabase
      .from("workspace_roles")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true });
    setRoles((data || []).map(r => ({ ...r, permissions: Array.isArray(r.permissions) ? r.permissions as string[] : [] })));
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("id, roblox_username, roblox_user_id, role, role_id")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });
    setMembers(data || []);

    if (data && data.length > 0) {
      const userIds = data.map(m => m.roblox_user_id).join(",");
      try {
        const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=48x48&format=Png&isCircular=true`);
        const json = await res.json();
        const map: Record<string, string> = {};
        if (json?.data) for (const item of json.data) if (item.imageUrl) map[item.targetId.toString()] = item.imageUrl;
        setAvatars(map);
      } catch {}
    }
  };

  useEffect(() => {
    Promise.all([fetchRoles(), fetchMembers()]).then(() => setLoading(false));
  }, [workspaceId]);

  const openCreate = () => {
    setEditRole(null); setName(""); setColor("#6366f1"); setSelectedPerms(new Set()); setDialogOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditRole(role); setName(role.name); setColor(role.color); setSelectedPerms(new Set(role.permissions)); setDialogOpen(true);
  };

  const togglePerm = (key: string) => {
    setSelectedPerms(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const permsArray = Array.from(selectedPerms);
    if (editRole) {
      const { error } = await supabase.from("workspace_roles").update({ name: name.trim(), color, permissions: permsArray }).eq("id", editRole.id);
      if (error) toast.error("Failed: " + error.message);
      else toast.success("Role updated!");
    } else {
      const { error } = await supabase.from("workspace_roles").insert({
        workspace_id: workspaceId, name: name.trim(), color, permissions: permsArray, position: roles.length,
      });
      if (error) toast.error("Failed: " + error.message);
      else toast.success("Role created!");
    }
    setDialogOpen(false); fetchRoles(); setSaving(false);
  };

  const handleDelete = async (id: string) => {
    // Unassign members with this role first
    await supabase.from("workspace_members").update({ role_id: null, role: "Member" }).eq("role_id", id);
    await supabase.from("workspace_roles").delete().eq("id", id);
    toast.success("Role deleted");
    fetchRoles(); fetchMembers();
  };

  const importRobloxRoles = async () => {
    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("roblox-rank", {
        body: { action: "import_roles", workspace_id: workspaceId },
      });
      if (res.error) {
        toast.error("Import failed: " + (res.error.message || "Check your Roblox API key"));
      } else if (res.data?.error) {
        toast.error("Import failed: " + res.data.error);
      } else {
        toast.success(`Imported ${res.data?.imported || 0} roles from Roblox group`);
        fetchRoles();
      }
    } catch (e: any) {
      toast.error("Import error: " + e.message);
    }
    setImporting(false);
  };

  const assignRole = async (memberId: string, roleId: string | null) => {
    const role = roleId ? roles.find(r => r.id === roleId) : null;
    const { error } = await supabase.from("workspace_members").update({
      role_id: roleId,
      role: role?.name || "Member",
    }).eq("id", memberId);
    if (error) toast.error("Failed to assign role");
    else { toast.success("Role assigned"); fetchMembers(); }
  };

  const filteredMembers = members.filter(m =>
    m.roblox_username.toLowerCase().includes(memberSearch.toLowerCase())
  );
  const unassigned = filteredMembers.filter(m => !m.role_id);
  const grouped = roles.map(r => ({
    ...r,
    members: filteredMembers.filter(m => m.role_id === r.id),
  }));

  if (!isOwner) {
    return (
      <DashboardLayout title="Roles">
        <div className="glass rounded-xl p-8 text-center max-w-2xl">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Only workspace owners can manage roles.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Roles & Permissions">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Permissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage roles and user permissions</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <>
            {/* Users Section */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Users</h2>
                <div className="relative w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-9 h-8 bg-muted border-border text-xs"
                  />
                </div>
              </div>
              <div className="divide-y divide-border/40">
                {/* Grouped by role */}
                {grouped.filter(g => g.members.length > 0).map(group => (
                  <details key={group.id} className="group">
                    <summary className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/30 transition-colors">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                      <span className="text-sm font-medium text-foreground">{group.name}</span>
                      <span className="text-xs text-muted-foreground">({group.members.length} users)</span>
                    </summary>
                    <div className="border-t border-border/30 bg-secondary/10">
                      {group.members.map(m => (
                        <div key={m.id} className="px-8 py-2.5 flex items-center gap-3">
                          <Avatar className="w-7 h-7">
                            {avatars[m.roblox_user_id] ? <AvatarImage src={avatars[m.roblox_user_id]} /> : null}
                            <AvatarFallback className="bg-secondary text-[10px] font-bold">{m.roblox_username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground flex-1">{m.roblox_username}</span>
                          <Select value={m.role_id || "unassigned"} onValueChange={(v) => assignRole(m.id, v === "unassigned" ? null : v)}>
                            <SelectTrigger className="w-36 h-7 text-xs bg-muted border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}

                {/* Unassigned */}
                {unassigned.length > 0 && (
                  <details>
                    <summary className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/30 transition-colors">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                      <span className="text-sm font-medium text-muted-foreground">Unassigned</span>
                      <span className="text-xs text-muted-foreground">({unassigned.length} users)</span>
                    </summary>
                    <div className="border-t border-border/30 bg-secondary/10">
                      {unassigned.map(m => (
                        <div key={m.id} className="px-8 py-2.5 flex items-center gap-3">
                          <Avatar className="w-7 h-7">
                            {avatars[m.roblox_user_id] ? <AvatarImage src={avatars[m.roblox_user_id]} /> : null}
                            <AvatarFallback className="bg-secondary text-[10px] font-bold">{m.roblox_username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground flex-1">{m.roblox_username}</span>
                          <Select value="unassigned" onValueChange={(v) => assignRole(m.id, v === "unassigned" ? null : v)}>
                            <SelectTrigger className="w-36 h-7 text-xs bg-muted border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Roles Section */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Roles</h2>
                <div className="flex gap-2">
                  <Button variant="hero" size="sm" onClick={openCreate}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Role
                  </Button>
                  <Button variant="secondary" size="sm" onClick={importRobloxRoles} disabled={importing}>
                    {importing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
                    Sync Group
                  </Button>
                </div>
              </div>

              {roles.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No roles yet. Create roles or import from your Roblox group.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {roles.map(role => (
                    <details key={role.id}>
                      <summary className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/30 transition-colors">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                        <span className="text-sm font-medium text-foreground flex-1">{role.name}</span>
                        <span className="text-xs text-muted-foreground mr-2">{role.permissions.length} perms</span>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(role)} className="h-7 w-7 p-0">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(role.id)} className="h-7 w-7 p-0 hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </summary>
                      <div className="border-t border-border/30 bg-secondary/10 px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          {role.permissions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No permissions assigned</p>
                          ) : (
                            role.permissions.map(p => {
                              const perm = ALL_PERMISSIONS.find(ap => ap.key === p);
                              return (
                                <span key={p} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                                  {perm?.label || p}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-border/40 max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editRole ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Role Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Moderator" className="bg-muted border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Color</Label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissions</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {ALL_PERMISSIONS.map(perm => (
                  <label key={perm.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors">
                    <Checkbox checked={selectedPerms.has(perm.key)} onCheckedChange={() => togglePerm(perm.key)} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{perm.label}</p>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button variant="hero" className="w-full" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editRole ? "Update Role" : "Create Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
