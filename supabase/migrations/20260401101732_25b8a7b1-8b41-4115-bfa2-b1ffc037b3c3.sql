
-- Create a security definer function to check workspace ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = _workspace_id AND owner_id = auth.uid()
  );
$$;

-- Create a security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid()
  );
$$;

-- Fix workspaces policies
DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can manage their workspaces" ON public.workspaces;

CREATE POLICY "Owners can manage workspaces" ON public.workspaces FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view workspaces" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id));

-- Fix workspace_members policies
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can manage workspace members" ON public.workspace_members;

CREATE POLICY "Owners manage members" ON public.workspace_members FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id)) WITH CHECK (public.is_workspace_owner(workspace_id));

CREATE POLICY "Members view members" ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Fix other tables that reference workspaces/members in policies
DROP POLICY IF EXISTS "Members can view workspace events" ON public.activity_events;
DROP POLICY IF EXISTS "Workspace owners can view activity events" ON public.activity_events;
CREATE POLICY "Can view events" ON public.activity_events FOR SELECT TO authenticated
  USING (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can view their own sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "Workspace owners can view activity sessions" ON public.activity_sessions;
CREATE POLICY "Can view sessions" ON public.activity_sessions FOR SELECT TO authenticated
  USING (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Owners can manage announcements" ON public.announcements;
CREATE POLICY "Can view announcements" ON public.announcements FOR SELECT TO authenticated
  USING (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id));
CREATE POLICY "Owners manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id)) WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS "Members can view sessions" ON public.scheduled_sessions;
DROP POLICY IF EXISTS "Owners can manage sessions" ON public.scheduled_sessions;
CREATE POLICY "Can view scheduled sessions" ON public.scheduled_sessions FOR SELECT TO authenticated
  USING (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id));
CREATE POLICY "Owners manage scheduled sessions" ON public.scheduled_sessions FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id)) WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS "Members can view their permissions" ON public.workspace_permissions;
DROP POLICY IF EXISTS "Owners can manage permissions" ON public.workspace_permissions;
CREATE POLICY "Can view permissions" ON public.workspace_permissions FOR SELECT TO authenticated
  USING (public.is_workspace_owner(workspace_id) OR member_id IN (SELECT id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Owners manage permissions" ON public.workspace_permissions FOR ALL TO authenticated
  USING (public.is_workspace_owner(workspace_id)) WITH CHECK (public.is_workspace_owner(workspace_id));
