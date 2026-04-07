
CREATE POLICY "Members can view their workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  public.is_workspace_owner(id) OR public.is_workspace_member(id)
);
