import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsGrid } from "@/components/StatsGrid";
import { MemberList } from "@/components/MemberList";
import { ActivityLog } from "@/components/ActivityLog";

export default function Dashboard() {
  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your workspace at a glance</p>
        </div>
        <StatsGrid />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MemberList />
          <ActivityLog />
        </div>
      </div>
    </DashboardLayout>
  );
}
