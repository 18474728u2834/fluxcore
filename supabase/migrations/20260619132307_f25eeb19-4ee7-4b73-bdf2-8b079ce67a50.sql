
-- Defense-in-depth: encrypt sensitive workspace secrets at the column level
-- using pgcrypto. Plaintext columns are removed; values are only accessible
-- via SECURITY DEFINER functions that check workspace ownership.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Private schema for the symmetric key. No roles get access; only
-- SECURITY DEFINER functions (owned by postgres) can read it.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.app_keys (
  name text PRIMARY KEY,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.app_keys FROM PUBLIC, anon, authenticated, service_role;

-- Seed a random key once. If you ever need to rotate, do it via a separate
-- migration that re-encrypts every row with the new key.
INSERT INTO private.app_keys (name, key)
SELECT 'workspace_secrets', encode(gen_random_bytes(32), 'base64')
WHERE NOT EXISTS (SELECT 1 FROM private.app_keys WHERE name = 'workspace_secrets');

CREATE OR REPLACE FUNCTION private.workspace_secret_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private
AS $$
  SELECT key FROM private.app_keys WHERE name = 'workspace_secrets';
$$;
REVOKE ALL ON FUNCTION private.workspace_secret_key() FROM PUBLIC, anon, authenticated, service_role;

-- Add encrypted columns
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS api_key_enc bytea,
  ADD COLUMN IF NOT EXISTS roblox_api_key_enc bytea,
  ADD COLUMN IF NOT EXISTS discord_webhook_url_enc bytea,
  ADD COLUMN IF NOT EXISTS quota_log_webhook_url_enc bytea;

-- Migrate existing plaintext values
DO $$
DECLARE k text;
BEGIN
  SELECT key INTO k FROM private.app_keys WHERE name = 'workspace_secrets';
  UPDATE public.workspaces SET
    api_key_enc = CASE WHEN api_key IS NOT NULL AND api_key <> '' THEN pgp_sym_encrypt(api_key, k) ELSE NULL END,
    roblox_api_key_enc = CASE WHEN roblox_api_key IS NOT NULL AND roblox_api_key <> '' THEN pgp_sym_encrypt(roblox_api_key, k) ELSE NULL END,
    discord_webhook_url_enc = CASE WHEN discord_webhook_url IS NOT NULL AND discord_webhook_url <> '' THEN pgp_sym_encrypt(discord_webhook_url, k) ELSE NULL END,
    quota_log_webhook_url_enc = CASE WHEN quota_log_webhook_url IS NOT NULL AND quota_log_webhook_url <> '' THEN pgp_sym_encrypt(quota_log_webhook_url, k) ELSE NULL END
  WHERE api_key IS NOT NULL OR roblox_api_key IS NOT NULL OR discord_webhook_url IS NOT NULL OR quota_log_webhook_url IS NOT NULL;
END $$;

-- Drop plaintext columns
ALTER TABLE public.workspaces
  DROP COLUMN IF EXISTS api_key,
  DROP COLUMN IF EXISTS roblox_api_key,
  DROP COLUMN IF EXISTS discord_webhook_url,
  DROP COLUMN IF EXISTS quota_log_webhook_url;

-- Reader: owners only, returns decrypted plaintext
CREATE OR REPLACE FUNCTION public.get_workspace_secrets(_workspace_id uuid)
RETURNS TABLE(api_key text, roblox_api_key text, discord_webhook_url text, quota_log_webhook_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE k text;
BEGIN
  IF NOT public.is_workspace_owner(_workspace_id) THEN
    RETURN;
  END IF;
  SELECT private.workspace_secret_key() INTO k;
  RETURN QUERY
  SELECT
    CASE WHEN w.api_key_enc IS NOT NULL THEN pgp_sym_decrypt(w.api_key_enc, k) END,
    CASE WHEN w.roblox_api_key_enc IS NOT NULL THEN pgp_sym_decrypt(w.roblox_api_key_enc, k) END,
    CASE WHEN w.discord_webhook_url_enc IS NOT NULL THEN pgp_sym_decrypt(w.discord_webhook_url_enc, k) END,
    CASE WHEN w.quota_log_webhook_url_enc IS NOT NULL THEN pgp_sym_decrypt(w.quota_log_webhook_url_enc, k) END
  FROM public.workspaces w WHERE w.id = _workspace_id;
END $$;

-- Integration status (no decrypt; just existence)
CREATE OR REPLACE FUNCTION public.get_workspace_integration_status(_workspace_id uuid)
RETURNS TABLE(has_discord_webhook boolean, has_roblox_api_key boolean, quota_log_mode text, quota_log_configured boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (w.discord_webhook_url_enc IS NOT NULL) AS has_discord_webhook,
    (w.roblox_api_key_enc IS NOT NULL) AS has_roblox_api_key,
    w.quota_log_mode,
    w.quota_log_configured
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND (public.is_workspace_owner(_workspace_id) OR public.is_workspace_member(_workspace_id));
$$;

-- Context helper no longer exposes discord_webhook_url (it was unused by callers
-- and would leak the plaintext). Keep the same column list minus that field.
CREATE OR REPLACE FUNCTION public.get_workspace_context(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, owner_id uuid, roblox_group_id text, gamepass_id text, primary_color text, text_color text, background_color text, show_grid boolean, verified_official boolean, premium boolean, premium_until timestamptz, tutorial_completed boolean, discord_webhook_url text, game_url text, session_role_labels jsonb, nexus_hero_image_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.name, w.owner_id, w.roblox_group_id, w.gamepass_id, w.primary_color, w.text_color, w.background_color, w.show_grid, w.verified_official, w.premium, w.premium_until, w.tutorial_completed,
    NULL::text AS discord_webhook_url,
    w.game_url, w.session_role_labels, w.nexus_hero_image_url
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND (public.is_workspace_owner(w.id) OR public.is_workspace_member(w.id));
$$;

-- Writer: owners only. jsonb payload; keys present are updated.
-- Use JSON null to clear a field. Omit a key to leave it unchanged.
CREATE OR REPLACE FUNCTION public.set_workspace_secrets(_workspace_id uuid, _values jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
  v text;
BEGIN
  IF NOT public.is_workspace_owner(_workspace_id) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  SELECT private.workspace_secret_key() INTO k;

  IF _values ? 'api_key' THEN
    v := _values ->> 'api_key';
    UPDATE public.workspaces SET api_key_enc = CASE WHEN v IS NULL OR v = '' THEN NULL ELSE pgp_sym_encrypt(v, k) END WHERE id = _workspace_id;
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
END $$;

GRANT EXECUTE ON FUNCTION public.set_workspace_secrets(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_secrets(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_integration_status(uuid) TO authenticated, anon;
