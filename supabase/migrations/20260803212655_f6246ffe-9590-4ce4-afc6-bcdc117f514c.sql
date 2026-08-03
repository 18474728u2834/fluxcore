ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS dispatch_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispatch_roles jsonb NOT NULL DEFAULT '["Pilot","First Officer","Cabin Crew","Ground Crew"]'::jsonb;

CREATE TABLE IF NOT EXISTS public.session_crew_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE,
  occurrence_at timestamptz NOT NULL,
  member_id uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  roblox_username text NOT NULL,
  crew_role text NOT NULL,
  assigned_by uuid,
  assigned_by_name text,
  notified_at timestamptz,
  notify_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, occurrence_at, roblox_username)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_crew_assignments TO authenticated;
GRANT ALL ON public.session_crew_assignments TO service_role;

ALTER TABLE public.session_crew_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace can view crew assignments"
ON public.session_crew_assignments FOR SELECT TO authenticated
USING (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id));

CREATE POLICY "Dispatchers can add crew assignments"
ON public.session_crew_assignments FOR INSERT TO authenticated
WITH CHECK (public.has_workspace_permission(workspace_id, 'flight_dispatch'));

CREATE POLICY "Dispatchers can update crew assignments"
ON public.session_crew_assignments FOR UPDATE TO authenticated
USING (public.has_workspace_permission(workspace_id, 'flight_dispatch'))
WITH CHECK (public.has_workspace_permission(workspace_id, 'flight_dispatch'));

CREATE POLICY "Dispatchers can remove crew assignments"
ON public.session_crew_assignments FOR DELETE TO authenticated
USING (public.has_workspace_permission(workspace_id, 'flight_dispatch'));

CREATE TRIGGER update_session_crew_assignments_updated_at
BEFORE UPDATE ON public.session_crew_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_crew_assignments_session ON public.session_crew_assignments (session_id, occurrence_at);