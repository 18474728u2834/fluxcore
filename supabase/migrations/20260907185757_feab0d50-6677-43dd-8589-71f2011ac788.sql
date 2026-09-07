ALTER TABLE public.application_forms
  ADD COLUMN IF NOT EXISTS gamepass_only boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_public_form(_form_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE f public.application_forms; qs jsonb;
BEGIN
  SELECT * INTO f FROM public.application_forms WHERE id = _form_id AND is_open = true;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', q.id, 'label', q.label, 'help_text', q.help_text,
    'type', q.type, 'options', q.options, 'required', q.required, 'position', q.position
  ) ORDER BY q.position), '[]'::jsonb) INTO qs
  FROM public.application_form_questions q WHERE q.form_id = f.id;
  RETURN jsonb_build_object(
    'id', f.id, 'workspace_id', f.workspace_id, 'title', f.title,
    'description', f.description, 'is_open', f.is_open,
    'questions', CASE WHEN f.gamepass_only THEN '[]'::jsonb ELSE qs END,
    'skip_gamepass_id', f.skip_gamepass_id, 'skip_gamepass_price', f.skip_gamepass_price,
    'gamepass_only', f.gamepass_only
  );
END $function$;

CREATE OR REPLACE FUNCTION public.internal_app_center_list_forms(_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'title', f.title,
    'description', f.description,
    'skip_gamepass_id', f.skip_gamepass_id,
    'skip_gamepass_price', f.skip_gamepass_price,
    'gamepass_only', f.gamepass_only,
    'questions', CASE WHEN f.gamepass_only THEN '[]'::jsonb ELSE (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', q.id, 'label', q.label, 'help_text', q.help_text,
        'type', q.type, 'options', q.options, 'required', q.required, 'position', q.position
      ) ORDER BY q.position), '[]'::jsonb)
      FROM public.application_form_questions q WHERE q.form_id = f.id
    ) END
  ) ORDER BY f.title), '[]'::jsonb)
  FROM public.application_forms f
  WHERE f.workspace_id = _workspace_id AND f.is_open = true;
$function$;

CREATE OR REPLACE FUNCTION public.internal_app_center_grade(_workspace_id uuid, _form_id uuid, _roblox_user_id text, _roblox_username text, _answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE f public.application_forms;
BEGIN
  SELECT * INTO f FROM public.application_forms
    WHERE id = _form_id AND workspace_id = _workspace_id AND is_open = true;
  IF FOUND AND f.gamepass_only THEN RAISE EXCEPTION 'gamepass_only_form'; END IF;
  RETURN public.internal_app_center_grade_v1(_workspace_id, _form_id, _roblox_user_id, _roblox_username, _answers);
END $function$;