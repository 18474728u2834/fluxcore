import { Users, Shield, Activity, TrendingUp } from "lucide-react";

const stats = [
  { label: "Verified Members", value: "1,247", icon: Users, trend: "+12%" },
  { label: "Active Today", value: "89", icon: Activity, trend: "+5%" },
  { label: "Ranks Managed", value: "14", icon: Shield, trend: "0%" },
  { label: "Actions This Week", value: "342", icon: TrendingUp, trend: "+18%" },
];

export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="glass rounded-lg p-5 space-y-3 animate-slide-in">
          <div className="flex items-center justify-between">
            <stat.icon className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-success">{stat.trend}</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
