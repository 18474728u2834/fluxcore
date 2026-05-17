import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ReleaseModal } from "@/components/ReleaseModal";
import { SetupTutorial } from "@/components/SetupTutorial";
import { BadgeCheck, Loader2, Search } from "lucide-react";
import { useUIVersion } from "@/hooks/useUIVersion";
import { MinimalLayout } from "@/components/MinimalLayout";

export function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { loading, workspace } = useWorkspace();
  const { version } = useUIVersion();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (version === "minimal") {
    return <MinimalLayout title={title}>{children}</MinimalLayout>;
  }

  const BARGAINS_WS = "b4de7ffa-81e6-4d05-8e9d-8ce0a4904630";
  const isBargains = workspace?.id === BARGAINS_WS;

  const bgColor = isBargains ? "#0e0f10" : (workspace?.background_color || "#0f0f11");
  const showGrid = isBargains ? false : (workspace?.show_grid ?? true);
  const primaryColor = workspace?.primary_color || "#7c3aed";

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
    <SidebarProvider defaultOpen={!isBargains}>
      <div className={`min-h-screen flex w-full ${isBargains ? "theme-bargains" : ""}`} style={{ backgroundColor: bgColor }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/50 px-4 gap-4 backdrop-blur-xl" style={{ backgroundColor: `${bgColor}cc` }}>
            {!isBargains && <SidebarTrigger />}
            {isBargains ? (
              <>
                <div className="flex-1 flex justify-center">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      placeholder="Search anything..."
                      className="w-full h-8 pl-9 pr-3 rounded-md bg-[#161616] border border-[#222] text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                    />
                  </div>
                </div>
              </>
            ) : (
              <span className="text-sm flex items-center gap-1.5" style={{ color: logoColor, opacity: 0.7 }}>
                {title || workspace?.name || "Fluxcore"}
                {workspace?.verified_official && <BadgeCheck className="w-3.5 h-3.5 text-primary" aria-label="Official verified group" />}
              </span>
            )}
          </header>
          <main className="flex-1 p-6 overflow-auto relative">
            {showGrid && <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />}
            <div className="relative">{children}</div>
          </main>
        </div>
      </div>
      <ReleaseModal />
      <SetupTutorial />
    </SidebarProvider>
  );
}
