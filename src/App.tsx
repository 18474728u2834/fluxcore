import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Workspaces from "./pages/Workspaces.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Verify from "./pages/Verify.tsx";
import Members from "./pages/Members.tsx";
import Ranks from "./pages/Ranks.tsx";
import Activity from "./pages/Activity.tsx";
import Sessions from "./pages/Sessions.tsx";
import Wall from "./pages/Wall.tsx";
import SetupTracking from "./pages/SetupTracking.tsx";
import SettingsPage from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/members" element={<Members />} />
            <Route path="/ranks" element={<Ranks />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/wall" element={<Wall />} />
            <Route path="/setup-tracking" element={<SetupTracking />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
