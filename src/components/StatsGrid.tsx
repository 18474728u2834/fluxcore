import { Users, Shield, Activity, TrendingUp } from "lucide-react";

const stats = [
  { label: "Verified Members", value: "1,247", icon: Users, trend: "+12%" },
  { label: "Active Today", value: "89", icon: Activity, trend: "+5%" },
  { label: "Ranks Managed", value: "14", icon: Shield, trend: "—" },
  { label: "Actions This Week", value: "342", icon: TrendingUp, trend: "+18%" },
];

export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-hover rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <stat.icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-success">{stat.trend}</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
