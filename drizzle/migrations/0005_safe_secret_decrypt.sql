CREATE OR REPLACE FUNCTION private.try_decrypt(_data bytea, _key text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF _data IS NULL THEN RETURN NULL; END IF;
  RETURN extensions.pgp_sym_decrypt(_data, _key);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.internal_get_workspace_secrets(_workspace_id uuid)
RETURNS TABLE(api_key text, roblox_api_key text, discord_webhook_url text, quota_log_webhook_url text, rankgun_api_key text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE k text;
BEGIN
  SELECT private.workspace_secret_key() INTO k;
  RETURN QUERY
  SELECT
    private.try_decrypt(w.api_key_enc, k),
    private.try_decrypt(w.roblox_api_key_enc, k),
    private.try_decrypt(w.discord_webhook_url_enc, k),
    private.try_decrypt(w.quota_log_webhook_url_enc, k),
    private.try_decrypt(w.rankgun_api_key_enc, k)
  FROM public.workspaces w WHERE w.id = _workspace_id;
END $function$;

CREATE OR REPLACE FUNCTION public.get_workspace_secrets(_workspace_id uuid)
RETURNS TABLE(api_key text, roblox_api_key text, discord_webhook_url text, quota_log_webhook_url text, rankgun_api_key text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE k text;
BEGIN
  IF NOT public.is_workspace_owner(_workspace_id) THEN RETURN; END IF;
  SELECT private.workspace_secret_key() INTO k;
  RETURN QUERY
  SELECT
    private.try_decrypt(w.api_key_enc, k),
    private.try_decrypt(w.roblox_api_key_enc, k),
    private.try_decrypt(w.discord_webhook_url_enc, k),
    private.try_decrypt(w.quota_log_webhook_url_enc, k),
    private.try_decrypt(w.rankgun_api_key_enc, k)
  FROM public.workspaces w WHERE w.id = _workspace_id;
END $function$;

REVOKE ALL ON FUNCTION public.internal_get_workspace_secrets(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_get_workspace_secrets(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_workspace_secrets(uuid) TO authenticated, service_role;