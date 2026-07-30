ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS nexus_config jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.get_nexus_config(_workspace_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(w.nexus_config, '{}'::jsonb)
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
  UPDATE public.workspaces SET nexus_config = COALESCE(_config, '{}'::jsonb) WHERE id = _workspace_id;
  RETURN COALESCE(_config, '{}'::jsonb);
END $$;

GRANT EXECUTE ON FUNCTION public.get_nexus_config(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_nexus_config(uuid, jsonb) TO authenticated;