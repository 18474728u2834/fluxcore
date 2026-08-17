DROP POLICY IF EXISTS "Members can update session roles" ON public.scheduled_sessions;
CREATE POLICY "Members can update session roles"
ON public.scheduled_sessions
FOR UPDATE
USING (
  is_workspace_owner(workspace_id)
  OR has_workspace_permission(workspace_id, 'host_shift')
  OR has_workspace_permission(workspace_id, 'host_training')
  OR has_workspace_permission(workspace_id, 'host_event')
  OR has_workspace_permission(workspace_id, 'manage_members')
  OR has_workspace_permission(workspace_id, 'create_shift')
  OR has_workspace_permission(workspace_id, 'create_training')
  OR has_workspace_permission(workspace_id, 'create_event')
)
WITH CHECK (
  is_workspace_owner(workspace_id)
  OR has_workspace_permission(workspace_id, 'host_shift')
  OR has_workspace_permission(workspace_id, 'host_training')
  OR has_workspace_permission(workspace_id, 'host_event')
  OR has_workspace_permission(workspace_id, 'manage_members')
  OR has_workspace_permission(workspace_id, 'create_shift')
  OR has_workspace_permission(workspace_id, 'create_training')
  OR has_workspace_permission(workspace_id, 'create_event')
);