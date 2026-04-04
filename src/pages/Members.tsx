import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Search, Crown, ChevronLeft, ChevronRight, Copy, Users as UsersIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

interface Member {
  id: string;
  roblox_username: string;
  roblox_user_id: string;
  role: string;
  verified: boolean;
  joined_at: string;
  user_id: string | null;
}

interface MemberLog {
  member_id: string;
  log_type: string;
}

interface ActivitySession {
  roblox_user_id: string;
  duration_seconds: number | null;
}

const PAGE_SIZE = 15;

export default function Members() {
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [warningCounts, setWarningCounts] = useState<Record<string, number>>({});
  const [minutesCounts, setMinutesCounts] = useState<Record<string, number>>({});

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });

    const membersList = data || [];

    // Add owner if not in list
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
            id: "owner-virtual",
            roblox_username: ownerData.roblox_username,
            roblox_user_id: ownerData.roblox_user_id,
            role: "Owner",
            verified: true,
            joined_at: new Date().toISOString(),
            user_id: workspace.owner_id,
          } as any);
        }
      }
    }

    setMembers(membersList);

    // Fetch warnings
    const memberIds = membersList.filter(m => m.id !== "owner-virtual").map(m => m.id);
    if (memberIds.length > 0) {
      const { data: logs } = await supabase
        .from("member_logs")
        .select("member_id, log_type")
        .eq("workspace_id", workspaceId)
        .eq("log_type", "warning");
      const wCounts: Record<string, number> = {};
      (logs || []).forEach(l => { wCounts[l.member_id] = (wCounts[l.member_id] || 0) + 1; });
      setWarningCounts(wCounts);
    }

    // Fetch activity minutes
    const robloxIds = membersList.map(m => m.roblox_user_id);
    if (robloxIds.length > 0) {
      const { data: sessions } = await supabase
        .from("activity_sessions")
        .select("roblox_user_id, duration_seconds")
        .eq("workspace_id", workspaceId);
      const mCounts: Record<string, number> = {};
      (sessions || []).forEach(s => {
        mCounts[s.roblox_user_id] = (mCounts[s.roblox_user_id] || 0) + (s.duration_seconds || 0);
      });
      setMinutesCounts(mCounts);
    }

    setLoading(false);

    // Fetch avatars
    if (membersList.length > 0) {
      const userIds = membersList.map(m => m.roblox_user_id).join(",");
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

  const filtered = members.filter(m =>
    m.roblox_username.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const copyUsername = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(name);
    toast.success("Copied!");
  };

  if (loading) {
    return (
      <DashboardLayout title="Members">
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      </DashboardLayout>
    );
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

        {/* Search */}
        <div className="glass rounded-xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 bg-muted border-border"
            />
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rank</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warnings</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Minutes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paged.map(member => (
                  <tr
                    key={member.id}
                    onClick={() => {
                      if (member.id !== "owner-virtual") navigate(`/w/${workspaceId}/members/${member.id}`);
                    }}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          {avatars[member.roblox_user_id] ? (
                            <AvatarImage src={avatars[member.roblox_user_id]} alt={member.roblox_username} />
                          ) : null}
                          <AvatarFallback className="bg-secondary text-xs font-bold">
                            {member.roblox_username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{member.roblox_username}</span>
                          {member.role === "Owner" && <Crown className="w-3.5 h-3.5 text-warning" />}
                          {member.verified && <span className="w-2 h-2 rounded-full bg-success" title="Verified" />}
                          <button
                            onClick={(e) => copyUsername(member.roblox_username, e)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-foreground">{member.role}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm text-foreground">{warningCounts[member.id] || 0}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm text-foreground">
                        {Math.round((minutesCounts[member.roblox_user_id] || 0) / 60)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
