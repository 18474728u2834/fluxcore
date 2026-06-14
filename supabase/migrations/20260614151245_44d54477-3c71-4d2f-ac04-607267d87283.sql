
-- 1) Column-level restrictions on workspaces (hide sensitive credentials)
REVOKE SELECT ON public.workspaces FROM anon, authenticated;
GRANT SELECT (
  id, name, owner_id, roblox_group_id, gamepass_id, created_at, updated_at,
  invite_code, primary_color, text_color, background_color, show_grid,
  release_version, message_logger_enabled, auto_rank_enabled, verified_official,
  premium, premium_until, tutorial_completed, game_url, session_role_labels,
  afk_confirm_seconds, leaderboard_categories, subdomain_grace_until,
  closed_at, closed_reason, quota_log_mode, quota_log_configured, nexus_hero_image_url
) ON public.workspaces TO authenticated;
-- Writes still gated by existing RLS policies
GRANT INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;

-- 2) Column-level restrictions on workspace_members (hide access_key)
REVOKE SELECT ON public.workspace_members FROM anon, authenticated;
GRANT SELECT (
  id, workspace_id, user_id, roblox_user_id, roblox_username, role, verified,
  joined_at, updated_at, role_id, roblox_group_rank, birthday_month, birthday_day
) ON public.workspace_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;

-- 3) Owner-only RPC to fetch workspace secrets
CREATE OR REPLACE FUNCTION public.get_workspace_secrets(_workspace_id uuid)
RETURNS TABLE(api_key text, roblox_api_key text, discord_webhook_url text, quota_log_webhook_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.api_key, w.roblox_api_key, w.discord_webhook_url, w.quota_log_webhook_url
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND public.is_workspace_owner(_workspace_id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_workspace_secrets(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_secrets(uuid) TO authenticated;

-- 4) RPC that exposes integration *presence* (boolean) without leaking values
CREATE OR REPLACE FUNCTION public.get_workspace_integration_status(_workspace_id uuid)
RETURNS TABLE(has_discord_webhook boolean, has_roblox_api_key boolean, quota_log_mode text, quota_log_configured boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (w.discord_webhook_url IS NOT NULL AND w.discord_webhook_url <> '') AS has_discord_webhook,
    (w.roblox_api_key IS NOT NULL AND w.roblox_api_key <> '') AS has_roblox_api_key,
    w.quota_log_mode,
    w.quota_log_configured
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND (public.is_workspace_owner(_workspace_id) OR public.is_workspace_member(_workspace_id));
$$;
REVOKE EXECUTE ON FUNCTION public.get_workspace_integration_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_integration_status(uuid) TO authenticated;

-- 5) Fix mutable search_path on the pgmq wrapper functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  RETURN new_id;
END;
$function$;

-- 6) Lock down pgmq wrappers to service_role only (only used by cron edge functions)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- 7) Explicit deny-all policies on internal tables (silences "RLS enabled, no policy")
DROP POLICY IF EXISTS "deny_all_clients" ON public.discord_pending_links;
CREATE POLICY "deny_all_clients" ON public.discord_pending_links
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_clients" ON public.session_notifications;
CREATE POLICY "deny_all_clients" ON public.session_notifications
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 8) Restrict the public webhook-images bucket so files can be fetched by URL
--    but the bucket cannot be enumerated/listed.
DROP POLICY IF EXISTS "Public can view webhook images" ON storage.objects;
DROP POLICY IF EXISTS "webhook_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "webhook_images_no_list" ON storage.objects;
-- (We keep the bucket public=true so signed/public URLs still work; we just
--  remove any broad SELECT policy that would allow listing.)
