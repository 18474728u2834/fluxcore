import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Workspaces from "./pages/Workspaces";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Ranks from "./pages/Ranks";
import Activity from "./pages/Activity";
import Sessions from "./pages/Sessions";
import Wall from "./pages/Wall";
import SetupTracking from "./pages/SetupTracking";
import SettingsPage from "./pages/Settings";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function WorkspaceRoutes() {
  return (
    <WorkspaceProvider>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="activity" element={<Activity />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="wall" element={<Wall />} />
        <Route path="ranks" element={<Ranks />} />
        <Route path="setup-tracking" element={<SetupTracking />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </WorkspaceProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/workspaces" element={<Workspaces />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/w/:workspaceId/*" element={<WorkspaceRoutes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
