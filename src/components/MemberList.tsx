import { Shield, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
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
}

const rankColors: Record<string, string> = {
  Owner: "bg-destructive/10 text-destructive",
  Admin: "bg-warning/10 text-warning",
  Moderator: "bg-primary/10 text-primary",
  Staff: "bg-success/10 text-success",
  Member: "bg-secondary text-muted-foreground",
  "Trial Mod": "bg-warning/10 text-warning",
};

function getRobloxAvatar(userId: string) {
  return `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=48x48&format=Png&isCircular=true`;
}

export function MemberList({ compact }: { compact?: boolean }) {
  const { workspaceId } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });
    setMembers(data || []);
    setLoading(false);

    // Fetch avatars
    if (data && data.length > 0) {
      const userIds = data.map((m) => m.roblox_user_id).join(",");
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
      } catch {
        // avatars are optional
      }
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
            <div key={member.id} className="px-5 py-3 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
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
