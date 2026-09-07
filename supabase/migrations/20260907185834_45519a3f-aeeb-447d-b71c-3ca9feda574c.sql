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
  IF f.gamepass_only THEN RAISE EXCEPTION 'gamepass_only_form'; END IF;
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

REVOKE ALL ON FUNCTION public.internal_app_center_grade(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_app_center_grade(uuid, uuid, text, text, jsonb) TO service_role;