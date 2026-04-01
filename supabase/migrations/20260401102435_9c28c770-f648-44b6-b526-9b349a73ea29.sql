
-- Allow members with host permissions to update sessions (for self-assigning roles)
CREATE POLICY "Members can update session roles" ON public.scheduled_sessions FOR UPDATE TO authenticated
  USING (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'host_shift')
    OR public.has_workspace_permission(workspace_id, 'host_training')
    OR public.has_workspace_permission(workspace_id, 'host_event')
    OR public.has_workspace_permission(workspace_id, 'manage_members')
  )
  WITH CHECK (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'host_shift')
    OR public.has_workspace_permission(workspace_id, 'host_training')
    OR public.has_workspace_permission(workspace_id, 'host_event')
    OR public.has_workspace_permission(workspace_id, 'manage_members')
  );
