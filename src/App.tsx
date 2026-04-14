import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load critical paths
import Index from "./pages/Index";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";

// Lazy load everything else
const Workspaces = lazy(() => import("./pages/Workspaces"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const Ranks = lazy(() => import("./pages/Ranks"));
const Activity = lazy(() => import("./pages/Activity"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Wall = lazy(() => import("./pages/Wall"));
const SetupTracking = lazy(() => import("./pages/SetupTracking"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Terms = lazy(() => import("./pages/Terms"));
const Feedback = lazy(() => import("./pages/Feedback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Support = lazy(() => import("./pages/Support"));
const JoinWorkspace = lazy(() => import("./pages/JoinWorkspace"));
const Documents = lazy(() => import("./pages/Documents"));
const LOA = lazy(() => import("./pages/LOA"));
const Staff = lazy(() => import("./pages/Staff"));
const Roles = lazy(() => import("./pages/Roles"));
const Quotas = lazy(() => import("./pages/Quotas"));
const BloxyBargains = lazy(() => import("./pages/BloxyBargains"));
const BloxyBargainsDowntown = lazy(() => import("./pages/BloxyBargainsDowntown"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
}

function WorkspaceRoutes() {
  return (
    <WorkspaceProvider>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="roles" element={<Roles />} />
          <Route path="quotas" element={<Quotas />} />
        </Routes>
      </Suspense>
    </WorkspaceProvider>
  );
}

function AppRoutes() {
  const hostname = window.location.hostname;

  if (hostname.includes("bloxy-bargains") || hostname.includes("bargains.")) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<BloxyBargains />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/workspaces" element={<Workspaces />} />
          <Route path="/w/:workspaceId/*" element={<WorkspaceRoutes />} />
          <Route path="*" element={<BloxyBargains />} />
        </Routes>
      </Suspense>
    );
  }

  if (hostname.includes("downtown")) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<BloxyBargainsDowntown />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/workspaces" element={<Workspaces />} />
          <Route path="/w/:workspaceId/*" element={<WorkspaceRoutes />} />
          <Route path="*" element={<BloxyBargainsDowntown />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/support" element={<Support />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/join/:inviteCode" element={<JoinWorkspace />} />
        <Route path="/w/:workspaceId/*" element={<WorkspaceRoutes />} />
        <Route path="/bloxy-bargains" element={<BloxyBargains />} />
        <Route path="/bargains-downtown" element={<BloxyBargainsDowntown />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
