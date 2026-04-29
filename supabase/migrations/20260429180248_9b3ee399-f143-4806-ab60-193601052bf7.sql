DROP FUNCTION IF EXISTS public.get_workspace_context(uuid);

CREATE OR REPLACE FUNCTION public.get_workspace_context(_workspace_id uuid)
 RETURNS TABLE(id uuid, name text, owner_id uuid, roblox_group_id text, gamepass_id text, primary_color text, text_color text, background_color text, show_grid boolean, verified_official boolean, premium boolean, premium_until timestamptz, tutorial_completed boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT w.id, w.name, w.owner_id, w.roblox_group_id, w.gamepass_id, w.primary_color, w.text_color, w.background_color, w.show_grid, w.verified_official, w.premium, w.premium_until, w.tutorial_completed
  FROM public.workspaces w
  WHERE w.id = _workspace_id
    AND (public.is_workspace_owner(w.id) OR public.is_workspace_member(w.id));
$function$;