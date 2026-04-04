import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, Loader2, Trash2, Edit, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";
import { ALL_PERMISSIONS, PermissionKey } from "@/hooks/usePermissions";

interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string[];
  created_at: string;
}

export default function Roles() {
  const { workspaceId, isOwner } = useWorkspace();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

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
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, [workspaceId]);

  const openCreate = () => {
    setEditRole(null);
    setName("");
    setColor("#6366f1");
    setSelectedPerms(new Set());
    setDialogOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditRole(role);
    setName(role.name);
    setColor(role.color);
    setSelectedPerms(new Set(role.permissions));
    setDialogOpen(true);
  };

  const togglePerm = (key: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const permsArray = Array.from(selectedPerms);

    if (editRole) {
      const { error } = await supabase.from("workspace_roles").update({
        name: name.trim(), color, permissions: permsArray,
      }).eq("id", editRole.id);
      if (error) toast.error("Failed: " + error.message);
      else toast.success("Role updated!");
    } else {
      const { error } = await supabase.from("workspace_roles").insert({
        workspace_id: workspaceId, name: name.trim(), color,
        permissions: permsArray, position: roles.length,
      });
      if (error) toast.error("Failed: " + error.message);
      else toast.success("Role created!");
    }
    setDialogOpen(false);
    fetchRoles();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("workspace_roles").delete().eq("id", id);
    toast.success("Role deleted");
    fetchRoles();
  };

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
    <DashboardLayout title="Roles">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Roles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create roles and assign permissions</p>
          </div>
          <Button variant="hero" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Create Role
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : roles.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No roles yet. Create roles to organize permissions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map(role => (
              <div key={role.id} className="glass rounded-xl p-5 flex items-center gap-4">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{role.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(role)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(role.id)} className="hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
                    <Checkbox
                      checked={selectedPerms.has(perm.key)}
                      onCheckedChange={() => togglePerm(perm.key)}
                      className="mt-0.5"
                    />
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
