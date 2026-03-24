import { DashboardLayout } from "@/components/DashboardLayout";
import { Shield, ChevronRight } from "lucide-react";

const ranks = [
  { name: "Owner", members: 1, color: "text-destructive", permissions: "Full access" },
  { name: "Admin", members: 3, color: "text-warning", permissions: "Manage members, ranks" },
  { name: "Moderator", members: 8, color: "text-primary", permissions: "Kick, mute, warn" },
  { name: "Trial Mod", members: 4, color: "text-success", permissions: "Warn, mute" },
  { name: "Staff", members: 12, color: "text-accent", permissions: "View logs" },
  { name: "Member", members: 1219, color: "text-muted-foreground", permissions: "Basic access" },
];

export default function Ranks() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ranks</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure group rank hierarchy</p>
        </div>
        <div className="glass rounded-lg overflow-hidden divide-y divide-border">
          {ranks.map((rank) => (
            <div key={rank.name} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer">
              <Shield className={`w-5 h-5 ${rank.color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{rank.name}</p>
                <p className="text-xs text-muted-foreground">{rank.permissions}</p>
              </div>
              <span className="text-xs text-muted-foreground">{rank.members} members</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
