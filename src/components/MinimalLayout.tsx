import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Megaphone, FileText, CalendarOff,
  UserX, Target, MessageSquare, ShieldCheck, Code, Settings, Sun, Moon, LogOut,
  DoorOpen, Menu as MenuIcon, BadgeCheck, Sparkles, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/hooks/useTheme";
import { useUIVersion } from "@/hooks/useUIVersion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ReleaseModal } from "@/components/ReleaseModal";
import { SetupTutorial } from "@/components/SetupTutorial";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function MinimalLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { workspaceId, workspace, isOwner } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const { setVersion } = useUIVersion();
  const [collapsed, setCollapsed] = useState(false);

  const base = `/w/${workspaceId}`;
  const primary = workspace?.primary_color || "#7c3aed";
  const bg = workspace?.background_color || "#0a0a0c";

  const main = [
    { title: "Dashboard", url: `${base}/dashboard`, icon: LayoutDashboard, show: true },
    { title: "Members", url: `${base}/members`, icon: Users, show: true },
    { title: "Activity", url: `${base}/activity`, icon: Clock, show: hasPermission("view_activity") },
    { title: "Sessions", url: `${base}/sessions`, icon: CalendarDays, show: true },
    { title: "Wall", url: `${base}/wall`, icon: Megaphone, show: true },
    { title: "Documents", url: `${base}/documents`, icon: FileText, show: true },
    { title: "LOA", url: `${base}/loa`, icon: CalendarOff, show: true },
    { title: "Staff", url: `${base}/staff`, icon: UserX, show: isOwner || hasPermission("manage_members") },
    { title: "Quotas", url: `${base}/quotas`, icon: Target, show: true },
    { title: "Logs", url: `${base}/message-logs`, icon: MessageSquare, show: isOwner || hasPermission("view_message_logs") },
  ];

  const showConfig = isOwner || hasPermission("view_config");
  const config = [
    { title: "Roles", url: `${base}/roles`, icon: ShieldCheck },
    { title: "Tracking", url: `${base}/setup-tracking`, icon: Code },
    { title: "Settings", url: `${base}/settings`, icon: Settings },
  ];

  const logout = async () => { await signOut(); navigate("/login"); };
  const leave = async () => {
    if (!user) return;
    const { error } = await supabase.from("workspace_members").delete()
      .eq("workspace_id", workspaceId).eq("user_id", user.id);
    if (error) toast.error("Failed to leave workspace");
    else { toast.success("Left workspace"); navigate("/workspaces"); }
  };

  const linkBase = "group flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors";
  const linkActive = "bg-foreground/[0.06] text-foreground font-medium";

  return (
    <div className="min-h-screen flex w-full font-sans" style={{ backgroundColor: bg }}>
      <aside
        className={cn(
          "shrink-0 flex flex-col border-r border-border/40 transition-all duration-200",
          collapsed ? "w-[56px]" : "w-[220px]"
        )}
        style={{ backgroundColor: bg }}
      >
        <div className="h-12 flex items-center justify-between px-3 border-b border-border/40">
          {!collapsed && (
            <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight">
              <span className="w-5 h-5 rounded-[5px] grid place-items-center text-[10px] font-bold text-white" style={{ backgroundColor: primary }}>F</span>
              <span className="text-foreground">Fluxcore</span>
            </button>
          )}
          {collapsed && (
            <button onClick={() => navigate("/")} className="w-5 h-5 rounded-[5px] grid place-items-center text-[10px] font-bold text-white mx-auto" style={{ backgroundColor: primary }}>F</button>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {workspace && !collapsed && (
          <div className="px-3 py-2 border-b border-border/40">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
              <span className="truncate font-medium text-foreground/80">{workspace.name}</span>
              {workspace.verified_official && <BadgeCheck className="w-3 h-3 text-primary shrink-0" />}
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {main.filter(i => i.show).map(i => (
            <NavLink key={i.title} to={i.url} end className={linkBase} activeClassName={linkActive}>
              <i.icon className="w-3.5 h-3.5 shrink-0" />
              {!collapsed && <span className="truncate">{i.title}</span>}
            </NavLink>
          ))}

          {showConfig && (
            <>
              {!collapsed && (
                <div className="px-2.5 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  Config
                </div>
              )}
              {collapsed && <div className="my-2 mx-2 border-t border-border/40" />}
              {config.map(i => (
                <NavLink key={i.title} to={i.url} end className={linkBase} activeClassName={linkActive}>
                  <i.icon className="w-3.5 h-3.5 shrink-0" />
                  {!collapsed && <span className="truncate">{i.title}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-1.5 border-t border-border/40 space-y-0.5">
          <button onClick={() => setVersion("classic")} className={cn(linkBase, "w-full")}>
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Classic UI</span>}
          </button>
          <button onClick={toggleTheme} className={cn(linkBase, "w-full")}>
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 shrink-0" /> : <Moon className="w-3.5 h-3.5 shrink-0" />}
            {!collapsed && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
          </button>
          <button onClick={() => navigate("/workspaces")} className={cn(linkBase, "w-full")}>
            <MenuIcon className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Switch</span>}
          </button>
          {!isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className={cn(linkBase, "w-full text-warning/80 hover:text-warning")}>
                  <DoorOpen className="w-3.5 h-3.5 shrink-0" />
                  {!collapsed && <span>Leave</span>}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Workspace?</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to leave {workspace?.name}?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, stay</AlertDialogCancel>
                  <AlertDialogAction onClick={leave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, leave</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <button onClick={logout} className={cn(linkBase, "w-full text-destructive/80 hover:text-destructive")}>
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex items-center px-5 border-b border-border/40 backdrop-blur-xl shrink-0" style={{ backgroundColor: `${bg}cc` }}>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="text-foreground/90 font-medium">{title || workspace?.name || "Fluxcore"}</span>
            {workspace?.verified_official && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="px-6 py-6 max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <ReleaseModal />
      <SetupTutorial />
    </div>
  );
}
