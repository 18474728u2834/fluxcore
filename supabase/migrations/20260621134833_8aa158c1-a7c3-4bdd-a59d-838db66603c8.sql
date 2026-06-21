
CREATE OR REPLACE FUNCTION public.set_workspace_secrets(_workspace_id uuid, _values jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE k text; v text;
BEGIN
  IF NOT public.is_workspace_owner(_workspace_id) THEN RAISE EXCEPTION 'not_owner'; END IF;
  SELECT private.workspace_secret_key() INTO k;

  IF _values ? 'api_key' THEN
    v := _values ->> 'api_key';
    UPDATE public.workspaces SET
      api_key_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE extensions.pgp_sym_encrypt(v, k) END,
      api_key_hash = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE encode(extensions.digest(v::bytea, 'sha256'::text), 'hex') END
    WHERE id = _workspace_id;
  END IF;
  IF _values ? 'roblox_api_key' THEN
    v := _values ->> 'roblox_api_key';
    UPDATE public.workspaces SET roblox_api_key_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE extensions.pgp_sym_encrypt(v, k) END WHERE id = _workspace_id;
  END IF;
  IF _values ? 'discord_webhook_url' THEN
    v := _values ->> 'discord_webhook_url';
    UPDATE public.workspaces SET discord_webhook_url_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE extensions.pgp_sym_encrypt(v, k) END WHERE id = _workspace_id;
  END IF;
  IF _values ? 'quota_log_webhook_url' THEN
    v := _values ->> 'quota_log_webhook_url';
    UPDATE public.workspaces SET quota_log_webhook_url_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE extensions.pgp_sym_encrypt(v, k) END WHERE id = _workspace_id;
  END IF;
  IF _values ? 'rankgun_api_key' THEN
    v := _values ->> 'rankgun_api_key';
    UPDATE public.workspaces SET rankgun_api_key_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE extensions.pgp_sym_encrypt(v, k) END WHERE id = _workspace_id;
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.get_workspace_secrets(_workspace_id uuid)
 RETURNS TABLE(api_key text, roblox_api_key text, discord_webhook_url text, quota_log_webhook_url text, rankgun_api_key text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE k text;
BEGIN
  IF NOT public.is_workspace_owner(_workspace_id) THEN RETURN; END IF;
  SELECT private.workspace_secret_key() INTO k;
  RETURN QUERY
  SELECT
    CASE WHEN w.api_key_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(w.api_key_enc, k) END,
    CASE WHEN w.roblox_api_key_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(w.roblox_api_key_enc, k) END,
    CASE WHEN w.discord_webhook_url_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(w.discord_webhook_url_enc, k) END,
    CASE WHEN w.quota_log_webhook_url_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(w.quota_log_webhook_url_enc, k) END,
    CASE WHEN w.rankgun_api_key_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(w.rankgun_api_key_enc, k) END
  FROM public.workspaces w WHERE w.id = _workspace_id;
END $function$;

CREATE OR REPLACE FUNCTION public.internal_get_workspace_secrets(_workspace_id uuid)
 RETURNS TABLE(api_key text, roblox_api_key text, discord_webhook_url text, quota_log_webhook_url text, rankgun_api_key text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE k text;
BEGIN
  SELECT private.workspace_secret_key() INTO k;
  RETURN QUERY
  SELECT
    CASE WHEN w.api_key_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(w.api_key_enc, k) END,
    CASE WHEN w.roblox_api_key_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(w.roblox_api_key_enc, k) END,
    CASE WHEN w.discord_webhook_url_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(w.discord_webhook_url_enc, k) END,
    CASE WHEN w.quota_log_webhook_url_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(w.quota_log_webhook_url_enc, k) END,
    CASE WHEN w.rankgun_api_key_enc IS NOT NULL THEN extensions.pgp_sym_decrypt(w.rankgun_api_key_enc, k) END
  FROM public.workspaces w WHERE w.id = _workspace_id;
END $function$;
