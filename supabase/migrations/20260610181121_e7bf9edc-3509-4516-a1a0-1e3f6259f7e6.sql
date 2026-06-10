
-- Departments: first-class sub-workspace entity
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  primary_color text DEFAULT '#3b82f6',
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.department_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_members TO authenticated;
GRANT ALL ON public.department_members TO service_role;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a member of this department?
CREATE OR REPLACE FUNCTION public.is_department_member(_department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.department_members dm
    JOIN public.workspace_members wm ON wm.id = dm.member_id
    WHERE dm.department_id = _department_id
      AND wm.user_id = auth.uid()
  );
$$;

-- Helper: workspace id for a department (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.department_workspace_id(_department_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.departments WHERE id = _department_id;
$$;

-- RLS: departments visible to anyone in the workspace; managed by workspace owner
CREATE POLICY "Workspace members can read departments"
  ON public.departments FOR SELECT TO authenticated
  USING (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace owners manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

-- RLS: department_members
CREATE POLICY "Workspace members can read department membership"
  ON public.department_members FOR SELECT TO authenticated
  USING (public.is_workspace_owner(public.department_workspace_id(department_id))
      OR public.is_workspace_member(public.department_workspace_id(department_id)));

CREATE POLICY "Workspace owners manage department membership"
  ON public.department_members FOR ALL TO authenticated
  USING (public.is_workspace_owner(public.department_workspace_id(department_id)))
  WITH CHECK (public.is_workspace_owner(public.department_workspace_id(department_id)));

-- Add nullable department_id to scoped tables
ALTER TABLE public.announcements      ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.workspace_documents ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.scheduled_sessions  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- updated_at trigger for departments
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
