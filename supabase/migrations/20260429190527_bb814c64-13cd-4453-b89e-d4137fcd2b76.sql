-- Add slots and tags arrays to scheduled_sessions
ALTER TABLE public.scheduled_sessions
  ADD COLUMN IF NOT EXISTS slots jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tag_ids uuid[] DEFAULT '{}'::uuid[];

-- Session tags table (per workspace, scoped to a category)
CREATE TABLE IF NOT EXISTS public.session_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  category text NOT NULL DEFAULT 'Shift',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view tags" ON public.session_tags
  FOR SELECT TO authenticated
  USING (is_workspace_owner(workspace_id) OR is_workspace_member(workspace_id));

CREATE POLICY "Owners and managers manage tags" ON public.session_tags
  FOR ALL TO authenticated
  USING (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'))
  WITH CHECK (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'));

CREATE INDEX IF NOT EXISTS idx_session_tags_workspace ON public.session_tags(workspace_id);