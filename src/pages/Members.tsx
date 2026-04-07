import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Crown, ChevronLeft, ChevronRight, Copy, Users as UsersIcon, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Member {
  id: string;
  roblox_username: string;
  roblox_user_id: string;
  role: string;
  role_id: string | null;
  verified: boolean;
  joined_at: string;
  user_id: string | null;
}

interface RobloxGroupRole {
  id: string;
  displayName: string;
  rank: number;
}

const PAGE_SIZE = 15;

export default function Members() {
  const { workspaceId, workspace, isOwner } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { robloxUsername } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [warningCounts, setWarningCounts] = useState<Record<string, number>>({});
  const [minutesCounts, setMinutesCounts] = useState<Record<string, number>>({});
  const [roles, setRoles] = useState<{id: string; name: string; color: string}[]>([]);

  // Rank dialog
  const [rankDialogOpen, setRankDialogOpen] = useState(false);
  const [rankTarget, setRankTarget] = useState<Member | null>(null);
  const [robloxGroupRoles, setRobloxGroupRoles] = useState<RobloxGroupRole[]>([]);
  const [selectedRobloxRole, setSelectedRobloxRole] = useState("");
  const [rankLoading, setRankLoading] = useState(false);
  const [rankFetchLoading, setRankFetchLoading] = useState(false);

  const canManage = isOwner || hasPermission("manage_members");

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });

    const membersList = data || [];

    if (workspace) {
      const ownerInList = membersList.some(m => m.user_id === workspace.owner_id);
      if (!ownerInList) {
        const { data: ownerData } = await supabase
          .from("verified_users")
          .select("roblox_username, roblox_user_id")
          .eq("user_id", workspace.owner_id)
          .maybeSingle();
        if (ownerData) {
          membersList.unshift({
            id: "owner-virtual", roblox_username: ownerData.roblox_username,
            roblox_user_id: ownerData.roblox_user_id, role: "Owner",
            role_id: null, verified: true, joined_at: new Date().toISOString(), user_id: workspace.owner_id,
          } as any);
        }
      }
    }

    setMembers(membersList);

    const memberIds = membersList.filter(m => m.id !== "owner-virtual").map(m => m.id);
    if (memberIds.length > 0) {
      const { data: logs } = await supabase.from("member_logs").select("member_id, log_type")
        .eq("workspace_id", workspaceId).eq("log_type", "warning");
      const wCounts: Record<string, number> = {};
      (logs || []).forEach(l => { wCounts[l.member_id] = (wCounts[l.member_id] || 0) + 1; });
      setWarningCounts(wCounts);
    }

    const robloxIds = membersList.map(m => m.roblox_user_id);
    if (robloxIds.length > 0) {
      const { data: sessions } = await supabase.from("activity_sessions")
        .select("roblox_user_id, duration_seconds").eq("workspace_id", workspaceId);
      const mCounts: Record<string, number> = {};
      (sessions || []).forEach(s => { mCounts[s.roblox_user_id] = (mCounts[s.roblox_user_id] || 0) + (s.duration_seconds || 0); });
      setMinutesCounts(mCounts);
    }

    // Fetch workspace roles
    const { data: rolesData } = await supabase.from("workspace_roles").select("id, name, color")
      .eq("workspace_id", workspaceId).order("position");
    setRoles(rolesData || []);

    setLoading(false);

    if (membersList.length > 0) {
      const userIds = membersList.map(m => m.roblox_user_id).join(",");
      try {
        const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=48x48&format=Png&isCircular=true`);
        const json = await res.json();
        const map: Record<string, string> = {};
        if (json?.data) for (const item of json.data) if (item.imageUrl) map[item.targetId.toString()] = item.imageUrl;
        setAvatars(map);
      } catch {}
    }
  };

  useEffect(() => { fetchMembers(); }, [workspaceId]);

  const openRankDialog = async (member: Member) => {
    setRankTarget(member);
    setRankDialogOpen(true);
    setRankFetchLoading(true);
    setRobloxGroupRoles([]);
    setSelectedRobloxRole("");

    try {
      const res = await supabase.functions.invoke("roblox-rank", {
        body: { action: "get_roles", workspace_id: workspaceId },
      });
      if (res.data?.roles) {
        setRobloxGroupRoles(res.data.roles.map((r: any) => ({
          id: r.id?.split("/").pop() || r.id,
          displayName: r.displayName || r.name || `Rank ${r.rank}`,
          rank: r.rank || 0,
        })).sort((a: any, b: any) => b.rank - a.rank));
      } else {
        toast.error(res.data?.error || "Failed to fetch group roles");
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
    setRankFetchLoading(false);
  };

  const doRank = async () => {
    if (!rankTarget || !selectedRobloxRole) return;
    setRankLoading(true);
    try {
      const res = await supabase.functions.invoke("roblox-rank", {
        body: { action: "set_rank", workspace_id: workspaceId, roblox_user_id: rankTarget.roblox_user_id, role_id: selectedRobloxRole },
      });
      if (res.data?.success) {
        const roleName = robloxGroupRoles.find(r => r.id === selectedRobloxRole)?.displayName || selectedRobloxRole;
        toast.success(`Successfully ranked ${rankTarget.roblox_username} to ${roleName}!`);
        // Log the rank change
        if (rankTarget.id !== "owner-virtual") {
          await supabase.from("member_logs").insert({
            workspace_id: workspaceId,
            member_id: rankTarget.id,
            author_id: (await supabase.auth.getUser()).data.user?.id || "",
            author_name: robloxUsername || "Unknown",
            log_type: "rank_change",
            content: `Ranked to ${roleName} in Roblox group`,
          });
        }
        setRankDialogOpen(false);
      } else {
        toast.error(res.data?.error || "Failed to change rank");
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
    setRankLoading(false);
  };

  const filtered = members.filter(m => m.roblox_username.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const copyUsername = (name: string, e: React.MouseEvent) => { e.stopPropagation(); navigator.clipboard.writeText(name); toast.success("Copied!"); };

  const getRoleColor = (roleId: string | null) => {
    if (!roleId) return undefined;
    const role = roles.find(r => r.id === roleId);
    return role?.color;
  };

  if (loading) {
    return <DashboardLayout title="Members"><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Members">
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">View and manage your staff members</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UsersIcon className="w-4 h-4" /> {members.length} members
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search members..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 bg-muted border-border" />
          </div>
        </div>

        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rank</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warnings</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Minutes</th>
                  {canManage && <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paged.map(member => (
                  <tr key={member.id} onClick={() => { if (member.id !== "owner-virtual") navigate(`/w/${workspaceId}/members/${member.id}`); }} className="hover:bg-secondary/30 transition-colors cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          {avatars[member.roblox_user_id] ? <AvatarImage src={avatars[member.roblox_user_id]} alt={member.roblox_username} /> : null}
                          <AvatarFallback className="bg-secondary text-xs font-bold">{member.roblox_username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{member.roblox_username}</span>
                          {member.role === "Owner" && <Crown className="w-3.5 h-3.5 text-warning" />}
                          {member.verified && <span className="w-2 h-2 rounded-full bg-success" title="Verified" />}
                          <button onClick={(e) => copyUsername(member.roblox_username, e)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{
                        backgroundColor: getRoleColor(member.role_id) ? `${getRoleColor(member.role_id)}20` : undefined,
                        color: getRoleColor(member.role_id) || undefined,
                      }}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm text-foreground">{warningCounts[member.id] || 0}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm text-foreground">{Math.round((minutesCounts[member.roblox_user_id] || 0) / 60)}</span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {member.id !== "owner-virtual" && (
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openRankDialog(member)}>
                              <ArrowUpDown className="w-3 h-3 mr-1" /> Rank
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rank Dialog */}
      <Dialog open={rankDialogOpen} onOpenChange={setRankDialogOpen}>
        <DialogContent className="glass border-border/40 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Change Rank — {rankTarget?.roblox_username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">Select the Roblox group role to assign. This will promote or demote them in your Roblox group.</p>
            {rankFetchLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
            ) : robloxGroupRoles.length === 0 ? (
              <p className="text-sm text-destructive text-center py-4">No roles found. Check your Roblox API key and Group ID in Settings.</p>
            ) : (
              <Select value={selectedRobloxRole} onValueChange={setSelectedRobloxRole}>
                <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select a role..." /></SelectTrigger>
                <SelectContent>
                  {robloxGroupRoles.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.displayName} (Rank {r.rank})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="hero" className="w-full" onClick={doRank} disabled={rankLoading || !selectedRobloxRole}>
              {rankLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Rank Change
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
