
-- Application Center API key (separate from workspace api_key, used by the Roblox Application Center script)
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS app_center_api_key_hash TEXT;

-- Owner-only: rotate / set a new application-center key, returns the new plaintext key (only chance to see it)
CREATE OR REPLACE FUNCTION public.rotate_app_center_key(_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_key text;
BEGIN
  IF NOT public.is_workspace_owner(_workspace_id) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  -- 40-char url-safe random key with "fxac_" prefix (Fluxcore Application Center)
  new_key := 'fxac_' || encode(extensions.gen_random_bytes(24), 'hex');
  UPDATE public.workspaces
     SET app_center_api_key_hash = encode(extensions.digest(new_key::bytea, 'sha256'::text), 'hex')
   WHERE id = _workspace_id;
  RETURN new_key;
END $$;

REVOKE ALL ON FUNCTION public.rotate_app_center_key(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_app_center_key(uuid) TO authenticated, service_role;

-- Internal lookup: workspace by app-center api key (used by the edge function via service role)
CREATE OR REPLACE FUNCTION public.internal_workspace_by_app_center_key(_api_key text)
RETURNS TABLE(workspace_id uuid, workspace_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.name FROM public.workspaces w
  WHERE w.app_center_api_key_hash = encode(extensions.digest(_api_key::bytea, 'sha256'::text), 'hex')
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.internal_workspace_by_app_center_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_workspace_by_app_center_key(text) TO service_role;

-- List open forms (with questions) for a workspace
CREATE OR REPLACE FUNCTION public.internal_app_center_list_forms(_workspace_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'title', f.title,
    'description', f.description,
    'questions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', q.id, 'label', q.label, 'help_text', q.help_text,
        'type', q.type, 'options', q.options, 'required', q.required, 'position', q.position
      ) ORDER BY q.position), '[]'::jsonb)
      FROM public.application_form_questions q WHERE q.form_id = f.id
    )
  ) ORDER BY f.title), '[]'::jsonb)
  FROM public.application_forms f
  WHERE f.workspace_id = _workspace_id AND f.is_open = true;
$$;

REVOKE ALL ON FUNCTION public.internal_app_center_list_forms(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_app_center_list_forms(uuid) TO service_role;
