import { DashboardLayout } from "@/components/DashboardLayout";
import { VerificationFlow } from "@/components/VerificationFlow";

export default function Verify() {
  return (
    <DashboardLayout title="Verification">
      <div className="max-w-2xl mx-auto py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Account Verification</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Link your Roblox account to access workspace features
          </p>
        </div>
        <VerificationFlow />
      </div>
    </DashboardLayout>
  );
}
