-- Function to calculate session duration when left_at is set
CREATE OR REPLACE FUNCTION public.calculate_session_duration(ws_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE activity_sessions
  SET duration_seconds = EXTRACT(EPOCH FROM (left_at - joined_at))::INTEGER
  WHERE workspace_id = ws_id
    AND left_at IS NOT NULL
    AND duration_seconds IS NULL;
END;
$$;

-- Allow workspace members to also view sessions they belong to
CREATE POLICY "Members can view their own sessions"
  ON public.activity_sessions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Allow workspace members to view events in their workspaces
CREATE POLICY "Members can view workspace events"
  ON public.activity_events FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Allow members to view workspaces they belong to
CREATE POLICY "Members can view their workspaces"
  ON public.workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );