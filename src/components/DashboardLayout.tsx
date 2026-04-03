import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Loader2 } from "lucide-react";

export function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { loading, workspace } = useWorkspace();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/50 px-4 gap-4 bg-background/80 backdrop-blur-xl">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">{title || workspace?.name || "Fluxcore"}</span>
          </header>
          <main className="flex-1 p-6 overflow-auto relative">
            <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />
            <div className="relative">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
