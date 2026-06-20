
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS api_key_hash text,
  ADD COLUMN IF NOT EXISTS rankgun_api_key_enc bytea;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_api_key_hash_uniq
  ON public.workspaces(api_key_hash) WHERE api_key_hash IS NOT NULL;

DO $$
DECLARE k text;
BEGIN
  SELECT key INTO k FROM private.app_keys WHERE name = 'workspace_secrets';
  UPDATE public.workspaces
     SET api_key_hash = encode(extensions.digest(pgp_sym_decrypt(api_key_enc, k)::bytea, 'sha256'::text), 'hex')
   WHERE api_key_enc IS NOT NULL AND api_key_hash IS NULL;
END $$;

DROP FUNCTION IF EXISTS public.get_workspace_secrets(uuid);
DROP FUNCTION IF EXISTS public.get_workspace_integration_status(uuid);

CREATE FUNCTION public.internal_get_workspace_secrets(_workspace_id uuid)
RETURNS TABLE(api_key text, roblox_api_key text, discord_webhook_url text, quota_log_webhook_url text, rankgun_api_key text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE k text;
BEGIN
  SELECT private.workspace_secret_key() INTO k;
  RETURN QUERY
  SELECT
    CASE WHEN w.api_key_enc IS NOT NULL THEN pgp_sym_decrypt(w.api_key_enc, k) END,
    CASE WHEN w.roblox_api_key_enc IS NOT NULL THEN pgp_sym_decrypt(w.roblox_api_key_enc, k) END,
    CASE WHEN w.discord_webhook_url_enc IS NOT NULL THEN pgp_sym_decrypt(w.discord_webhook_url_enc, k) END,
    CASE WHEN w.quota_log_webhook_url_enc IS NOT NULL THEN pgp_sym_decrypt(w.quota_log_webhook_url_enc, k) END,
    CASE WHEN w.rankgun_api_key_enc IS NOT NULL THEN pgp_sym_decrypt(w.rankgun_api_key_enc, k) END
  FROM public.workspaces w WHERE w.id = _workspace_id;
END $$;
REVOKE ALL ON FUNCTION public.internal_get_workspace_secrets(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_get_workspace_secrets(uuid) TO service_role;

CREATE FUNCTION public.internal_workspace_id_by_api_key(_api_key text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.workspaces
   WHERE api_key_hash = encode(extensions.digest(_api_key::bytea, 'sha256'::text), 'hex')
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.internal_workspace_id_by_api_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_workspace_id_by_api_key(text) TO service_role;

CREATE FUNCTION public.get_workspace_secrets(_workspace_id uuid)
RETURNS TABLE(api_key text, roblox_api_key text, discord_webhook_url text, quota_log_webhook_url text, rankgun_api_key text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE k text;
BEGIN
  IF NOT public.is_workspace_owner(_workspace_id) THEN RETURN; END IF;
  SELECT private.workspace_secret_key() INTO k;
  RETURN QUERY
  SELECT
    CASE WHEN w.api_key_enc IS NOT NULL THEN pgp_sym_decrypt(w.api_key_enc, k) END,
    CASE WHEN w.roblox_api_key_enc IS NOT NULL THEN pgp_sym_decrypt(w.roblox_api_key_enc, k) END,
    CASE WHEN w.discord_webhook_url_enc IS NOT NULL THEN pgp_sym_decrypt(w.discord_webhook_url_enc, k) END,
    CASE WHEN w.quota_log_webhook_url_enc IS NOT NULL THEN pgp_sym_decrypt(w.quota_log_webhook_url_enc, k) END,
    CASE WHEN w.rankgun_api_key_enc IS NOT NULL THEN pgp_sym_decrypt(w.rankgun_api_key_enc, k) END
  FROM public.workspaces w WHERE w.id = _workspace_id;
END $$;
GRANT EXECUTE ON FUNCTION public.get_workspace_secrets(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_workspace_secrets(_workspace_id uuid, _values jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE k text; v text;
BEGIN
  IF NOT public.is_workspace_owner(_workspace_id) THEN RAISE EXCEPTION 'not_owner'; END IF;
  SELECT private.workspace_secret_key() INTO k;

  IF _values ? 'api_key' THEN
    v := _values ->> 'api_key';
    UPDATE public.workspaces SET
      api_key_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE pgp_sym_encrypt(v, k) END,
      api_key_hash = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE encode(extensions.digest(v::bytea, 'sha256'::text), 'hex') END
    WHERE id = _workspace_id;
  END IF;
  IF _values ? 'roblox_api_key' THEN
    v := _values ->> 'roblox_api_key';
    UPDATE public.workspaces SET roblox_api_key_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE pgp_sym_encrypt(v, k) END WHERE id = _workspace_id;
  END IF;
  IF _values ? 'discord_webhook_url' THEN
    v := _values ->> 'discord_webhook_url';
    UPDATE public.workspaces SET discord_webhook_url_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE pgp_sym_encrypt(v, k) END WHERE id = _workspace_id;
  END IF;
  IF _values ? 'quota_log_webhook_url' THEN
    v := _values ->> 'quota_log_webhook_url';
    UPDATE public.workspaces SET quota_log_webhook_url_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE pgp_sym_encrypt(v, k) END WHERE id = _workspace_id;
  END IF;
  IF _values ? 'rankgun_api_key' THEN
    v := _values ->> 'rankgun_api_key';
    UPDATE public.workspaces SET rankgun_api_key_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE pgp_sym_encrypt(v, k) END WHERE id = _workspace_id;
  END IF;
END $$;

CREATE FUNCTION public.get_workspace_integration_status(_workspace_id uuid)
RETURNS TABLE(has_discord_webhook boolean, has_roblox_api_key boolean, has_rankgun_api_key boolean, quota_log_mode text, quota_log_configured boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (w.discord_webhook_url_enc IS NOT NULL),
    (w.roblox_api_key_enc IS NOT NULL),
    (w.rankgun_api_key_enc IS NOT NULL),
    w.quota_log_mode,
    w.quota_log_configured
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND (public.is_workspace_owner(_workspace_id) OR public.is_workspace_member(_workspace_id));
$$;
GRANT EXECUTE ON FUNCTION public.get_workspace_integration_status(uuid) TO authenticated, anon;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
