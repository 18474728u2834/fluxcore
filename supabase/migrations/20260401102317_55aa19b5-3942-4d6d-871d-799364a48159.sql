
-- Create a function to check if a member has a specific permission
CREATE OR REPLACE FUNCTION public.has_workspace_permission(_workspace_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_permissions wp
    JOIN public.workspace_members wm ON wm.id = wp.member_id
    WHERE wm.workspace_id = _workspace_id
      AND wm.user_id = auth.uid()
      AND wp.permission = _permission
  );
$$;

-- Allow members with post_wall to insert announcements
CREATE POLICY "Members with permission can post" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_owner(workspace_id) OR public.has_workspace_permission(workspace_id, 'post_wall')
  );

-- Allow members with delete_wall to delete announcements
CREATE POLICY "Members with permission can delete posts" ON public.announcements FOR DELETE TO authenticated
  USING (
    public.is_workspace_owner(workspace_id) OR public.has_workspace_permission(workspace_id, 'delete_wall')
  );

-- Allow members with create permissions to insert sessions
CREATE POLICY "Members with permission can create sessions" ON public.scheduled_sessions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'create_shift')
    OR public.has_workspace_permission(workspace_id, 'create_training')
    OR public.has_workspace_permission(workspace_id, 'create_event')
  );

-- Allow owners to delete sessions
CREATE POLICY "Owners can delete sessions" ON public.scheduled_sessions FOR DELETE TO authenticated
  USING (public.is_workspace_owner(workspace_id));
