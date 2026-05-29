
ALTER TABLE public.partner_portals
  ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS partner_portals_auto_workspace_uniq
  ON public.partner_portals (workspace_id)
  WHERE auto_created = true;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS subdomain_grace_until timestamptz NOT NULL DEFAULT (now() + interval '10 days');

DROP POLICY IF EXISTS "Owners manage their auto portal" ON public.partner_portals;
CREATE POLICY "Owners manage their auto portal"
  ON public.partner_portals FOR ALL
  TO authenticated
  USING (auto_created = true AND public.is_workspace_owner(workspace_id))
  WITH CHECK (auto_created = true AND public.is_workspace_owner(workspace_id));

CREATE OR REPLACE FUNCTION public.heartbeat_portal(_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_workspace_owner(_workspace_id) OR public.is_workspace_member(_workspace_id)) THEN
    RETURN;
  END IF;
  UPDATE public.partner_portals
     SET last_active_at = now(),
         status = CASE WHEN status = 'dormant' THEN 'active' ELSE status END
   WHERE workspace_id = _workspace_id
     AND auto_created = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.heartbeat_portal(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sweep_dormant_portals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.partner_portals
     SET status = 'dormant'
   WHERE auto_created = true
     AND status = 'active'
     AND last_active_at < now() - interval '2 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
