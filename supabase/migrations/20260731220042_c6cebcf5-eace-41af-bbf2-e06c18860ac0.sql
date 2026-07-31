-- Boot screen (PortalBoot) should only appear for portals that have been truly
-- inactive for 2+ days: no portal visits AND no in-game workspace activity.

-- 1) Update the dormant sweep so it only marks a portal dormant when both the
--    portal's last heartbeat AND the workspace's activity sessions are older than
--    2 days.
CREATE OR REPLACE FUNCTION public.sweep_dormant_portals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.partner_portals p
     SET status = 'dormant'
   WHERE p.auto_created = true
     AND p.status = 'active'
     AND p.last_active_at < now() - interval '2 days'
     AND NOT EXISTS (
       SELECT 1
         FROM public.activity_sessions s
        WHERE s.workspace_id = p.workspace_id
          AND (
            s.created_at > now() - interval '2 days'
            OR s.joined_at > now() - interval '2 days'
            OR s.left_at > now() - interval '2 days'
          )
     );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sweep_dormant_portals() TO authenticated, service_role;

-- 2) Wake up a dormant portal whenever a player joins the workspace in-game.
--    This is triggered by new rows in activity_sessions (activity-tracker join).
CREATE OR REPLACE FUNCTION public.activity_session_wake_portal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.partner_portals
     SET last_active_at = now(),
         status = CASE WHEN status = 'dormant' THEN 'active' ELSE status END
   WHERE workspace_id = NEW.workspace_id
     AND auto_created = true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_sessions_wake_portal ON public.activity_sessions;
CREATE TRIGGER activity_sessions_wake_portal
  AFTER INSERT ON public.activity_sessions
  FOR EACH ROW EXECUTE FUNCTION public.activity_session_wake_portal();

-- 3) Schedule the sweep to run every 10 minutes so dormant status is always accurate.
SELECT cron.unschedule('sweep-dormant-portals');
SELECT cron.schedule(
  'sweep-dormant-portals',
  '*/10 * * * *',
  $cron$SELECT public.sweep_dormant_portals();$cron$
);