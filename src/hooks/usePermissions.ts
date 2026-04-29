import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "./useWorkspace";

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
  { key: "promote_members", label: "Promote Members", description: "Rank members up in the Roblox group" },
  { key: "demote_members", label: "Demote Members", description: "Rank members down in the Roblox group" },
  { key: "manage_members", label: "Manage Members", description: "Edit roles, warnings, remove members" },
  { key: "view_config", label: "View Config", description: "Access settings & setup tracking" },
  { key: "manage_loa", label: "Manage LOA", description: "Approve/decline leave requests" },
  { key: "manage_documents", label: "Manage Documents", description: "Create and manage policies/handbooks" },
  { key: "view_message_logs", label: "View Message Logs", description: "Read in-game chat messages logged by the workspace" },
] as const;

export type PermissionKey = typeof ALL_PERMISSIONS[number]["key"];

export function usePermissions() {
  const { workspaceId, isOwner } = useWorkspace();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOwner) {
      setPermissions(new Set(ALL_PERMISSIONS.map(p => p.key)));
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get member with role_id
      const { data: member } = await supabase
        .from("workspace_members")
        .select("id, role_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) { setLoading(false); return; }

      const allPerms = new Set<string>();

      // Get role-based permissions
      if (member.role_id) {
        const { data: role } = await supabase
          .from("workspace_roles")
          .select("permissions")
          .eq("id", member.role_id)
          .single();
        if (role && Array.isArray(role.permissions)) {
          (role.permissions as string[]).forEach(p => allPerms.add(p));
        }
      }

      // Also get legacy per-member permissions (for backwards compat)
      const { data: perms } = await supabase
        .from("workspace_permissions")
        .select("permission")
        .eq("workspace_id", workspaceId)
        .eq("member_id", member.id);
      (perms || []).forEach(p => allPerms.add(p.permission));

      setPermissions(allPerms);
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
