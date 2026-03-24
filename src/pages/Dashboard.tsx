import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsGrid } from "@/components/StatsGrid";
import { MemberList } from "@/components/MemberList";
import { ActivityLog } from "@/components/ActivityLog";

export default function Dashboard() {
  return (
    <DashboardLayout title="Pastriez Bakery">
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">Here's what's happening in your workspace</p>
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
