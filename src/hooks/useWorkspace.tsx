import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface WorkspaceData {
  id: string;
  name: string;
  owner_id: string;
  roblox_group_id: string | null;
  gamepass_id: string | null;
  primary_color: string | null;
  text_color: string | null;
  background_color: string | null;
  show_grid: boolean | null;
  verified_official: boolean;
  premium: boolean;
  premium_until: string | null;
  tutorial_completed: boolean;
  nexus_hero_image_url: string | null;
}

interface WorkspaceContextType {
  workspaceId: string;
  workspace: WorkspaceData | null;
  isOwner: boolean;
  loading: boolean;
  error: string | null;
  memberRole: string | null;
  refreshWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);
const WORKSPACE_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = WORKSPACE_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function WorkspaceProvider({ children, workspaceId: workspaceIdOverride }: { children: ReactNode; workspaceId?: string }) {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = workspaceIdOverride ?? params.workspaceId;
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!workspaceId) { navigate("/workspaces"); return; }

    let cancelled = false;
    const fetchWorkspace = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: wsRows, error } = await withTimeout(
          supabase.rpc("get_workspace_context", { _workspace_id: workspaceId }),
          "Workspace context",
        );

        if (cancelled) return;
        const wsData: any = wsRows?.[0];

        if (!wsData || error) {
          setLoading(false);
          const isPartnerHost = window.location.hostname.endsWith(".fluxcore.works")
            && window.location.hostname !== "fluxcore.works"
            && !window.location.hostname.startsWith("www.");
          navigate(isPartnerHost ? "/login" : "/workspaces", { replace: true });
          return;
        }

        const isPremiumActive = true;

        setWorkspace({
          id: wsData.id,
          name: wsData.name,
          owner_id: wsData.owner_id,
          roblox_group_id: wsData.roblox_group_id,
          gamepass_id: wsData.gamepass_id,
          primary_color: wsData.primary_color,
          text_color: wsData.text_color,
          background_color: wsData.background_color,
          show_grid: wsData.show_grid,
          verified_official: !!wsData.verified_official,
          premium: isPremiumActive,
          premium_until: wsData.premium_until ?? null,
          tutorial_completed: !!wsData.tutorial_completed,
          nexus_hero_image_url: wsData.nexus_hero_image_url ?? null,
        });

        const ownerCheck = wsData.owner_id === user.id;
        setIsOwner(ownerCheck);

        if (!ownerCheck) {
          const { data: member } = await withTimeout(
            supabase
              .from("workspace_members")
              .select("role")
              .eq("workspace_id", workspaceId)
              .eq("user_id", user.id)
              .maybeSingle(),
            "Workspace membership",
          );

          if (cancelled) return;
          if (!member) {
            setLoading(false);
            navigate(workspaceIdOverride ? "/login" : "/workspaces", { replace: true });
            return;
          }
          setMemberRole(member.role);
        } else {
          setMemberRole("Owner");
        }

        setLoading(false);

        supabase.rpc("heartbeat_portal", { _workspace_id: workspaceId }).then(() => {}, () => {});

        if (ownerCheck && !workspaceIdOverride) {
          const host = window.location.hostname;
          const isMain = host === "fluxcore.works" || host === "www.fluxcore.works";
          if (isMain) {
            const { data: portal } = await withTimeout(
              supabase
                .from("partner_portals")
                .select("subdomain,status")
                .eq("workspace_id", workspaceId)
                .maybeSingle(),
              "Workspace portal",
              6_000,
            );
            const sub = (portal as any)?.subdomain;
            const isClosed = (portal as any)?.status === "closed";
            if (!sub && !window.location.pathname.endsWith("/settings")) {
              navigate(`/w/${workspaceId}/settings?claim=1`);
              return;
            }
            if (sub && !isClosed && host !== `${sub}.fluxcore.works`) {
              window.location.href = `https://${sub}.fluxcore.works/#/w/${workspaceId}/dashboard`;
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Workspace load failed:", err);
        setError("Couldn't load this workspace. Check your connection and try again.");
        setLoading(false);
      }
    };

    fetchWorkspace();
    return () => { cancelled = true; };
  }, [workspaceId, user?.id, authLoading, navigate, workspaceIdOverride]);

  const refreshWorkspace = async () => {
    if (!workspaceId) return;
    const { data: wsRows } = await withTimeout(
      supabase.rpc("get_workspace_context", { _workspace_id: workspaceId }),
      "Workspace refresh",
    );
    const wsData: any = wsRows?.[0];
    if (!wsData) return;
    const isPremiumActive = true;
    setWorkspace((prev) => prev ? {
      ...prev,
      premium: isPremiumActive,
      premium_until: wsData.premium_until ?? null,
      tutorial_completed: !!wsData.tutorial_completed,
      verified_official: !!wsData.verified_official,
    } : prev);
  };

  return (
    <WorkspaceContext.Provider value={{ workspaceId: workspaceId || "", workspace, isOwner, loading, error, memberRole, refreshWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
