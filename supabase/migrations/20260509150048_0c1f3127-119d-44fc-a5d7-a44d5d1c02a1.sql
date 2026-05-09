
-- 1. Tables
CREATE TABLE public.staff_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  roblox_username text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner_admin','admin')),
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.staff_admins(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_id, permission)
);

CREATE TABLE public.staff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_username text,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  target_username text,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_admins WHERE user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.verified_users
        WHERE user_id = auth.uid() AND lower(roblox_username) = 'novavoff'
      );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_owner_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_admins
    WHERE user_id = auth.uid() AND role = 'owner_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.verified_users
    WHERE user_id = auth.uid() AND lower(roblox_username) = 'novavoff'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_staff_permission(_perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff_owner_admin()
      OR EXISTS (
        SELECT 1
        FROM public.staff_admins a
        JOIN public.staff_permissions p ON p.admin_id = a.id
        WHERE a.user_id = auth.uid() AND p.permission = _perm
      );
$$;

-- Update legacy fluxcore staff check to also include any staff_admin
CREATE OR REPLACE FUNCTION public.is_fluxcore_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff_admin();
$$;

-- 3. RLS policies
CREATE POLICY "Staff can view admins" ON public.staff_admins
  FOR SELECT TO authenticated USING (public.is_staff_admin());
CREATE POLICY "Owner admin manages admins" ON public.staff_admins
  FOR ALL TO authenticated
  USING (public.is_staff_owner_admin())
  WITH CHECK (public.is_staff_owner_admin());

CREATE POLICY "Staff can view permissions" ON public.staff_permissions
  FOR SELECT TO authenticated USING (public.is_staff_admin());
CREATE POLICY "Owner admin manages permissions" ON public.staff_permissions
  FOR ALL TO authenticated
  USING (public.is_staff_owner_admin())
  WITH CHECK (public.is_staff_owner_admin());

CREATE POLICY "Staff can view audit log" ON public.staff_audit_log
  FOR SELECT TO authenticated USING (public.is_staff_admin());
CREATE POLICY "Staff can append audit log" ON public.staff_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_admin() AND admin_user_id = auth.uid());

CREATE POLICY "Staff can view exports" ON public.data_export_requests
  FOR SELECT TO authenticated USING (public.has_staff_permission('export_user_data'));
CREATE POLICY "Staff can create exports" ON public.data_export_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission('export_user_data') AND requested_by = auth.uid());

-- 4. Extend existing tables for staff moderation
CREATE POLICY "Staff can delete workspaces" ON public.workspaces
  FOR DELETE TO authenticated USING (public.has_staff_permission('delete_workspaces'));

CREATE POLICY "Staff can delete activity events" ON public.activity_events
  FOR DELETE TO authenticated USING (public.has_staff_permission('moderate_chats'));

CREATE POLICY "Staff can view all activity events" ON public.activity_events
  FOR SELECT TO authenticated USING (public.has_staff_permission('moderate_chats'));

CREATE POLICY "Staff can delete members" ON public.workspace_members
  FOR DELETE TO authenticated USING (public.has_staff_permission('delete_users'));

CREATE POLICY "Staff can view all workspaces" ON public.workspaces
  FOR SELECT TO authenticated USING (public.is_staff_admin());

-- 5. Seed Novavoff as owner admin
INSERT INTO public.staff_admins (user_id, roblox_username, role)
SELECT user_id, roblox_username, 'owner_admin'
FROM public.verified_users
WHERE lower(roblox_username) = 'novavoff'
ON CONFLICT (user_id) DO UPDATE SET role = 'owner_admin';
