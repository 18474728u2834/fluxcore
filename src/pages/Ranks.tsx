import { DashboardLayout } from "@/components/DashboardLayout";
import { Shield, Users, RefreshCw, ExternalLink, Crown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RankInfo {
  name: string;
  count: number;
  color: string;
}

interface GroupInfo {
  name: string;
  memberCount: number;
  iconUrl?: string;
}

export default function Ranks() {
  const { workspaceId, workspace, isOwner } = useWorkspace();
  const [ranks, setRanks] = useState<RankInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchRanks = async () => {
    // Pull roles for colors, members for counts
    const [{ data: rolesData }, { data: membersData }] = await Promise.all([
      supabase.from("workspace_roles").select("name, color, position")
        .eq("workspace_id", workspaceId).order("position", { ascending: false }),
      supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId),
    ]);

    const counts: Record<string, number> = {};
    (membersData || []).forEach((m: any) => {
      counts[m.role] = (counts[m.role] || 0) + 1;
    });

    const colorOf: Record<string, string> = {};
    (rolesData || []).forEach((r: any) => { colorOf[r.name] = r.color; });

    const ordered: RankInfo[] = [{ name: "Owner", count: 1, color: "#f59e0b" }];
    if (rolesData && rolesData.length > 0) {
      rolesData.forEach((r: any) => {
        ordered.push({ name: r.name, count: counts[r.name] || 0, color: r.color });
      });
    } else {
      Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
        ordered.push({ name, count, color: "#64748b" });
      });
    }
    setRanks(ordered);
    setSyncedAt(new Date());
  };

  const fetchGroup = async () => {
    const gid = workspace?.roblox_group_id;
    if (!gid) { setGroup(null); return; }
    try {
      const [gRes, iRes] = await Promise.all([
        fetch(`https://groups.roblox.com/v1/groups/${gid}`),
        fetch(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${gid}&size=150x150&format=Png&isCircular=true`),
      ]);
      const gJson = await gRes.json().catch(() => null);
      const iJson = await iRes.json().catch(() => null);
      if (gJson?.name) {
        setGroup({
          name: gJson.name,
          memberCount: gJson.memberCount || 0,
          iconUrl: iJson?.data?.[0]?.imageUrl,
        });
      }
    } catch {}
  };

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([fetchRanks(), fetchGroup()]).then(() => setLoading(false));
  }, [workspaceId, workspace?.roblox_group_id]);

  const sync = async () => {
    setSyncing(true);
    await Promise.all([fetchRanks(), fetchGroup()]);
    setSyncing(false);
    toast.success("Ranks refreshed");
  };

  const totalMembers = ranks.reduce((s, r) => s + r.count, 0);
  const lastSyncLabel = syncedAt ? `${Math.max(0, Math.round((Date.now() - syncedAt.getTime()) / 1000))}s ago` : "—";

  return (
    <DashboardLayout title="Ranks">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rank Ladder</h1>
          <p className="text-muted-foreground text-sm mt-1">Workspace role hierarchy — highest authority on top.</p>
        </div>

        {/* Group header strip */}
        <div className="glass rounded-xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {group?.iconUrl ? (
              <img src={group.iconUrl} alt={group.name} className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground truncate">
                {group?.name || workspace?.name || "No Roblox group connected"}
              </p>
              {group && (
                <a
                  href={`https://www.roblox.com/groups/${workspace?.roblox_group_id}`}
                  target="_blank" rel="noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Open on Roblox"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {group ? group.memberCount.toLocaleString() : totalMembers} {group ? "in group" : "in workspace"}
              </span>
              <span>·</span>
              <span>Last sync {lastSyncLabel}</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
            Sync now
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : ranks.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center space-y-2">
            <Shield className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No ranks yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ranks.map((rank, idx) => {
              const tier = idx === 0 ? "top" : idx < 3 ? "mid" : "base";
              return (
                <div
                  key={rank.name}
                  className="group glass rounded-xl px-4 py-3.5 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Rank position */}
                  <div className="w-9 text-center">
                    <span className={`text-lg font-bold tabular-nums ${
                      tier === "top" ? "text-warning" : tier === "mid" ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {ranks.length - idx}
                    </span>
                  </div>

                  {/* Color dot */}
                  <div
                    className="w-2.5 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: rank.color }}
                  />

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Crown className="w-3.5 h-3.5 text-warning shrink-0" />}
                      <p className="text-sm font-medium text-foreground truncate">{rank.name}</p>
                    </div>
                  </div>

                  {/* Count */}
                  <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
                    <Users className="w-3 h-3" /> {rank.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {isOwner && (
          <p className="text-[11px] text-muted-foreground px-1">
            Manage role permissions and assignments under <span className="text-foreground">Roles</span>.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
