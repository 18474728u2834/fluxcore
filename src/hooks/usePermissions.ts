import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "./useWorkspace";

// All available permissions
export const ALL_PERMISSIONS = [
  { key: "view_activity", label: "View Activity", description: "See activity logs and leaderboards" },
  { key: "post_wall", label: "Post on Wall", description: "Create announcements" },
  { key: "delete_wall", label: "Delete Wall Posts", description: "Remove announcements" },
  { key: "host_shift", label: "Host Shifts", description: "Be assigned as host for shifts" },
  { key: "host_training", label: "Host Trainings", description: "Be assigned as host for trainings" },
  { key: "host_event", label: "Host Events", description: "Be assigned as host for events" },
  { key: "create_shift", label: "Create Shifts", description: "Schedule new shifts" },
  { key: "create_training", label: "Create Trainings", description: "Schedule new trainings" },
  { key: "create_event", label: "Create Events", description: "Schedule new events/other" },
  { key: "manage_members", label: "Manage Members", description: "Edit roles, remove members" },
  { key: "view_config", label: "View Config", description: "Access settings & setup tracking" },
] as const;

export type PermissionKey = typeof ALL_PERMISSIONS[number]["key"];

export function usePermissions() {
  const { workspaceId, isOwner } = useWorkspace();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOwner) {
      // Owners have all permissions
      setPermissions(new Set(ALL_PERMISSIONS.map(p => p.key)));
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get member id first
      const { data: member } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) { setLoading(false); return; }

      const { data: perms } = await supabase
        .from("workspace_permissions")
        .select("permission")
        .eq("workspace_id", workspaceId)
        .eq("member_id", member.id);

      setPermissions(new Set((perms || []).map(p => p.permission)));
      setLoading(false);
    };

    fetchPermissions();
  }, [workspaceId, isOwner]);

  const hasPermission = (perm: PermissionKey) => isOwner || permissions.has(perm);

  const canCreateSession = (category: string) => {
    if (isOwner) return true;
    const map: Record<string, string> = { Shift: "create_shift", Training: "create_training", Event: "create_event" };
    return permissions.has(map[category] || "create_event");
  };

  const canHostSession = (category: string) => {
    if (isOwner) return true;
    const map: Record<string, string> = { Shift: "host_shift", Training: "host_training", Event: "host_event" };
    return permissions.has(map[category] || "host_event");
  };

  return { permissions, loading, hasPermission, canCreateSession, canHostSession, isOwner };
}
