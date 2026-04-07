import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface WorkspaceContextType {
  workspaceId: string;
  workspace: { id: string; name: string; owner_id: string; api_key: string; roblox_group_id: string | null; gamepass_id: string | null } | null;
  isOwner: boolean;
  loading: boolean;
  memberRole: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<WorkspaceContextType["workspace"]>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!workspaceId) { navigate("/workspaces"); return; }

    const fetchWorkspace = async () => {
      setLoading(true);

      // Use security-definer function so both owners and members can access
      const { data: wsRows, error } = await supabase
        .rpc("get_workspace_context", { _workspace_id: workspaceId });

      const wsData = wsRows?.[0];

      if (!wsData || error) {
        navigate("/workspaces");
        return;
      }

      setWorkspace({
        id: wsData.id,
        name: wsData.name,
        owner_id: wsData.owner_id,
        api_key: "", // hidden from non-owners
        roblox_group_id: wsData.roblox_group_id,
        gamepass_id: wsData.gamepass_id,
      });
      const ownerCheck = wsData.owner_id === user.id;
      setIsOwner(ownerCheck);

      if (!ownerCheck) {
        // Check membership
        const { data: member } = await supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", workspaceId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!member) {
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
  }, [workspaceId, user, authLoading]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId: workspaceId || "", workspace, isOwner, loading, memberRole }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
