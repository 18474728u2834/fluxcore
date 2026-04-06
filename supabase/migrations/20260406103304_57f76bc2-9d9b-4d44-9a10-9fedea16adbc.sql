
DROP FUNCTION IF EXISTS public.get_accessible_workspaces();
CREATE FUNCTION public.get_accessible_workspaces()
RETURNS TABLE(id uuid, name text, role text, owner_id uuid, primary_color text, text_color text, background_color text, show_grid boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT w.id, w.name, 'Owner'::text AS role, w.owner_id, w.primary_color, w.text_color, w.background_color, w.show_grid
  FROM public.workspaces w WHERE w.owner_id = auth.uid()
  UNION
  SELECT w.id, w.name, wm.role, w.owner_id, w.primary_color, w.text_color, w.background_color, w.show_grid
  FROM public.workspace_members wm JOIN public.workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = auth.uid();
$$;
