import { DashboardLayout } from "@/components/DashboardLayout";
import { MemberList } from "@/components/MemberList";

export default function Members() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your verified group members</p>
        </div>
        <MemberList />
      </div>
    </DashboardLayout>
  );
}
