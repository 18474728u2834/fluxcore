import { Shield, Loader2, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Member {
  id: string;
  roblox_username: string;
  roblox_user_id: string;
  role: string;
  verified: boolean;
  joined_at: string;
  user_id: string | null;
}

const rankColors: Record<string, string> = {
  Owner: "bg-warning/10 text-warning",
  Admin: "bg-destructive/10 text-destructive",
  Moderator: "bg-primary/10 text-primary",
  Staff: "bg-success/10 text-success",
  Member: "bg-secondary text-muted-foreground",
  "Trial Mod": "bg-warning/10 text-warning",
};

export function MemberList({ compact }: { compact?: boolean }) {
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [ownerUsername, setOwnerUsername] = useState<string | null>(null);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });

    const membersList = data || [];

    // Check if owner is in the members list
    if (workspace) {
      const ownerInList = membersList.some(m => m.user_id === workspace.owner_id);
      if (!ownerInList) {
        // Fetch owner info from verified_users
        const { data: ownerData } = await supabase
          .from("verified_users")
          .select("roblox_username, roblox_user_id")
          .eq("user_id", workspace.owner_id)
          .maybeSingle();
        if (ownerData) {
          setOwnerUsername(ownerData.roblox_username);
          membersList.unshift({
            id: "owner-virtual",
            roblox_username: ownerData.roblox_username,
            roblox_user_id: ownerData.roblox_user_id,
            role: "Owner",
            verified: true,
            joined_at: workspace.created_at || new Date().toISOString(),
            user_id: workspace.owner_id,
          } as any);
        }
      }
    }

    setMembers(membersList);
    setLoading(false);

    // Fetch avatars
    if (membersList.length > 0) {
      const userIds = membersList.map((m) => m.roblox_user_id).join(",");
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

  useEffect(() => {
    fetchMembers();
    const channel = supabase
      .channel(`members-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_members", filter: `workspace_id=eq.${workspaceId}` }, () => {
        fetchMembers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  const displayMembers = compact ? members.slice(0, 5) : members;

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Members</h3>
        <span className="text-xs text-muted-foreground">{members.length} total</span>
      </div>
      {members.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No members yet. Members will appear here once added or when they join via the tracker.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {displayMembers.map((member) => (
            <div
              key={member.id}
              onClick={() => {
                if (member.id !== "owner-virtual") navigate(`/w/${workspaceId}/members/${member.id}`);
              }}
              className="px-5 py-3 flex items-center gap-4 hover:bg-secondary/30 transition-colors cursor-pointer"
            >
              <Avatar className="w-9 h-9">
                {avatars[member.roblox_user_id] ? (
                  <AvatarImage src={avatars[member.roblox_user_id]} alt={member.roblox_username} />
                ) : null}
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {member.roblox_username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{member.roblox_username}</p>
                  {member.role === "Owner" && <Crown className="w-3 h-3 text-warning" />}
                  {member.verified && (
                    <span className="w-2 h-2 rounded-full bg-success" title="Verified" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${rankColors[member.role] || "bg-secondary text-muted-foreground"}`}>
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
