
-- ============================================================
-- Departments as scoped sub-workspaces
-- ============================================================

-- 1. New columns on departments
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS hero_image_url text;

-- 2. department_leads
CREATE TABLE IF NOT EXISTS public.department_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_leads TO authenticated;
GRANT ALL ON public.department_leads TO service_role;

ALTER TABLE public.department_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read department leads"
  ON public.department_leads FOR SELECT
  USING (
    public.is_workspace_owner(public.department_workspace_id(department_id))
    OR public.is_workspace_member(public.department_workspace_id(department_id))
  );

CREATE POLICY "Workspace owners manage department leads"
  ON public.department_leads FOR ALL
  USING (public.is_workspace_owner(public.department_workspace_id(department_id)))
  WITH CHECK (public.is_workspace_owner(public.department_workspace_id(department_id)));

-- 3. Security definer helpers
CREATE OR REPLACE FUNCTION public.is_department_lead(_department_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.department_leads dl
    JOIN public.workspace_members wm ON wm.id = dl.member_id
    WHERE dl.department_id = _department_id
      AND wm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_department(_department_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_workspace_owner(public.department_workspace_id(_department_id))
      OR public.is_department_lead(_department_id);
$$;

-- 4. Add optional department_id to scoped tables
ALTER TABLE public.scheduled_sessions  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE;
ALTER TABLE public.workspace_quotas    ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE;
ALTER TABLE public.announcements       ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE;
ALTER TABLE public.workspace_documents ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE;
ALTER TABLE public.loa_requests        ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE;
ALTER TABLE public.workspace_roles     ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE;
ALTER TABLE public.member_logs         ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS scheduled_sessions_dept_idx  ON public.scheduled_sessions(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS workspace_quotas_dept_idx    ON public.workspace_quotas(department_id)   WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS announcements_dept_idx       ON public.announcements(department_id)      WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS workspace_documents_dept_idx ON public.workspace_documents(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS loa_requests_dept_idx        ON public.loa_requests(department_id)       WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS workspace_roles_dept_idx     ON public.workspace_roles(department_id)    WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS member_logs_dept_idx         ON public.member_logs(department_id)        WHERE department_id IS NOT NULL;

-- 5. Reusable visibility helper
CREATE OR REPLACE FUNCTION public.can_see_department_row(_workspace_id uuid, _department_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (public.is_workspace_owner(_workspace_id) OR public.is_workspace_member(_workspace_id))
    AND (
      _department_id IS NULL
      OR public.is_workspace_owner(_workspace_id)
      OR public.is_department_member(_department_id)
    );
$$;

-- 6. Replace SELECT policies to honor department scoping
DROP POLICY IF EXISTS "Can view scheduled sessions" ON public.scheduled_sessions;
CREATE POLICY "Can view scheduled sessions" ON public.scheduled_sessions
  FOR SELECT USING (public.can_see_department_row(workspace_id, department_id));

DROP POLICY IF EXISTS "Members can view quotas" ON public.workspace_quotas;
CREATE POLICY "Members can view quotas" ON public.workspace_quotas
  FOR SELECT USING (public.can_see_department_row(workspace_id, department_id));

DROP POLICY IF EXISTS "Can view announcements" ON public.announcements;
CREATE POLICY "Can view announcements" ON public.announcements
  FOR SELECT USING (public.can_see_department_row(workspace_id, department_id));

DROP POLICY IF EXISTS "Members can view documents" ON public.workspace_documents;
CREATE POLICY "Members can view documents" ON public.workspace_documents
  FOR SELECT USING (public.can_see_department_row(workspace_id, department_id));

DROP POLICY IF EXISTS "Members can view LOA requests" ON public.loa_requests;
CREATE POLICY "Members can view LOA requests" ON public.loa_requests
  FOR SELECT USING (public.can_see_department_row(workspace_id, department_id));

DROP POLICY IF EXISTS "Members can view logs in their workspace" ON public.member_logs;
CREATE POLICY "Members can view logs in their workspace" ON public.member_logs
  FOR SELECT USING (public.can_see_department_row(workspace_id, department_id));

-- workspace_roles: keep existing select policy as-is, but add restriction via replacement
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='workspace_roles' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.workspace_roles', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Can view workspace roles" ON public.workspace_roles
  FOR SELECT USING (public.can_see_department_row(workspace_id, department_id));

-- 7. Allow department leads to manage their dept rows (additive policies)
CREATE POLICY "Dept leads manage scheduled sessions"
  ON public.scheduled_sessions FOR ALL
  USING (department_id IS NOT NULL AND public.can_manage_department(department_id))
  WITH CHECK (department_id IS NOT NULL AND public.can_manage_department(department_id));

CREATE POLICY "Dept leads manage quotas"
  ON public.workspace_quotas FOR ALL
  USING (department_id IS NOT NULL AND public.can_manage_department(department_id))
  WITH CHECK (department_id IS NOT NULL AND public.can_manage_department(department_id));

CREATE POLICY "Dept leads manage announcements"
  ON public.announcements FOR ALL
  USING (department_id IS NOT NULL AND public.can_manage_department(department_id))
  WITH CHECK (department_id IS NOT NULL AND public.can_manage_department(department_id));

CREATE POLICY "Dept leads manage documents"
  ON public.workspace_documents FOR ALL
  USING (department_id IS NOT NULL AND public.can_manage_department(department_id))
  WITH CHECK (department_id IS NOT NULL AND public.can_manage_department(department_id));

CREATE POLICY "Dept leads manage LOA"
  ON public.loa_requests FOR UPDATE
  USING (department_id IS NOT NULL AND public.can_manage_department(department_id))
  WITH CHECK (department_id IS NOT NULL AND public.can_manage_department(department_id));

CREATE POLICY "Dept leads manage roles"
  ON public.workspace_roles FOR ALL
  USING (department_id IS NOT NULL AND public.can_manage_department(department_id))
  WITH CHECK (department_id IS NOT NULL AND public.can_manage_department(department_id));

CREATE POLICY "Dept leads manage logs"
  ON public.member_logs FOR ALL
  USING (department_id IS NOT NULL AND public.can_manage_department(department_id))
  WITH CHECK (department_id IS NOT NULL AND public.can_manage_department(department_id));

-- 8. Department-scoped accessible departments for the switcher
CREATE OR REPLACE FUNCTION public.get_accessible_departments()
RETURNS TABLE(
  id uuid,
  workspace_id uuid,
  name text,
  slug text,
  primary_color text,
  icon text,
  hero_image_url text,
  is_lead boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT d.id, d.workspace_id, d.name, d.slug, d.primary_color, d.icon, d.hero_image_url,
         (public.is_workspace_owner(d.workspace_id) OR public.is_department_lead(d.id)) AS is_lead
  FROM public.departments d
  WHERE public.is_workspace_owner(d.workspace_id)
     OR EXISTS (
       SELECT 1
       FROM public.department_members dm
       JOIN public.workspace_members wm ON wm.id = dm.member_id
       WHERE dm.department_id = d.id AND wm.user_id = auth.uid()
     );
$$;
