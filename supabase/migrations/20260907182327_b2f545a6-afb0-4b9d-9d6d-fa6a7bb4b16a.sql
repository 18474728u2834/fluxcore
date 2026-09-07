ALTER TABLE public.application_forms
  ADD COLUMN IF NOT EXISTS skip_gamepass_id text,
  ADD COLUMN IF NOT EXISTS skip_gamepass_price integer;

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
    'description', f.description, 'is_open', f.is_open, 'questions', qs,
    'skip_gamepass_id', f.skip_gamepass_id, 'skip_gamepass_price', f.skip_gamepass_price
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
$function$;

CREATE OR REPLACE FUNCTION public.internal_app_center_gamepass_skip(_workspace_id uuid, _form_id uuid, _roblox_user_id text, _roblox_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE f public.application_forms; app_id uuid;
BEGIN
  SELECT * INTO f FROM public.application_forms
    WHERE id = _form_id AND workspace_id = _workspace_id AND is_open = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'form_not_found'; END IF;
  IF f.skip_gamepass_id IS NULL OR f.skip_gamepass_id = '' THEN RAISE EXCEPTION 'no_skip_gamepass'; END IF;
  IF _roblox_user_id IS NULL OR _roblox_user_id = '' THEN RAISE EXCEPTION 'missing_identity'; END IF;

  INSERT INTO public.applications (form_id, workspace_id, roblox_user_id, roblox_username, answers, auto_score, status)
  VALUES (f.id, f.workspace_id, _roblox_user_id, _roblox_username, '{"_skipped_via_gamepass": true}'::jsonb, 0, 'accepted')
  RETURNING id INTO app_id;

  RETURN jsonb_build_object(
    'application_id', app_id,
    'skip_gamepass_id', f.skip_gamepass_id,
    'pass_message', f.pass_message,
    'pass_rank_number', f.pass_rank_number,
    'auto_rank_on_accept', f.auto_rank_on_accept
  );
END $function$;

REVOKE EXECUTE ON FUNCTION public.internal_app_center_gamepass_skip(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_app_center_gamepass_skip(uuid, uuid, text, text) TO service_role;