CREATE OR REPLACE FUNCTION public.has_workspace_permission(_workspace_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    LEFT JOIN public.workspace_permissions wp
      ON wp.member_id = wm.id
     AND wp.workspace_id = wm.workspace_id
     AND wp.permission = _permission
    LEFT JOIN public.workspace_roles wr
      ON wr.id = wm.role_id
     AND wr.workspace_id = wm.workspace_id
    WHERE wm.workspace_id = _workspace_id
      AND wm.user_id = auth.uid()
      AND (
        wp.id IS NOT NULL
        OR COALESCE(wr.permissions, '[]'::jsonb) ? _permission
      )
  )
  OR public.is_workspace_owner(_workspace_id);
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_context(_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  owner_id uuid,
  roblox_group_id text,
  gamepass_id text,
  primary_color text,
  text_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT w.id, w.name, w.owner_id, w.roblox_group_id, w.gamepass_id, w.primary_color, w.text_color
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND (public.is_workspace_owner(w.id) OR public.is_workspace_member(w.id));
$$;

CREATE OR REPLACE FUNCTION public.get_accessible_workspaces()
RETURNS TABLE (
  id uuid,
  name text,
  role text,
  owner_id uuid,
  primary_color text,
  text_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT w.id, w.name, 'Owner'::text AS role, w.owner_id, w.primary_color, w.text_color
  FROM public.workspaces w
  WHERE w.owner_id = auth.uid()

  UNION

  SELECT w.id, w.name, wm.role, w.owner_id, w.primary_color, w.text_color
  FROM public.workspace_members wm
  JOIN public.workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;
CREATE POLICY "Owners can view workspaces directly"
ON public.workspaces
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can leave workspace" ON public.workspace_members;
CREATE POLICY "Users can leave workspace"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());