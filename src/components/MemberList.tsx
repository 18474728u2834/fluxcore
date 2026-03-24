import { Shield, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const members = [
  { name: "xDarkSlayer", rank: "Moderator", verified: true, lastActive: "2 min ago" },
  { name: "RobloxPro2024", rank: "Staff", verified: true, lastActive: "15 min ago" },
  { name: "GamerKid99", rank: "Member", verified: true, lastActive: "1 hr ago" },
  { name: "CoolBuilder", rank: "Trial Mod", verified: false, lastActive: "3 hrs ago" },
  { name: "NinjaX", rank: "Member", verified: true, lastActive: "5 hrs ago" },
];

const rankColors: Record<string, string> = {
  Moderator: "bg-primary/10 text-primary",
  Staff: "bg-success/10 text-success",
  Member: "bg-muted text-muted-foreground",
  "Trial Mod": "bg-warning/10 text-warning",
};

export function MemberList() {
  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Members</h3>
        <span className="text-xs text-muted-foreground">5 shown</span>
      </div>
      <div className="divide-y divide-border">
        {members.map((member) => (
          <div key={member.name} className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                {member.verified && (
                  <span className="w-2 h-2 rounded-full bg-success" title="Verified" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{member.lastActive}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${rankColors[member.rank] || ""}`}>
              {member.rank}
            </span>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
