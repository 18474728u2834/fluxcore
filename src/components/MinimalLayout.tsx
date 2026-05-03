import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Megaphone, FileText, CalendarOff,
  UserX, Target, MessageSquare, ShieldCheck, Code, Settings, Sun, Moon, LogOut,
  DoorOpen, BadgeCheck, Sparkles, PanelLeftClose, PanelLeftOpen, ChevronRight,
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
import { RobloxAvatar } from "@/components/RobloxAvatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function MinimalLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const navigate = useNavigate();
  const { signOut, user, robloxUsername } = useAuth();
  const { workspaceId, workspace, isOwner } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const { setVersion } = useUIVersion();
  const [collapsed, setCollapsed] = useState(false);

  const base = `/w/${workspaceId}`;
  const primary = workspace?.primary_color || "#7c3aed";

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

  // Modern Linear/Vercel-style nav rows: roomy hit area, subtle active indicator
  const linkBase =
    "group relative flex items-center gap-3 px-3 h-9 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-all duration-150";
  const linkActive =
    "bg-foreground/[0.06] text-foreground font-medium shadow-[inset_0_0_0_1px_hsl(var(--border)/0.5)]";

  return (
    <div className="min-h-screen flex w-full font-sans bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "shrink-0 flex flex-col border-r border-border/50 bg-background/60 backdrop-blur-xl transition-[width] duration-200 ease-out",
          collapsed ? "w-[68px]" : "w-[256px]"
        )}
      >
        {/* Brand */}
        <div className="h-14 flex items-center justify-between px-4">
          {!collapsed ? (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 group"
            >
              <span
                className="w-7 h-7 rounded-lg grid place-items-center text-[12px] font-bold text-white shadow-md transition-transform group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${primary}, ${primary}aa)`,
                  boxShadow: `0 4px 14px -4px ${primary}66`,
                }}
              >
                F
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                Fluxcore
              </span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/")}
              className="w-7 h-7 rounded-lg grid place-items-center text-[12px] font-bold text-white mx-auto shadow-md"
              style={{
                background: `linear-gradient(135deg, ${primary}, ${primary}aa)`,
                boxShadow: `0 4px 14px -4px ${primary}66`,
              }}
            >
              F
            </button>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground/60 hover:text-foreground p-1.5 rounded-md hover:bg-foreground/[0.04] transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Workspace pill */}
        {workspace && !collapsed && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-foreground/[0.03] border border-border/40">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: primary, boxShadow: `0 0 8px ${primary}` }}
              />
              <span className="text-[13px] font-medium text-foreground/90 truncate flex-1">
                {workspace.name}
              </span>
              {workspace.verified_official && (
                <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 space-y-0.5 scrollbar-thin">
          {main.filter(i => i.show).map(i => (
            <NavLink key={i.title} to={i.url} end className={linkBase} activeClassName={linkActive}>
              <i.icon className="w-[18px] h-[18px] shrink-0 opacity-80 group-hover:opacity-100" />
              {!collapsed && <span className="truncate">{i.title}</span>}
            </NavLink>
          ))}

          {showConfig && (
            <>
              {!collapsed ? (
                <div className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">
                  Workspace
                </div>
              ) : (
                <div className="my-3 mx-2 border-t border-border/40" />
              )}
              {config.map(i => (
                <NavLink key={i.title} to={i.url} end className={linkBase} activeClassName={linkActive}>
                  <i.icon className="w-[18px] h-[18px] shrink-0 opacity-80 group-hover:opacity-100" />
                  {!collapsed && <span className="truncate">{i.title}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer actions */}
        <div className="p-2.5 border-t border-border/40 space-y-0.5">
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className={cn(linkBase, "w-full justify-center")}
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-[18px] h-[18px] shrink-0" />
            </button>
          )}
          <button onClick={() => setVersion("classic")} className={cn(linkBase, "w-full")}>
            <Sparkles className="w-[18px] h-[18px] shrink-0 opacity-80" />
            {!collapsed && <span>Classic UI</span>}
          </button>
          <button onClick={toggleTheme} className={cn(linkBase, "w-full")}>
            {theme === "dark"
              ? <Sun className="w-[18px] h-[18px] shrink-0 opacity-80" />
              : <Moon className="w-[18px] h-[18px] shrink-0 opacity-80" />}
            {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
          </button>

          {/* User chip */}
          {!collapsed && robloxUsername && (
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-foreground/[0.03] transition-colors">
              <RobloxAvatar username={robloxUsername} className="w-7 h-7 rounded-full ring-1 ring-border/60" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">{robloxUsername}</div>
                <div className="text-[11px] text-muted-foreground truncate">{isOwner ? "Owner" : "Member"}</div>
              </div>
              <button
                onClick={logout}
                className="text-muted-foreground/60 hover:text-destructive p-1 rounded transition-colors"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!isOwner && !collapsed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className={cn(linkBase, "w-full text-warning/80 hover:text-warning")}>
                  <DoorOpen className="w-[18px] h-[18px] shrink-0" />
                  <span>Leave workspace</span>
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

          {collapsed && (
            <button
              onClick={logout}
              className={cn(linkBase, "w-full justify-center text-destructive/80 hover:text-destructive")}
              aria-label="Sign out"
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-8 border-b border-border/40 backdrop-blur-xl bg-background/70 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground/70">{workspace?.name || "Fluxcore"}</span>
            {title && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                <span className="text-foreground font-medium">{title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {workspace?.verified_official && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                <BadgeCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="px-8 py-8 max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <ReleaseModal />
      <SetupTutorial />
    </div>
  );
}
