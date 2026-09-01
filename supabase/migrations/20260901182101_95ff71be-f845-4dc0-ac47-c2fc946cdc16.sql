-- 1) Lock down SECURITY DEFINER functions -------------------------------------

-- Trigger-only functions: never callable directly
REVOKE ALL ON FUNCTION public.activity_session_wake_portal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_workspace_members_on_verify() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verified_users_block_reserved() FROM PUBLIC, anon, authenticated;

-- Internal / service-role only routines
REVOKE ALL ON FUNCTION public.internal_app_center_grade(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_app_center_list_forms(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_discord_resolve_user(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_discord_workspace_for_guild(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_member_has_permission(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_workspace_by_app_center_key(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_session_duration(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sweep_dormant_portals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.internal_app_center_grade(uuid, uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.internal_app_center_list_forms(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.internal_discord_resolve_user(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.internal_discord_workspace_for_guild(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.internal_member_has_permission(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.internal_workspace_by_app_center_key(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_session_duration(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_dormant_portals() TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;

-- Signed-in only routines: drop anonymous access
REVOKE ALL ON FUNCTION public.get_workspace_secrets(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_workspace_secrets(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_nexus_config(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_nexus_config(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.heartbeat_portal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_app_center_key(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bind_discord_account(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_workspace_with_invite(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_accessible_workspaces() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_accessible_departments() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_workspace_context(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_workspace_integration_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_workspace_owner_info(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_staff_permission(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_grant_to_workspace(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_premium_grant(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_workspace_secrets(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_workspace_secrets(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_nexus_config(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_nexus_config(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_portal(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rotate_app_center_key(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bind_discord_account(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_workspace_with_invite(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_accessible_workspaces() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_accessible_departments() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_workspace_context(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_workspace_integration_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_workspace_owner_info(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_staff_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_grant_to_workspace(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_premium_grant(text) TO authenticated, service_role;

-- 2) Storage: stop public listing, scope policies to explicit roles -----------

DROP POLICY IF EXISTS "Webhook images are public" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can read creations files" ON storage.objects;
CREATE POLICY "Anyone can read creations files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'creations');

DROP POLICY IF EXISTS "Fluxcore staff can update creations files" ON storage.objects;
CREATE POLICY "Fluxcore staff can update creations files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'creations' AND public.is_fluxcore_staff())
  WITH CHECK (bucket_id = 'creations' AND public.is_fluxcore_staff());

DROP POLICY IF EXISTS "Fluxcore staff can delete creations files" ON storage.objects;
CREATE POLICY "Fluxcore staff can delete creations files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'creations' AND public.is_fluxcore_staff());

DROP POLICY IF EXISTS "Workspace owners update webhook images" ON storage.objects;
CREATE POLICY "Workspace owners update webhook images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'webhook-images' AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = auth.uid() AND (storage.foldername(name))[1] = w.id::text))
  WITH CHECK (bucket_id = 'webhook-images' AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = auth.uid() AND (storage.foldername(name))[1] = w.id::text));

DROP POLICY IF EXISTS "Workspace owners delete webhook images" ON storage.objects;
CREATE POLICY "Workspace owners delete webhook images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'webhook-images' AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = auth.uid() AND (storage.foldername(name))[1] = w.id::text));