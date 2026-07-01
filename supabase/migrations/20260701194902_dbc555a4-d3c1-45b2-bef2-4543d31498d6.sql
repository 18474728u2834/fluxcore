CREATE OR REPLACE FUNCTION public.bootstrap_service_role_key(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE existing_id uuid;
BEGIN
  IF _key IS NULL OR length(_key) < 40 THEN
    RAISE EXCEPTION 'invalid_key';
  END IF;
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'service_role_key' LIMIT 1;
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(_key, 'service_role_key', 'service role JWT used by pg_cron to invoke edge functions');
  ELSE
    PERFORM vault.update_secret(existing_id, _key);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.bootstrap_service_role_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_service_role_key(text) TO service_role;