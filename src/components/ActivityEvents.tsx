import { Shield, AlertTriangle, Ban, UserMinus, Gavel } from "lucide-react";

const events = [
  { type: "Kick", username: "xDarkSlayer", target: "TrollUser", reason: "Exploiting", time: "2 min ago", icon: UserMinus },
  { type: "Ban", username: "Admin_Pro", target: "Exploiter123", reason: "Speed hacking", time: "15 min ago", icon: Ban },
  { type: "Warn", username: "GamerKid99", target: "NewPlayer42", reason: "Spamming chat", time: "30 min ago", icon: AlertTriangle },
  { type: "Kick", username: "xDarkSlayer", target: "AFK_User", reason: "AFK too long", time: "1 hr ago", icon: UserMinus },
  { type: "Ban", username: "CoolBuilder", target: "GrieferXYZ", reason: "Griefing", time: "2 hrs ago", icon: Ban },
  { type: "Warn", username: "xDarkSlayer", target: "RobloxPro2024", reason: "Breaking protocol", time: "3 hrs ago", icon: AlertTriangle },
];

const typeColors: Record<string, string> = {
  Kick: "text-warning bg-warning/10",
  Ban: "text-destructive bg-destructive/10",
  Warn: "text-accent bg-accent/10",
};

export function ActivityEvents() {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/40">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Gavel className="w-4 h-4 text-primary" /> Adonis Admin Logs
        </h3>
      </div>
      <div className="divide-y divide-border/30">
        {events.map((event, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColors[event.type] || "text-muted-foreground bg-secondary"}`}>
              <event.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColors[event.type]}`}>
                  {event.type}
                </span>
                <p className="text-sm text-foreground truncate">
                  <span className="font-medium">{event.username}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="font-medium">{event.target}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{event.reason}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{event.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
