DROP POLICY IF EXISTS "Owners can delete logs" ON public.member_logs;
CREATE POLICY "Owners and permitted can delete logs"
  ON public.member_logs FOR DELETE
  USING (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'manage_members')
  );