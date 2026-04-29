ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS verified_official boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_accessible_workspaces();
DROP FUNCTION IF EXISTS public.get_workspace_context(uuid);

CREATE FUNCTION public.get_accessible_workspaces()
RETURNS TABLE(id uuid, name text, role text, owner_id uuid, primary_color text, text_color text, background_color text, show_grid boolean, roblox_group_id text, verified_official boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT w.id, w.name, 'Owner'::text AS role, w.owner_id, w.primary_color, w.text_color, w.background_color, w.show_grid, w.roblox_group_id, w.verified_official
  FROM public.workspaces w WHERE w.owner_id = auth.uid()
  UNION
  SELECT w.id, w.name, wm.role, w.owner_id, w.primary_color, w.text_color, w.background_color, w.show_grid, w.roblox_group_id, w.verified_official
  FROM public.workspace_members wm JOIN public.workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = auth.uid();
$function$;

CREATE FUNCTION public.get_workspace_context(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, owner_id uuid, roblox_group_id text, gamepass_id text, primary_color text, text_color text, background_color text, show_grid boolean, verified_official boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT w.id, w.name, w.owner_id, w.roblox_group_id, w.gamepass_id, w.primary_color, w.text_color, w.background_color, w.show_grid, w.verified_official
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND (public.is_workspace_owner(w.id) OR public.is_workspace_member(w.id));
$function$;