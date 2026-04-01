import { DashboardLayout } from "@/components/DashboardLayout";
import { Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Loader2 } from "lucide-react";

interface RankInfo {
  name: string;
  count: number;
}

export default function Ranks() {
  const { workspaceId } = useWorkspace();
  const [ranks, setRanks] = useState<RankInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanks = async () => {
      const { data } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId);

      const counts: Record<string, number> = {};
      (data || []).forEach(m => {
        counts[m.role] = (counts[m.role] || 0) + 1;
      });

      // Add owner
      const result: RankInfo[] = [{ name: "Owner", count: 1 }];
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => result.push({ name, count }));

      setRanks(result);
      setLoading(false);
    };
    fetchRanks();
  }, [workspaceId]);

  const rankColors: Record<string, string> = {
    Owner: "text-destructive",
    Admin: "text-warning",
    Moderator: "text-primary",
    Staff: "text-success",
    Member: "text-muted-foreground",
    "Trial Mod": "text-warning",
  };

  return (
    <DashboardLayout title="Ranks">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ranks</h1>
          <p className="text-muted-foreground text-sm mt-1">Workspace role hierarchy</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <div className="glass rounded-xl overflow-hidden divide-y divide-border/40">
            {ranks.map((rank) => (
              <div key={rank.name} className="px-5 py-4 flex items-center gap-4">
                <Shield className={`w-5 h-5 ${rankColors[rank.name] || "text-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{rank.name}</p>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> {rank.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
