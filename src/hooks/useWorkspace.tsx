import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface WorkspaceData {
  id: string;
  name: string;
  owner_id: string;
  api_key: string;
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
}

interface WorkspaceContextType {
  workspaceId: string;
  workspace: WorkspaceData | null;
  isOwner: boolean;
  loading: boolean;
  memberRole: string | null;
  refreshWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!workspaceId) { navigate("/workspaces"); return; }

    let cancelled = false;
    const fetchWorkspace = async () => {
      setLoading(true);

      const { data: wsRows, error } = await supabase
        .rpc("get_workspace_context", { _workspace_id: workspaceId });

      if (cancelled) return;
      const wsData: any = wsRows?.[0];

      if (!wsData || error) {
        setLoading(false);
        navigate("/workspaces");
        return;
      }

      const isPremiumActive = !!wsData.premium && (!wsData.premium_until || new Date(wsData.premium_until) > new Date());

      setWorkspace({
        id: wsData.id,
        name: wsData.name,
        owner_id: wsData.owner_id,
        api_key: "",
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
      });
      const ownerCheck = wsData.owner_id === user.id;
      setIsOwner(ownerCheck);

      if (!ownerCheck) {
        const { data: member } = await supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", workspaceId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (!member) {
          setLoading(false);
          navigate("/workspaces");
          return;
        }
        setMemberRole(member.role);
      } else {
        setMemberRole("Owner");
      }

      setLoading(false);
    };

    fetchWorkspace();
    return () => { cancelled = true; };
  }, [workspaceId, user, authLoading]);

  const refreshWorkspace = async () => {
    if (!workspaceId) return;
    const { data: wsRows } = await supabase.rpc("get_workspace_context", { _workspace_id: workspaceId });
    const wsData: any = wsRows?.[0];
    if (!wsData) return;
    const isPremiumActive = !!wsData.premium && (!wsData.premium_until || new Date(wsData.premium_until) > new Date());
    setWorkspace((prev) => prev ? {
      ...prev,
      premium: isPremiumActive,
      premium_until: wsData.premium_until ?? null,
      tutorial_completed: !!wsData.tutorial_completed,
      verified_official: !!wsData.verified_official,
    } : prev);
  };

  return (
    <WorkspaceContext.Provider value={{ workspaceId: workspaceId || "", workspace, isOwner, loading, memberRole, refreshWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
