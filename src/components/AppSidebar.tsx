import { LayoutDashboard, Users, Shield, Settings, LogOut, Menu, Clock, Code, Megaphone, CalendarDays, Sun, Moon, FileText, CalendarOff, UserX } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/hooks/useTheme";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { workspaceId, workspace, isOwner } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { theme, toggleTheme } = useTheme();

  const base = `/w/${workspaceId}`;

  const mainItems = [
    { title: "Dashboard", url: `${base}/dashboard`, icon: LayoutDashboard, show: true },
    { title: "Members", url: `${base}/members`, icon: Users, show: true },
    { title: "Activity", url: `${base}/activity`, icon: Clock, show: hasPermission("view_activity") },
    { title: "Sessions", url: `${base}/sessions`, icon: CalendarDays, show: true },
    { title: "Wall", url: `${base}/wall`, icon: Megaphone, show: true },
    { title: "Documents", url: `${base}/documents`, icon: FileText, show: true },
    { title: "LOA", url: `${base}/loa`, icon: CalendarOff, show: true },
    { title: "Staff", url: `${base}/staff`, icon: UserX, show: isOwner || hasPermission("manage_members") },
  ];

  const showConfig = isOwner || hasPermission("view_config");
  const configItems = [
    { title: "Setup Tracking", url: `${base}/setup-tracking`, icon: Code },
    { title: "Settings", url: `${base}/settings`, icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-5 mb-1">
            {!collapsed ? (
              <div>
                <button onClick={() => navigate("/")} className="text-lg font-extrabold text-gradient tracking-tight hover:opacity-80 transition-opacity">
                  Fluxcore
                </button>
                {workspace && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{workspace.name}</p>}
              </div>
            ) : (
              <button onClick={() => navigate("/")} className="text-lg font-extrabold text-primary hover:opacity-80 transition-opacity">
                F
              </button>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-secondary/60" activeClassName="bg-primary/10 text-primary font-semibold">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showConfig && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground/70 px-4 uppercase tracking-widest">
              {!collapsed && "Config"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className="hover:bg-secondary/60" activeClassName="bg-primary/10 text-primary font-semibold">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} className="text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/workspaces")} className="text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
              <Menu className="mr-2 h-4 w-4" />
              {!collapsed && <span>Switch Workspace</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
