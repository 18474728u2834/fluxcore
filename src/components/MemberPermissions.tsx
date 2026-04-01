import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ALL_PERMISSIONS } from "@/hooks/usePermissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Shield, Trash2, Save } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Member {
  id: string;
  roblox_username: string;
  roblox_user_id: string;
  role: string;
}

const ROLES = ["Staff", "Moderator", "Admin", "Trial Mod", "Member"];

export function MemberPermissions() {
  const { workspaceId, isOwner } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberPerms, setMemberPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("id, roblox_username, roblox_user_id, role")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });
    setMembers(data || []);
    setLoading(false);

    if (data && data.length > 0) {
      const userIds = data.map(m => m.roblox_user_id).join(",");
      try {
        const res = await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=48x48&format=Png&isCircular=true`
        );
        const json = await res.json();
        const map: Record<string, string> = {};
        if (json?.data) {
          for (const item of json.data) {
            if (item.imageUrl) map[item.targetId.toString()] = item.imageUrl;
          }
        }
        setAvatars(map);
      } catch {}
    }
  };

  useEffect(() => { fetchMembers(); }, [workspaceId]);

  const openMemberPerms = async (member: Member) => {
    setSelectedMember(member);
    const { data } = await supabase
      .from("workspace_permissions")
      .select("permission")
      .eq("workspace_id", workspaceId)
      .eq("member_id", member.id);
    setMemberPerms(new Set((data || []).map(p => p.permission)));
  };

  const togglePerm = (perm: string) => {
    const next = new Set(memberPerms);
    if (next.has(perm)) next.delete(perm); else next.add(perm);
    setMemberPerms(next);
  };

  const savePerms = async () => {
    if (!selectedMember) return;
    setSaving(true);

    // Delete all existing
    await supabase
      .from("workspace_permissions")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("member_id", selectedMember.id);

    // Insert new
    if (memberPerms.size > 0) {
      const rows = Array.from(memberPerms).map(p => ({
        workspace_id: workspaceId,
        member_id: selectedMember.id,
        permission: p,
      }));
      await supabase.from("workspace_permissions").insert(rows);
    }

    toast.success(`Permissions updated for ${selectedMember.roblox_username}`);
    setSaving(false);
  };

  const updateRole = async (member: Member, newRole: string) => {
    const { error } = await supabase
      .from("workspace_members")
      .update({ role: newRole })
      .eq("id", member.id);
    if (error) toast.error("Failed to update role");
    else {
      toast.success(`${member.roblox_username} is now ${newRole}`);
      fetchMembers();
    }
  };

  const removeMember = async (member: Member) => {
    if (!confirm(`Remove ${member.roblox_username} from this workspace?`)) return;
    await supabase.from("workspace_permissions").delete().eq("member_id", member.id);
    const { error } = await supabase.from("workspace_members").delete().eq("id", member.id);
    if (error) toast.error("Failed to remove member");
    else {
      toast.success(`${member.roblox_username} removed`);
      fetchMembers();
      if (selectedMember?.id === member.id) setSelectedMember(null);
    }
  };

  if (!isOwner) return null;

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">Member Roles & Permissions</h3>
      </div>

      {members.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No members yet. Share your invite link to add members.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {members.map(member => (
            <div key={member.id} className="px-5 py-3 flex items-center gap-3">
              <Avatar className="w-8 h-8">
                {avatars[member.roblox_user_id] && (
                  <AvatarImage src={avatars[member.roblox_user_id]} />
                )}
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {member.roblox_username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{member.roblox_username}</p>
              </div>
              <Select value={member.role} onValueChange={(v) => updateRole(member, v)}>
                <SelectTrigger className="w-28 h-8 text-xs bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => openMemberPerms(member)}>
                    <Shield className="w-3 h-3 mr-1" /> Perms
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-border/40 max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-foreground text-sm">
                      Permissions — {member.roblox_username}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2 max-h-[400px] overflow-y-auto">
                    {ALL_PERMISSIONS.map(p => (
                      <label key={p.key} className="flex items-start gap-3 cursor-pointer group">
                        <Checkbox
                          checked={memberPerms.has(p.key)}
                          onCheckedChange={() => togglePerm(p.key)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.label}</p>
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <Button variant="hero" size="sm" className="w-full mt-2" onClick={savePerms} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                    Save Permissions
                  </Button>
                </DialogContent>
              </Dialog>

              <button onClick={() => removeMember(member)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
