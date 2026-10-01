CREATE TABLE public.nexus_v4_beta_access (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nexus_v4_beta_access TO authenticated;
GRANT ALL ON public.nexus_v4_beta_access TO service_role;

ALTER TABLE public.nexus_v4_beta_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace users and staff can view Nexus 4 beta access"
ON public.nexus_v4_beta_access FOR SELECT TO authenticated
USING (
  public.is_staff_admin()
  OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = nexus_v4_beta_access.workspace_id AND w.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = nexus_v4_beta_access.workspace_id AND m.user_id = auth.uid())
);

CREATE POLICY "Staff admins manage Nexus 4 beta access"
ON public.nexus_v4_beta_access FOR ALL TO authenticated
USING (public.is_staff_admin())
WITH CHECK (public.is_staff_admin());

INSERT INTO public.nexus_v4_beta_access (workspace_id, note)
SELECT id, 'Preserved from existing Nexus 4 selection'
FROM public.workspaces
WHERE nexus_config->>'version' = 'v4'
ON CONFLICT (workspace_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_nexus_v4_beta(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nexus_v4_beta_access b
    WHERE b.workspace_id = _workspace_id
  ) AND (
    public.is_staff_admin()
    OR public.is_workspace_owner(_workspace_id)
    OR public.is_workspace_member(_workspace_id)
  );
$$;

REVOKE ALL ON FUNCTION public.has_nexus_v4_beta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_nexus_v4_beta(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_nexus_config(_workspace_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN COALESCE(w.nexus_config, '{}'::jsonb)->>'version' = 'v4'
      AND NOT EXISTS (SELECT 1 FROM public.nexus_v4_beta_access b WHERE b.workspace_id = w.id)
    THEN jsonb_set(COALESCE(w.nexus_config, '{}'::jsonb), '{version}', '"v3"'::jsonb, true)
    ELSE COALESCE(w.nexus_config, '{}'::jsonb)
  END
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND (public.is_workspace_owner(w.id) OR public.is_workspace_member(w.id));
$$;

CREATE OR REPLACE FUNCTION public.set_nexus_config(_workspace_id uuid, _config jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_workspace_owner(_workspace_id) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  IF COALESCE(_config->>'version', 'v1') = 'v4'
    AND NOT EXISTS (SELECT 1 FROM public.nexus_v4_beta_access b WHERE b.workspace_id = _workspace_id) THEN
    RAISE EXCEPTION 'nexus_v4_beta_required';
  END IF;
  UPDATE public.workspaces SET nexus_config = COALESCE(_config, '{}'::jsonb) WHERE id = _workspace_id;
  RETURN COALESCE(_config, '{}'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.get_nexus_config(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_nexus_config(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_nexus_config(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_nexus_config(uuid, jsonb) TO authenticated, service_role;