import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { UIVersionProvider, useUIVersion } from "@/hooks/useUIVersion";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { I18nProvider } from "@/hooks/useI18n";
import { DOMTranslator } from "@/components/DOMTranslator";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { BlacklistGate } from "@/components/BlacklistGate";
import { AccountRemovalGate } from "@/components/AccountRemovalGate";
import { LoadWatchdog } from "@/components/LoadWatchdog";
import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Lazy load every route — each gets its own JS chunk so devtools
// only ever sees code for the page that's currently rendered.
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const LinkDiscord = lazy(() => import("./pages/LinkDiscord"));

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
const FeedbackTicket = lazy(() => import("./pages/FeedbackTicket"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Support = lazy(() => import("./pages/Support"));
const JoinWorkspace = lazy(() => import("./pages/JoinWorkspace"));
const Documents = lazy(() => import("./pages/Documents"));
const DocumentView = lazy(() => import("./pages/DocumentView"));
const LOA = lazy(() => import("./pages/LOA"));
const Staff = lazy(() => import("./pages/Staff"));
const Roles = lazy(() => import("./pages/Roles"));
const Quotas = lazy(() => import("./pages/Quotas"));
const MessageLogs = lazy(() => import("./pages/MessageLogs"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const BloxyBargains = lazy(() => import("./pages/BloxyBargains"));
const Bargains = lazy(() => import("./pages/Bargains"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Admin = lazy(() => import("./pages/Admin"));
const ApiIndex = lazy(() => import("./pages/api/ApiIndex"));
const ApiSessions = lazy(() => import("./pages/api/SessionsApi"));
const ApiRanking = lazy(() => import("./pages/api/RankingApi"));
const Almore = lazy(() => import("./pages/Almore"));
const AlmoreLogin = lazy(() => import("./pages/AlmoreLogin"));
const BargainsLogin = lazy(() => import("./pages/BargainsLogin"));
const Shoply = lazy(() => import("./pages/Shoply"));
const ShoplyLogin = lazy(() => import("./pages/ShoplyLogin"));
const BDashboard = lazy(() => import("./bargains/Dashboard"));
const BSessions  = lazy(() => import("./bargains/Sessions"));
const BQuotas    = lazy(() => import("./bargains/Quotas"));
const BMembers   = lazy(() => import("./bargains/Members"));
const BActivity  = lazy(() => import("./bargains/Activity"));
const BLOA       = lazy(() => import("./bargains/LOA"));
const BDocuments = lazy(() => import("./bargains/Documents"));
const BMemberProfile = lazy(() => import("./bargains/MemberProfile"));
const BWall      = lazy(() => import("./bargains/Wall"));
const BStaff     = lazy(() => import("./bargains/Staff"));
const BRoles     = lazy(() => import("./bargains/Roles"));
const PartnerPortal = lazy(() => import("./pages/PartnerPortal"));
const PartnerLogin = lazy(() => import("./pages/PartnerLogin"));
const ThemedPortal = lazy(() => import("./pages/ThemedPortal"));
const PartnerClosed = lazy(() => import("./pages/PartnerClosed"));


const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
}

// Workspaces that use the Hyra-style Bargains UI.
// Populated at app boot from partner_portals where use_hyra_ui = true,
// plus any portal subdomain that opts in. Admins control this from the
// Staff Dashboard → Partner Portals tab.
export const HYRA_UI_WORKSPACE_IDS = new Set<string>();

function WorkspacePages() {
  return (
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
        <Route path="documents/:docId" element={<DocumentView />} />
        <Route path="loa" element={<LOA />} />
        <Route path="staff" element={<Staff />} />
        <Route path="roles" element={<Roles />} />
        <Route path="quotas" element={<Quotas />} />
        <Route path="message-logs" element={<MessageLogs />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="join" element={<JoinWorkspace />} />
      </Routes>
    </Suspense>
  );
}

function BargainsWorkspacePages() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="dashboard" element={<BDashboard />} />
        <Route path="sessions"  element={<BSessions />}  />
        <Route path="quotas"    element={<BQuotas />}    />
        <Route path="members"   element={<BMembers />}   />
        <Route path="members/:memberId" element={<BMemberProfile />} />
        <Route path="activity"  element={<BActivity />} />
        <Route path="wall"      element={<BWall />} />
        <Route path="ranks"     element={<Ranks />} />
        <Route path="setup-tracking" element={<SetupTracking />} />
        <Route path="settings"  element={<SettingsPage />} />
        <Route path="documents" element={<BDocuments />} />
        <Route path="documents/:docId" element={<DocumentView />} />
        <Route path="loa"       element={<BLOA />} />
        <Route path="staff"     element={<BStaff />} />
        <Route path="roles"     element={<BRoles />} />
        <Route path="message-logs" element={<MessageLogs />} />
        <Route path="join"      element={<JoinWorkspace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

function WorkspaceRoutes() {
  const { workspaceId } = useParams();
  const { version } = useUIVersion();
  // Forced Hyra (partner subdomains, bargains, etc) always get Nexus pages.
  const forceNexus = !!workspaceId && HYRA_UI_WORKSPACE_IDS.has(workspaceId);
  const useNexus = forceNexus || version === "nexus";
  return (
    <WorkspaceProvider>
      {useNexus ? <BargainsWorkspacePages /> : <WorkspacePages />}
    </WorkspaceProvider>
  );
}


function BargainsWorkspaceRoutes() {
  return (
    <WorkspaceProvider>
      <BargainsWorkspacePages />
    </WorkspaceProvider>
  );
}

// Routes mounted at the root of a partner subdomain — no /w/:id prefix.
// e.g. shoply.fluxcore.works/sessions instead of /w/<uuid>/sessions.
function PartnerCleanRoutes({ workspaceId, useHyra }: { workspaceId: string; useHyra: boolean }) {
  const { version } = useUIVersion();
  const useNexus = useHyra || version === "nexus";
  return (
    <WorkspaceProvider workspaceId={workspaceId}>
      {useNexus ? <BargainsWorkspacePages /> : <WorkspacePages />}
    </WorkspaceProvider>
  );
}


function BargainsWorkspaceGuard({ allowedId }: { allowedId: string }) {
  const { workspaceId } = useParams();
  if (workspaceId !== allowedId) {
    return <Navigate to="/" replace />;
  }
  return <BargainsWorkspaceRoutes />;
}

// On partner subdomains, rewrite legacy /w/:id/<rest> URLs to clean /<rest>.
function LegacyWorkspaceRedirect() {
  const params = useParams();
  const rest = (params["*"] as string) || "dashboard";
  return <Navigate to={`/${rest}`} replace />;
}

function AppRoutes() {
  const hostname = window.location.hostname;
  const subdomain = hostname.split(".")[0].toLowerCase();
  const isMainHost =
    hostname === "fluxcore.works" ||
    hostname.startsWith("www.") ||
    hostname.startsWith("id-preview") ||
    hostname.startsWith("preview--") ||
    hostname === "localhost" ||
    hostname.startsWith("127.0.0.1") ||
    hostname.endsWith(".lovableproject.com") ||
    hostname.endsWith(".lovable.app");
  const isHardcoded =
    hostname.startsWith("almore.") ||
    hostname.startsWith("bargains.") ||
    hostname.includes("bloxy-bargains");

  const [partner, setPartner] = useState<any | undefined>(
    isMainHost || isHardcoded ? null : undefined
  );

  useEffect(() => {
    let active = true;
    // Always preload portals that opt into Hyra UI so workspaces on the main
    // domain (no subdomain) also get the Bargains UI when admins enable it.
    supabase
      .from("partner_portals")
      .select("workspace_id,use_hyra_ui")
      .eq("use_hyra_ui", true)
      .then(({ data }) => {
        if (!active || !data) return;
        for (const row of data) {
          if (row.workspace_id) HYRA_UI_WORKSPACE_IDS.add(row.workspace_id);
        }
      });

    if (isMainHost || isHardcoded) return;
    supabase
      .from("partner_portals")
      .select("*")
      .ilike("subdomain", subdomain)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          if ((data as any).use_hyra_ui) HYRA_UI_WORKSPACE_IDS.add(data.workspace_id);
          setPartner(data);
        } else {
          setPartner(null);
        }
      });
    return () => { active = false; };
  }, [subdomain, isMainHost, isHardcoded]);

  if (partner === undefined) {
    return <PageLoader />;
  }

  if (partner) {
    if (partner.status === "closed") {
      return (
        <Suspense fallback={<PageLoader />}>
          <PartnerClosed
            name={partner.name}
            reason={partner.closed_reason}
            accentColor={partner.accent_color}
            logoUrl={partner.logo_url}
          />
        </Suspense>
      );
    }
    // Auto-created (owner-claimed) portals skip the marketing landing —
    // visiting the subdomain takes you straight into the workspace dashboard.
    if (partner.auto_created) {
      return (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/link-discord" element={<LinkDiscord />} />
            <Route path="/workspaces" element={<Navigate to="/dashboard" replace />} />
            {/* Legacy /w/:id/* links redirect to clean URLs */}
            <Route path="/w/:workspaceId/*" element={<LegacyWorkspaceRedirect />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/*" element={<PartnerCleanRoutes workspaceId={partner.workspace_id} useHyra={!!partner.use_hyra_ui} />} />
          </Routes>
        </Suspense>
      );
    }
    const theme = (partner as any).portal_theme || "classic";
    const themed = theme === "bargains" || theme === "almore" || theme === "shoply";
    const Landing = themed
      ? () => <ThemedPortal theme={theme as any} config={partner} />
      : () => <PartnerPortal config={partner} />;
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PartnerLogin config={partner} />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/link-discord" element={<LinkDiscord />} />
          <Route path="/workspaces" element={<Navigate to="/dashboard" replace />} />
          {/* Legacy /w/:id/* links redirect to clean URLs */}
          <Route path="/w/:workspaceId/*" element={<LegacyWorkspaceRedirect />} />
          <Route path="/*" element={<PartnerCleanRoutes workspaceId={partner.workspace_id} useHyra={!!partner.use_hyra_ui} />} />
        </Routes>
      </Suspense>
    );
  }



  if (hostname.startsWith("almore.fluxcore") || hostname.startsWith("almore.")) {
    const ALMORE_WS = "ec5d2c5f-7d34-4d3a-9a3e-1f8c8b73e5e8"; // placeholder; real id comes from PartnerCleanRoutes only when configured
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Almore />} />
          <Route path="/login" element={<AlmoreLogin />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/link-discord" element={<LinkDiscord />} />
          <Route path="/workspaces" element={<Workspaces />} />
          <Route path="/w/:workspaceId/*" element={<WorkspaceRoutes />} />
          <Route path="*" element={<Almore />} />
        </Routes>
      </Suspense>
    );
  }

  if (hostname.startsWith("bargains.fluxcore")) {
    const BARGAINS_WS = "b4de7ffa-81e6-4d05-8e9d-8ce0a4904630";
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Bargains />} />
          <Route path="/login" element={<BargainsLogin />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/link-discord" element={<LinkDiscord />} />
          <Route path="/workspaces" element={<Navigate to="/dashboard" replace />} />
          {/* Legacy /w/:id/* links redirect to clean URLs */}
          <Route path="/w/:workspaceId/*" element={<LegacyWorkspaceRedirect />} />
          <Route path="/*" element={<PartnerCleanRoutes workspaceId={BARGAINS_WS} useHyra={false} />} />
        </Routes>
      </Suspense>
    );
  }

  if (hostname.startsWith("shoply.fluxcore") || hostname.startsWith("shoply.")) {
    const SHOPLY_WS = "9f2c9234-c02f-492b-8121-74324e0df624";
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Shoply />} />
          <Route path="/login" element={<ShoplyLogin />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/link-discord" element={<LinkDiscord />} />
          <Route path="/workspaces" element={<Navigate to="/dashboard" replace />} />
          {/* Legacy /w/:id/* links redirect to clean URLs */}
          <Route path="/w/:workspaceId/*" element={<LegacyWorkspaceRedirect />} />
          <Route path="/*" element={<PartnerCleanRoutes workspaceId={SHOPLY_WS} useHyra={false} />} />
        </Routes>
      </Suspense>
    );
  }

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


  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/link-discord" element={<LinkDiscord />} />
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/support" element={<Support />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/feedback/:ticketId" element={<FeedbackTicket />} />
        <Route path="/join/:inviteCode" element={<JoinWorkspace />} />
        <Route path="/w/:workspaceId/*" element={<WorkspaceRoutes />} />
        <Route path="/bloxy-bargains" element={<BloxyBargains />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/staff-dashboard" element={<Admin />} />
        <Route path="/api" element={<ApiIndex />} />
        <Route path="/api/sessions" element={<ApiSessions />} />
        <Route path="/api/ranking" element={<ApiRanking />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => {
  // Catch unhandled lazy import failures globally as a second safety net
  useEffect(() => {
    const onErr = (e: ErrorEvent | PromiseRejectionEvent) => {
      const err: any = (e as PromiseRejectionEvent).reason || (e as ErrorEvent).error || (e as ErrorEvent).message;
      const msg = err?.message || String(err || "");
      if (
        /Loading chunk [\w-]+ failed/i.test(msg) ||
        /Failed to fetch dynamically imported module/i.test(msg) ||
        /Importing a module script failed/i.test(msg)
      ) {
        const last = parseInt(sessionStorage.getItem("fluxcore_chunk_reload_at") || "0", 10);
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem("fluxcore_chunk_reload_at", String(Date.now()));
          window.location.reload();
        }
      }
    };
    window.addEventListener("error", onErr as any);
    window.addEventListener("unhandledrejection", onErr as any);
    return () => {
      window.removeEventListener("error", onErr as any);
      window.removeEventListener("unhandledrejection", onErr as any);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <UIVersionProvider>
          <I18nProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <HashRouter>
                <DOMTranslator />
                <LoadWatchdog />
                <ChunkErrorBoundary fallback={<PageLoader />}>
                  <BlacklistGate>
                    <AccountRemovalGate>
                      <AppRoutes />
                    </AccountRemovalGate>
                  </BlacklistGate>
                </ChunkErrorBoundary>
              </HashRouter>
            </TooltipProvider>
          </I18nProvider>
          </UIVersionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
