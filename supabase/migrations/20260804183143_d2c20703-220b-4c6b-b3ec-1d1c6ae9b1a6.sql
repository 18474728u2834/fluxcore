CREATE TABLE public.session_crew_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE,
  occurrence_at timestamptz NOT NULL,
  user_id uuid NOT NULL,
  member_id uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  roblox_username text NOT NULL,
  availability text NOT NULL DEFAULT 'available',
  preferred_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, occurrence_at, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_crew_preferences TO authenticated;
GRANT ALL ON public.session_crew_preferences TO service_role;

ALTER TABLE public.session_crew_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace people can read crew wishlist"
ON public.session_crew_preferences FOR SELECT TO authenticated
USING (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id));

CREATE POLICY "Members manage their own wishlist entry"
ON public.session_crew_preferences FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id)));

CREATE POLICY "Members update their own wishlist entry"
ON public.session_crew_preferences FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members or dispatchers delete wishlist entries"
ON public.session_crew_preferences FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_workspace_owner(workspace_id) OR public.has_workspace_permission(workspace_id, 'flight_dispatch'));

CREATE TRIGGER session_crew_preferences_updated_at
BEFORE UPDATE ON public.session_crew_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();