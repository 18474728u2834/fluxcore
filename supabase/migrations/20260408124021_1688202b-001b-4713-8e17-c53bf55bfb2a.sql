
DROP FUNCTION IF EXISTS public.get_workspace_context(uuid);

CREATE FUNCTION public.get_workspace_context(_workspace_id uuid)
 RETURNS TABLE(id uuid, name text, owner_id uuid, roblox_group_id text, gamepass_id text, primary_color text, text_color text, background_color text, show_grid boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT w.id, w.name, w.owner_id, w.roblox_group_id, w.gamepass_id, w.primary_color, w.text_color, w.background_color, w.show_grid
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND (public.is_workspace_owner(w.id) OR public.is_workspace_member(w.id));
$$;
