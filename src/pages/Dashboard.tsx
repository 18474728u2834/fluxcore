import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsGrid } from "@/components/StatsGrid";
import { MemberList } from "@/components/MemberList";
import { ActivityLog } from "@/components/ActivityLog";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your Roblox group management</p>
        </div>
        <StatsGrid />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MemberList />
          <ActivityLog />
        </div>
      </div>
    </DashboardLayout>
  );
}
