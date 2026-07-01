import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ReleaseModal } from "@/components/ReleaseModal";
import { SetupTutorial } from "@/components/SetupTutorial";
import { AlertTriangle, BadgeCheck, Loader2, RefreshCw } from "lucide-react";
import { useUIVersion } from "@/hooks/useUIVersion";
import { MinimalLayout } from "@/components/MinimalLayout";
import { BargainsShell } from "@/bargains/Shell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { QuotaSetupPrompt } from "@/components/QuotaSetupPrompt";

export function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { loading, workspace, error } = useWorkspace();
  const { version } = useUIVersion();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="glass rounded-xl border border-border/50 p-6 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-warning mx-auto" />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">Workspace is taking too long</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }


  // Nexus UI is the new default for every workspace.
  if (version === "nexus") {
    return (
      <BargainsShell>
        <div className="nexus-skin">
          <style>{`
            .nexus-skin .glass,
            .nexus-skin [class*="bg-card"],
            .nexus-skin .bg-background,
            .nexus-skin .bg-muted { background: #141416 !important; border-color: #22222a !important; }
            .nexus-skin .border, .nexus-skin .border-border, .nexus-skin .border-border\\/50 { border-color: #22222a !important; }
            .nexus-skin .text-foreground { color: #fafafa !important; }
            .nexus-skin .text-muted-foreground { color: #8a8a8e !important; }
            .nexus-skin .rounded-xl, .nexus-skin .rounded-2xl { border-radius: 6px !important; }
            .nexus-skin input, .nexus-skin textarea, .nexus-skin select {
              background: #0f0f11 !important; border-color: #26262a !important; color: #fafafa !important;
            }
          `}</style>
          {children}
        </div>
      </BargainsShell>
    );
  }

  if (version === "minimal") {
    return <MinimalLayout title={title}>{children}</MinimalLayout>;
  }


  const bgColor = workspace?.background_color || "#0f0f11";
  const showGrid = workspace?.show_grid ?? true;

  const hexToLum = (hex: string) => {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  const bgLum = hexToLum(bgColor);
  const logoColor = bgLum > 0.5 ? "#1a1a2e" : "#ffffff";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: bgColor }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/50 px-4 gap-4 backdrop-blur-xl" style={{ backgroundColor: `${bgColor}cc` }}>
            <SidebarTrigger />
            <span className="text-sm flex items-center gap-1.5" style={{ color: logoColor, opacity: 0.7 }}>
              {title || workspace?.name || "Fluxcore"}
              {workspace?.verified_official && <BadgeCheck className="w-3.5 h-3.5 text-primary" aria-label="Official verified group" />}
            </span>
          </header>
          <main className="flex-1 p-6 overflow-auto relative">
            {showGrid && <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />}
            <div className="relative">
              <AnnouncementBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
      <ReleaseModal />
      <SetupTutorial />
      <QuotaSetupPrompt />
    </SidebarProvider>
  );
}
