-- 1. Hide per-member access_key from clients (column-level grants)
REVOKE SELECT, UPDATE ON public.workspace_members FROM anon, authenticated;
GRANT SELECT (id, workspace_id, user_id, roblox_user_id, roblox_username, role, verified, joined_at, updated_at, role_id, roblox_group_rank, birthday_month, birthday_day, discord_user_id) ON public.workspace_members TO anon, authenticated;
GRANT UPDATE (roblox_username, role, verified, role_id, roblox_group_rank, birthday_month, birthday_day, discord_user_id, user_id, updated_at) ON public.workspace_members TO authenticated;

-- 2. Scope public site_settings reads to known public keys
DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings
FOR SELECT TO anon, authenticated
USING (key IN ('landing_theme', 'site_design', 'release_version', 'release_notes', 'ui_version', 'banner'));

-- 3. Storage policies: restrict to signed-in users only
DROP POLICY IF EXISTS "Fluxcore staff can delete creations files" ON storage.objects;
DROP POLICY IF EXISTS "Fluxcore staff can update creations files" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owners delete webhook images" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owners update webhook images" ON storage.objects;

CREATE POLICY "Fluxcore staff can update creations files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'creations' AND auth.uid() IS NOT NULL AND public.is_fluxcore_staff());
CREATE POLICY "Fluxcore staff can delete creations files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'creations' AND auth.uid() IS NOT NULL AND public.is_fluxcore_staff());
CREATE POLICY "Workspace owners update webhook images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'webhook-images' AND auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.owner_id = auth.uid() AND (storage.foldername(name))[1] = w.id::text));
CREATE POLICY "Workspace owners delete webhook images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'webhook-images' AND auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.owner_id = auth.uid() AND (storage.foldername(name))[1] = w.id::text));

-- 4. Remove anonymous/PUBLIC execute on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.can_manage_department(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_see_department_row(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.department_workspace_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_workspace_permission(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_department_lead(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_department_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_owner_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_fluxcore_staff() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_form(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_workspace_by_invite(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_application(uuid, text, text, jsonb) FROM PUBLIC;

-- 5. Signed-in users must not execute privileged/internal definer functions directly
REVOKE EXECUTE ON FUNCTION public.bootstrap_service_role_key(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_invoke_edge(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sweep_dormant_portals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_session_duration(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.internal_get_workspace_secrets(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.internal_workspace_id_by_api_key(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.internal_workspace_by_app_center_key(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.internal_member_has_permission(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.internal_discord_resolve_user(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.internal_discord_workspace_for_guild(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.internal_app_center_grade(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.internal_app_center_gamepass_skip(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.internal_app_center_list_forms(uuid) FROM PUBLIC, anon, authenticated;