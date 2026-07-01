-- Cron jobs were calling edge functions with the ANON JWT, but functions like
-- cron-sync-staff, subdomain-sweeper, and discord-notify require the SERVICE ROLE
-- Bearer token. Every invocation returned 401, so new Roblox group members never
-- got auto-imported into workspace_members. Fix by storing the service_role key
-- in vault and rewriting cron commands to read it at call time.

-- 1) Ensure a vault secret slot exists for the service role key.
DO $$
DECLARE existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'service_role_key';
  IF existing_id IS NULL THEN
    BEGIN
      PERFORM vault.create_secret(
        'REPLACE_ME_WITH_REAL_SERVICE_ROLE_JWT',
        'service_role_key',
        'Service role JWT used by pg_cron to invoke privileged edge functions'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

-- 2) Helper that pg_cron can call to invoke any edge function with the
--    service_role Bearer token. SECURITY DEFINER so it can read vault.
CREATE OR REPLACE FUNCTION public.cron_invoke_edge(
  fn_name text,
  body jsonb DEFAULT '{}'::jsonb
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  key text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret INTO key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF key IS NULL OR length(key) < 40 OR key = 'REPLACE_ME_WITH_REAL_SERVICE_ROLE_JWT' THEN
    RAISE NOTICE 'cron_invoke_edge: service_role_key vault secret is not set';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := 'https://zulnuayumxsdbivigvfe.supabase.co/functions/v1/' || fn_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || key,
      'apikey', key
    ),
    body := body
  ) INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_invoke_edge(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_invoke_edge(text, jsonb) TO postgres, service_role;

-- 3) Reschedule the three broken cron jobs to route through the helper.
SELECT cron.unschedule('fluxcore-sync-staff-every-minute');
SELECT cron.schedule(
  'fluxcore-sync-staff-every-minute',
  '* * * * *',
  $cron$SELECT public.cron_invoke_edge('cron-sync-staff', jsonb_build_object('triggered_at', now()));$cron$
);

SELECT cron.unschedule('dispatch-discord-session-alerts');
SELECT cron.schedule(
  'dispatch-discord-session-alerts',
  '* * * * *',
  $cron$SELECT public.cron_invoke_edge('discord-notify', '{"action":"dispatch_due_sessions"}'::jsonb);$cron$
);

SELECT cron.unschedule('subdomain-sweeper-1m');
SELECT cron.schedule(
  'subdomain-sweeper-1m',
  '* * * * *',
  $cron$SELECT public.cron_invoke_edge('subdomain-sweeper', '{}'::jsonb);$cron$
);

-- 4) Defense-in-depth: staff with manage_members can add teammates directly.
DROP POLICY IF EXISTS "Staff can add members" ON public.workspace_members;
CREATE POLICY "Staff can add members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission('manage_members'));