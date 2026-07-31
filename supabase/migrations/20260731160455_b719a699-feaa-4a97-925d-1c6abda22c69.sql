CREATE TABLE public.session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE,
  occurrence_at timestamptz NOT NULL,
  roblox_user_id text NOT NULL,
  roblox_username text,
  member_id uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  minutes_present integer NOT NULL DEFAULT 0,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, occurrence_at, roblox_user_id)
);

CREATE INDEX idx_session_attendance_ws_time ON public.session_attendance (workspace_id, occurrence_at DESC);

GRANT SELECT ON public.session_attendance TO authenticated;
GRANT ALL ON public.session_attendance TO service_role;

ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view attendance"
ON public.session_attendance FOR SELECT TO authenticated
USING (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id));