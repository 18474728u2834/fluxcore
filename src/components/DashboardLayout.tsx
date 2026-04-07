import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ReleaseModal } from "@/components/ReleaseModal";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { loading, workspace, workspaceId, isOwner } = useWorkspace();
  const [branding, setBranding] = useState<{ background_color: string; show_grid: boolean; primary_color: string; text_color: string } | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    supabase.from("workspaces").select("background_color, show_grid, primary_color, text_color").eq("id", workspaceId).single()
      .then(({ data }) => {
        if (data) setBranding(data as any);
      });
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const bgColor = branding?.background_color || "#0f0f11";
  const showGrid = branding?.show_grid ?? true;
  const primaryColor = branding?.primary_color || "#7c3aed";

  // Determine if primary color is light or dark for logo adaptation
  const hexToLum = (hex: string) => {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  const bgLum = hexToLum(bgColor);
  // If background is light, use dark text for Fluxcore logo
  const logoColor = bgLum > 0.5 ? "#1a1a2e" : "#ffffff";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: bgColor }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/50 px-4 gap-4 backdrop-blur-xl" style={{ backgroundColor: `${bgColor}cc` }}>
            <SidebarTrigger />
            <span className="text-sm" style={{ color: logoColor, opacity: 0.7 }}>{title || workspace?.name || "Fluxcore"}</span>
          </header>
          <main className="flex-1 p-6 overflow-auto relative">
            {showGrid && <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />}
            <div className="relative">{children}</div>
          </main>
        </div>
      </div>
      <ReleaseModal />
    </SidebarProvider>
  );
}
