
CREATE POLICY "Perm holders manage roles"
ON public.workspace_roles
FOR ALL
TO authenticated
USING (public.has_workspace_permission(workspace_id, 'edit_roles'))
WITH CHECK (public.has_workspace_permission(workspace_id, 'edit_roles'));

CREATE POLICY "Perm holders manage quotas"
ON public.workspace_quotas
FOR ALL
TO authenticated
USING (public.has_workspace_permission(workspace_id, 'manage_members'))
WITH CHECK (public.has_workspace_permission(workspace_id, 'manage_members'));
