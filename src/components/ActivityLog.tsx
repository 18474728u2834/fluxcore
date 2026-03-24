import { Clock } from "lucide-react";

const logs = [
  { action: "Promoted", user: "xDarkSlayer", detail: "Member → Moderator", time: "2 min ago" },
  { action: "Verified", user: "RobloxPro2024", detail: "Account verified", time: "15 min ago" },
  { action: "Joined", user: "GamerKid99", detail: "New member", time: "1 hr ago" },
  { action: "Demoted", user: "OldMod123", detail: "Moderator → Member", time: "3 hrs ago" },
  { action: "Banned", user: "TrollUser", detail: "Reason: Exploiting", time: "5 hrs ago" },
];

const actionColors: Record<string, string> = {
  Promoted: "text-success",
  Verified: "text-primary",
  Joined: "text-muted-foreground",
  Demoted: "text-warning",
  Banned: "text-destructive",
};

export function ActivityLog() {
  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Activity Log</h3>
      </div>
      <div className="divide-y divide-border">
        {logs.map((log, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className={`font-medium ${actionColors[log.action] || ""}`}>{log.action}</span>{" "}
                <span className="text-muted-foreground">—</span>{" "}
                <span className="font-medium">{log.user}</span>
              </p>
              <p className="text-xs text-muted-foreground">{log.detail}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
