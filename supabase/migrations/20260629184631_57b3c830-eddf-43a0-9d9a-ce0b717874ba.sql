
-- Application Forms ----------------------------------------------------------
CREATE TABLE public.application_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  target_role_id uuid REFERENCES public.workspace_roles(id) ON DELETE SET NULL,
  is_open boolean NOT NULL DEFAULT true,
  auto_rank_on_accept boolean NOT NULL DEFAULT false,
  notify_webhook text,
  min_account_age_days integer NOT NULL DEFAULT 0,
  require_group_member boolean NOT NULL DEFAULT false,
  scoring_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_forms TO authenticated;
GRANT ALL ON public.application_forms TO service_role;
ALTER TABLE public.application_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers read forms" ON public.application_forms
  FOR SELECT TO authenticated USING (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'manage_applications')
    OR public.is_workspace_member(workspace_id)
  );
CREATE POLICY "Owners and managers write forms" ON public.application_forms
  FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id) OR public.has_workspace_permission(workspace_id, 'manage_applications'))
  WITH CHECK (public.is_workspace_owner(workspace_id) OR public.has_workspace_permission(workspace_id, 'manage_applications'));

CREATE TABLE public.application_form_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.application_forms(id) ON DELETE CASCADE,
  label text NOT NULL,
  help_text text,
  type text NOT NULL CHECK (type IN ('short_text','long_text','choice','roblox_username','age','timezone')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_form_questions TO authenticated;
GRANT ALL ON public.application_form_questions TO service_role;
ALTER TABLE public.application_form_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Form questions readable to workspace" ON public.application_form_questions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.application_forms f
            WHERE f.id = form_id
              AND (public.is_workspace_owner(f.workspace_id)
                   OR public.is_workspace_member(f.workspace_id)))
  );
CREATE POLICY "Form questions writable by managers" ON public.application_form_questions
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.application_forms f
            WHERE f.id = form_id
              AND (public.is_workspace_owner(f.workspace_id)
                   OR public.has_workspace_permission(f.workspace_id, 'manage_applications')))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.application_forms f
            WHERE f.id = form_id
              AND (public.is_workspace_owner(f.workspace_id)
                   OR public.has_workspace_permission(f.workspace_id, 'manage_applications')))
  );

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.application_forms(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  roblox_user_id text NOT NULL,
  roblox_username text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','denied')),
  reviewer_id uuid,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers read applications" ON public.applications
  FOR SELECT TO authenticated USING (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'manage_applications')
  );
CREATE POLICY "Managers update applications" ON public.applications
  FOR UPDATE TO authenticated USING (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'manage_applications')
  ) WITH CHECK (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'manage_applications')
  );

CREATE INDEX ON public.applications (workspace_id, status, created_at DESC);
CREATE INDEX ON public.applications (form_id);

-- updated_at trigger for forms
CREATE TRIGGER application_forms_updated_at
BEFORE UPDATE ON public.application_forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public RPC: read open form + questions
CREATE OR REPLACE FUNCTION public.get_public_form(_form_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.application_forms;
  qs jsonb;
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
END $$;
GRANT EXECUTE ON FUNCTION public.get_public_form(uuid) TO anon, authenticated;

-- Public RPC: submit application
CREATE OR REPLACE FUNCTION public.submit_application(
  _form_id uuid,
  _roblox_user_id text,
  _roblox_username text,
  _answers jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.application_forms;
  app_id uuid;
  score int := 0;
  rule jsonb;
  ans text;
BEGIN
  SELECT * INTO f FROM public.application_forms WHERE id = _form_id AND is_open = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'form_closed'; END IF;
  IF _roblox_user_id IS NULL OR _roblox_user_id = '' THEN RAISE EXCEPTION 'missing_identity'; END IF;

  -- Simple auto-scoring: rules like {"contains":"keyword","points":2,"question_id":"..."} or {"min_age_days":60,"points":1}
  FOR rule IN SELECT * FROM jsonb_array_elements(COALESCE(f.scoring_rules, '[]'::jsonb)) LOOP
    IF rule ? 'contains' AND rule ? 'question_id' THEN
      ans := COALESCE(_answers ->> (rule ->> 'question_id'), '');
      IF position(lower(rule ->> 'contains') in lower(ans)) > 0 THEN
        score := score + COALESCE((rule ->> 'points')::int, 0);
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.applications (form_id, workspace_id, roblox_user_id, roblox_username, answers, auto_score)
  VALUES (_form_id, f.workspace_id, _roblox_user_id, _roblox_username, COALESCE(_answers,'{}'::jsonb), score)
  RETURNING id INTO app_id;
  RETURN app_id;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_application(uuid, text, text, jsonb) TO anon, authenticated;

-- Discord -------------------------------------------------------------------
CREATE TABLE public.discord_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_user_id text NOT NULL,
  discord_username text,
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (discord_user_id, workspace_id)
);
GRANT SELECT ON public.discord_links TO authenticated;
GRANT ALL ON public.discord_links TO service_role;
ALTER TABLE public.discord_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own discord links" ON public.discord_links
  FOR SELECT TO authenticated USING (user_id = auth.uid()
    OR public.is_workspace_owner(workspace_id));

CREATE TABLE public.discord_command_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  discord_user_id text NOT NULL,
  discord_username text,
  guild_id text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.discord_command_sessions TO service_role;
ALTER TABLE public.discord_command_sessions ENABLE ROW LEVEL SECURITY;
-- no client policies; only edge function (service role) writes; consumption goes through RPC.

CREATE TABLE public.workspace_discord_guilds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  guild_id text NOT NULL UNIQUE,
  installed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.workspace_discord_guilds TO authenticated;
GRANT ALL ON public.workspace_discord_guilds TO service_role;
ALTER TABLE public.workspace_discord_guilds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read guild mapping" ON public.workspace_discord_guilds
  FOR SELECT TO authenticated USING (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id));
CREATE POLICY "Owners write guild mapping" ON public.workspace_discord_guilds
  FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

-- Bind discord account using a verification token (called by the verification page)
CREATE OR REPLACE FUNCTION public.bind_discord_account(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.discord_command_sessions;
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO s FROM public.discord_command_sessions WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF s.consumed_at IS NOT NULL THEN RAISE EXCEPTION 'already_used'; END IF;
  IF s.expires_at < now() THEN RAISE EXCEPTION 'expired'; END IF;
  IF s.workspace_id IS NULL THEN RAISE EXCEPTION 'no_workspace_for_guild'; END IF;

  INSERT INTO public.discord_links (discord_user_id, discord_username, user_id, workspace_id)
  VALUES (s.discord_user_id, s.discord_username, uid, s.workspace_id)
  ON CONFLICT (discord_user_id, workspace_id) DO UPDATE SET user_id = EXCLUDED.user_id, discord_username = EXCLUDED.discord_username;

  UPDATE public.discord_command_sessions SET consumed_at = now() WHERE id = s.id;
  RETURN jsonb_build_object('workspace_id', s.workspace_id, 'discord_user_id', s.discord_user_id);
END $$;
GRANT EXECUTE ON FUNCTION public.bind_discord_account(text) TO authenticated;

-- Internal lookups for the discord bot (service role only) ------------------
CREATE OR REPLACE FUNCTION public.internal_discord_resolve_user(_guild_id text, _discord_user_id text)
RETURNS TABLE(user_id uuid, workspace_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT dl.user_id, dl.workspace_id
  FROM public.discord_links dl
  JOIN public.workspace_discord_guilds g ON g.workspace_id = dl.workspace_id
  WHERE g.guild_id = _guild_id AND dl.discord_user_id = _discord_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.internal_discord_workspace_for_guild(_guild_id text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT workspace_id FROM public.workspace_discord_guilds WHERE guild_id = _guild_id LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.internal_member_has_permission(_user_id uuid, _workspace_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspaces WHERE id = _workspace_id AND owner_id = _user_id)
      OR EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        LEFT JOIN public.workspace_permissions wp
          ON wp.member_id = wm.id AND wp.workspace_id = wm.workspace_id AND wp.permission = _permission
        LEFT JOIN public.workspace_roles wr ON wr.id = wm.role_id AND wr.workspace_id = wm.workspace_id
        WHERE wm.workspace_id = _workspace_id AND wm.user_id = _user_id
          AND (wp.id IS NOT NULL OR COALESCE(wr.permissions, '[]'::jsonb) ? _permission)
      );
$$;
