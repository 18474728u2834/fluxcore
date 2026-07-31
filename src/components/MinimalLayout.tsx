import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Megaphone, FileText, CalendarOff,
  UserX, Target, MessageSquare, ShieldCheck, Code, Settings, Sun, Moon, LogOut,
  DoorOpen, BadgeCheck, Sparkles, ChevronRight, Command,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/hooks/useTheme";
import { useUIVersion } from "@/hooks/useUIVersion";
import { useNexusConfig } from "@/hooks/useNexusConfig";
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
  const { config: nexusConfig } = useNexusConfig(workspaceId);
  const [hovered, setHovered] = useState(false);

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

  // Hover-expand rail style nav (Raycast/Vercel hybrid). Icon-only by default,
  // expands a labeled flyout on hover for a unique, ultra-clean feel.
  const expanded = nexusConfig.railMode !== "icons" && hovered;
  const railWidth = expanded ? 240 : 64;

  const RailItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <NavLink
      to={to}
      end
      className="rail-item group relative flex items-center h-10 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
      activeClassName="rail-item-active !text-foreground"
    >
      <span
        className="rail-indicator absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all h-0 opacity-0"
        style={{ background: primary, boxShadow: `0 0 12px ${primary}` }}
      />
      <span className="rail-icon ml-2 w-10 h-10 grid place-items-center rounded-xl shrink-0 transition-all group-hover:bg-foreground/[0.04]">
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span
        className={cn(
          "ml-3 text-[13px] font-medium whitespace-nowrap transition-all",
          expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
        )}
      >
        {label}
      </span>
    </NavLink>
  );

  return (
    <div
      className="min-h-screen flex w-full font-sans bg-background text-foreground relative"
      style={{
        backgroundImage:
          theme === "dark"
            ? "radial-gradient(circle at 20% 0%, hsl(var(--primary) / 0.08), transparent 40%), radial-gradient(circle at 80% 100%, hsl(var(--primary) / 0.05), transparent 40%)"
            : "radial-gradient(circle at 20% 0%, hsl(var(--primary) / 0.05), transparent 40%)",
      }}
    >
      {/* dotted grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--foreground) / 0.12) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
        }}
      />

      {/* Floating rail sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="fixed left-3 top-3 bottom-3 z-40 flex flex-col rounded-2xl border border-border/50 bg-background/70 backdrop-blur-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] overflow-hidden transition-[width] duration-300 ease-out"
        style={{ width: railWidth }}
      >
        {/* Brand */}
        <button
          onClick={() => navigate("/")}
          className="h-14 flex items-center gap-3 px-3.5 shrink-0 border-b border-border/40 hover:bg-foreground/[0.03] transition-colors"
        >
          <span
            className={cn(
              "text-[17px] font-extrabold tracking-tight text-gradient whitespace-nowrap transition-all",
              expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
            )}
          >
            Fluxcore
          </span>
        </button>

        {/* Workspace badge */}
        {workspace && (
          <div className="px-2 pt-2 pb-1 shrink-0">
            <div
              className={cn(
                "flex items-center gap-2 h-9 rounded-xl bg-foreground/[0.03] border border-border/40 px-2.5 overflow-hidden",
              )}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                style={{ background: primary, boxShadow: `0 0 8px ${primary}` }}
              />
              <span
                className={cn(
                  "text-[12px] font-medium text-foreground/90 truncate flex-1 transition-opacity",
                  expanded ? "opacity-100" : "opacity-0"
                )}
              >
                {workspace.name}
              </span>
              {workspace.verified_official && expanded && (
                <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1 scrollbar-thin">
          {main.filter(i => i.show).map(i => (
            <RailItem key={i.title} to={i.url} icon={i.icon} label={i.title} />
          ))}

          {showConfig && (
            <>
              <div className="my-3 mx-3 border-t border-border/40" />
              {config.map(i => (
                <RailItem key={i.title} to={i.url} icon={i.icon} label={i.title} />
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/40 p-2 space-y-1 shrink-0">
          <button
            onClick={() => setVersion("nexus")}
            className="group w-full flex items-center h-10 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="ml-2 w-10 h-10 grid place-items-center rounded-xl shrink-0 group-hover:bg-foreground/[0.04]">
              <Sparkles className="w-[18px] h-[18px]" />
            </span>
            <span className={cn("ml-3 text-[13px] font-medium whitespace-nowrap transition-all", expanded ? "opacity-100" : "opacity-0 pointer-events-none")}>
              Nexus UI (default)
            </span>
          </button>
          <button
            onClick={() => setVersion("classic")}
            className="group w-full flex items-center h-10 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="ml-2 w-10 h-10 grid place-items-center rounded-xl shrink-0 group-hover:bg-foreground/[0.04]">
              <Sparkles className="w-[18px] h-[18px]" />
            </span>
            <span className={cn("ml-3 text-[13px] font-medium whitespace-nowrap transition-all", expanded ? "opacity-100" : "opacity-0 pointer-events-none")}>
              Classic UI
            </span>
          </button>

          <button
            onClick={toggleTheme}
            className="group w-full flex items-center h-10 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="ml-2 w-10 h-10 grid place-items-center rounded-xl shrink-0 group-hover:bg-foreground/[0.04]">
              {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </span>
            <span className={cn("ml-3 text-[13px] font-medium whitespace-nowrap transition-all", expanded ? "opacity-100" : "opacity-0 pointer-events-none")}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          {!isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="group w-full flex items-center h-10 rounded-xl text-warning/80 hover:text-warning transition-colors">
                  <span className="ml-2 w-10 h-10 grid place-items-center rounded-xl shrink-0 group-hover:bg-warning/10">
                    <DoorOpen className="w-[18px] h-[18px]" />
                  </span>
                  <span className={cn("ml-3 text-[13px] font-medium whitespace-nowrap transition-all", expanded ? "opacity-100" : "opacity-0 pointer-events-none")}>
                    Leave workspace
                  </span>
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

          {/* user chip */}
          <div className="mt-1 pt-2 border-t border-border/40 flex items-center h-12 px-1.5 rounded-xl">
            {robloxUsername ? (
              <RobloxAvatar
                username={robloxUsername}
                className="w-9 h-9 rounded-full ring-2 ring-primary/30 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-foreground/10 shrink-0" />
            )}
            <div
              className={cn(
                "ml-3 flex-1 min-w-0 transition-all",
                expanded ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <div className="text-[12px] font-semibold text-foreground truncate">{robloxUsername || "Account"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{isOwner ? "Workspace owner" : "Member"}</div>
            </div>
            <button
              onClick={logout}
              className={cn(
                "p-2 rounded-lg text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-all",
                expanded ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 pl-[88px] relative z-10">
        <header className="h-14 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground/60">{workspace?.name || "Fluxcore"}</span>
            {title && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30" />
                <span className="text-foreground font-semibold">{title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 h-6 rounded-md border border-border/50 bg-foreground/[0.03] text-muted-foreground">
              <Command className="w-3 h-3" /> K
            </kbd>
            {workspace?.verified_official && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                <BadgeCheck className="w-3 h-3" /> VERIFIED
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="px-8 pb-10 pt-2 max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <ReleaseModal />
      <SetupTutorial />
    </div>
  );
}
