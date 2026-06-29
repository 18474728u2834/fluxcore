
-- Question-level grading config
ALTER TABLE public.application_form_questions
  ADD COLUMN IF NOT EXISTS correct_answer text,
  ADD COLUMN IF NOT EXISTS match_mode text NOT NULL DEFAULT 'any';
-- match_mode in: any | exact | contains | fuzzy

-- Form-level pass settings
ALTER TABLE public.application_forms
  ADD COLUMN IF NOT EXISTS pass_threshold integer NOT NULL DEFAULT 100, -- percent of gradeable Qs needed
  ADD COLUMN IF NOT EXISTS fail_kick_message text NOT NULL DEFAULT 'You did not pass the application. Try again later.',
  ADD COLUMN IF NOT EXISTS pass_message      text NOT NULL DEFAULT 'Passed & Ranked - welcome aboard!',
  ADD COLUMN IF NOT EXISTS pass_rank_number  integer;

-- Public RPC must NOT leak correct_answer / match_mode
CREATE OR REPLACE FUNCTION public.get_public_form(_form_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
    'description', f.description, 'is_open', f.is_open, 'questions', qs
  );
END $function$;

-- Roblox proxy listing: also must NOT leak correct_answer / match_mode
CREATE OR REPLACE FUNCTION public.internal_app_center_list_forms(_workspace_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
$function$;

-- Internal helper: fuzzy / contains / exact match. Returns true if the
-- applicant's answer is considered correct for the configured mode.
CREATE OR REPLACE FUNCTION public.internal_answer_matches(_ans text, _correct text, _mode text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
AS $function$
DECLARE
  a text := lower(coalesce(_ans, ''));
  c text := lower(coalesce(_correct, ''));
  shared int;
  total  int;
BEGIN
  IF c = '' OR _mode = 'any' THEN RETURN true; END IF;
  IF _mode = 'exact'    THEN RETURN btrim(a) = btrim(c); END IF;
  IF _mode = 'contains' THEN RETURN position(btrim(c) in a) > 0; END IF;
  IF _mode = 'fuzzy' THEN
    -- shared-word ratio over the expected answer's tokens
    SELECT count(*) INTO total
      FROM regexp_split_to_table(c, '\W+') t WHERE t <> '';
    IF total = 0 THEN RETURN true; END IF;
    SELECT count(*) INTO shared
      FROM (
        SELECT DISTINCT t FROM regexp_split_to_table(c, '\W+') t WHERE t <> ''
        INTERSECT
        SELECT DISTINCT t FROM regexp_split_to_table(a, '\W+') t WHERE t <> ''
      ) s;
    RETURN shared::float / total >= 0.5;
  END IF;
  RETURN true;
END $function$;

-- Grade + submit (called by the Roblox-server proxy, authenticated by API key)
CREATE OR REPLACE FUNCTION public.internal_app_center_grade(
  _workspace_id uuid,
  _form_id uuid,
  _roblox_user_id text,
  _roblox_username text,
  _answers jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  f public.application_forms;
  q public.application_form_questions;
  total int := 0;
  correct int := 0;
  ratio_pct int := 0;
  passed boolean := true;
  app_id uuid;
  ans text;
BEGIN
  SELECT * INTO f FROM public.application_forms
    WHERE id = _form_id AND workspace_id = _workspace_id AND is_open = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'form_not_found'; END IF;
  IF _roblox_user_id IS NULL OR _roblox_user_id = '' THEN RAISE EXCEPTION 'missing_identity'; END IF;

  FOR q IN
    SELECT * FROM public.application_form_questions
    WHERE form_id = f.id AND match_mode <> 'any' AND correct_answer IS NOT NULL AND correct_answer <> ''
  LOOP
    total := total + 1;
    ans := coalesce(_answers ->> (q.id::text), '');
    IF public.internal_answer_matches(ans, q.correct_answer, q.match_mode) THEN
      correct := correct + 1;
    END IF;
  END LOOP;

  IF total > 0 THEN
    ratio_pct := (correct * 100) / total;
    passed := ratio_pct >= COALESCE(f.pass_threshold, 100);
  END IF;

  INSERT INTO public.applications (form_id, workspace_id, roblox_user_id, roblox_username, answers, auto_score, status)
  VALUES (f.id, f.workspace_id, _roblox_user_id, _roblox_username, COALESCE(_answers,'{}'::jsonb), correct,
          CASE WHEN total > 0 AND passed THEN 'accepted'
               WHEN total > 0 AND NOT passed THEN 'rejected'
               ELSE 'pending' END)
  RETURNING id INTO app_id;

  RETURN jsonb_build_object(
    'application_id', app_id,
    'gradeable_total', total,
    'correct', correct,
    'ratio_pct', ratio_pct,
    'pass_threshold', COALESCE(f.pass_threshold, 100),
    'passed', passed,
    'pass_message', f.pass_message,
    'fail_kick_message', f.fail_kick_message,
    'pass_rank_number', f.pass_rank_number,
    'auto_rank_on_accept', f.auto_rank_on_accept
  );
END $function$;
