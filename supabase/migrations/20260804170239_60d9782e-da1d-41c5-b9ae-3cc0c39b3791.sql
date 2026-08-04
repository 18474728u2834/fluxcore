-- Workspace members: let holders of the workspace "manage_members" permission add/update/remove members
CREATE POLICY "Member managers can add members"
ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK (public.has_workspace_permission(workspace_id, 'manage_members'));

CREATE POLICY "Member managers can update members"
ON public.workspace_members FOR UPDATE TO authenticated
USING (public.has_workspace_permission(workspace_id, 'manage_members'))
WITH CHECK (public.has_workspace_permission(workspace_id, 'manage_members'));

CREATE POLICY "Member managers can remove members"
ON public.workspace_members FOR DELETE TO authenticated
USING (public.has_workspace_permission(workspace_id, 'manage_members'));

-- LOA: make the "manage_loa" permission functional
CREATE POLICY "LOA managers can review requests"
ON public.loa_requests FOR UPDATE TO authenticated
USING (public.has_workspace_permission(workspace_id, 'manage_loa'))
WITH CHECK (public.has_workspace_permission(workspace_id, 'manage_loa'));

-- Documents: make the "manage_documents" permission functional
CREATE POLICY "Document managers manage documents"
ON public.workspace_documents FOR ALL TO authenticated
USING (public.has_workspace_permission(workspace_id, 'manage_documents'))
WITH CHECK (public.has_workspace_permission(workspace_id, 'manage_documents'));