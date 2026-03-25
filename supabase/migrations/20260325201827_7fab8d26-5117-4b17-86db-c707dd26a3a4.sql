
-- Workspace permissions table
CREATE TABLE public.workspace_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, permission)
);

ALTER TABLE public.workspace_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage permissions" ON public.workspace_permissions
FOR ALL TO authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Members can view their permissions" ON public.workspace_permissions
FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Announcements / Wall
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view announcements" ON public.announcements
FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  UNION
  SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
));

CREATE POLICY "Owners can manage announcements" ON public.announcements
FOR ALL TO authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- Sessions / Events (scheduled events like Shift Training)
CREATE TABLE public.scheduled_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Shift',
  description text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  recurring text DEFAULT NULL, -- 'weekly', 'daily', or null for one-time
  host_id uuid,
  host_name text NOT NULL,
  co_host_name text,
  trainer_name text,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled, active, completed, cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sessions" ON public.scheduled_sessions
FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  UNION
  SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
));

CREATE POLICY "Owners can manage sessions" ON public.scheduled_sessions
FOR ALL TO authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- Update triggers
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_sessions_updated_at
  BEFORE UPDATE ON public.scheduled_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
