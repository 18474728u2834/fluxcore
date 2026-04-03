import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Workspaces from "./pages/Workspaces";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import MemberProfile from "./pages/MemberProfile";
import Ranks from "./pages/Ranks";
import Activity from "./pages/Activity";
import Sessions from "./pages/Sessions";
import Wall from "./pages/Wall";
import SetupTracking from "./pages/SetupTracking";
import SettingsPage from "./pages/Settings";
import Terms from "./pages/Terms";
import Feedback from "./pages/Feedback";
import NotFound from "./pages/NotFound";
import JoinWorkspace from "./pages/JoinWorkspace";
import Documents from "./pages/Documents";
import LOA from "./pages/LOA";
import Staff from "./pages/Staff";
import BloxyBargains from "./pages/BloxyBargains";
import BloxyBargainsDowntown from "./pages/BloxyBargainsDowntown";

const queryClient = new QueryClient();

function WorkspaceRoutes() {
  return (
    <WorkspaceProvider>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="members/:memberId" element={<MemberProfile />} />
        <Route path="activity" element={<Activity />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="wall" element={<Wall />} />
        <Route path="ranks" element={<Ranks />} />
        <Route path="setup-tracking" element={<SetupTracking />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="documents" element={<Documents />} />
        <Route path="loa" element={<LOA />} />
        <Route path="staff" element={<Staff />} />
      </Routes>
    </WorkspaceProvider>
  );
}

function AppRoutes() {
  // Check hostname for partner sites
  const hostname = window.location.hostname;

  if (hostname.includes("bloxy-bargains") || hostname.includes("bargains.")) {
    return (
      <Routes>
        <Route path="/" element={<BloxyBargains />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/w/:workspaceId/*" element={<WorkspaceRoutes />} />
        <Route path="*" element={<BloxyBargains />} />
      </Routes>
    );
  }

  if (hostname.includes("bargains-downtown")) {
    return (
      <Routes>
        <Route path="/" element={<BloxyBargainsDowntown />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/w/:workspaceId/*" element={<WorkspaceRoutes />} />
        <Route path="*" element={<BloxyBargainsDowntown />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/workspaces" element={<Workspaces />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/join/:inviteCode" element={<JoinWorkspace />} />
      <Route path="/w/:workspaceId/*" element={<WorkspaceRoutes />} />
      <Route path="/bloxy-bargains" element={<BloxyBargains />} />
      <Route path="/bargains-downtown" element={<BloxyBargainsDowntown />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
