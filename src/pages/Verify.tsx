import { DashboardLayout } from "@/components/DashboardLayout";
import { VerificationFlow } from "@/components/VerificationFlow";

export default function Verify() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Account Verification</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Verify your Roblox account and gamepass ownership
          </p>
        </div>
        <VerificationFlow />
      </div>
    </DashboardLayout>
  );
}
