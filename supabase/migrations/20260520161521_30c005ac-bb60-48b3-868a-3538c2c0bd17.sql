
CREATE OR REPLACE FUNCTION public.get_workspace_owner_info(_workspace_id uuid)
RETURNS TABLE(owner_id uuid, roblox_username text, roblox_user_id text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT w.owner_id, vu.roblox_username, vu.roblox_user_id
  FROM public.workspaces w
  LEFT JOIN public.verified_users vu ON vu.user_id = w.owner_id
  WHERE w.id = _workspace_id
    AND (public.is_workspace_owner(w.id) OR public.is_workspace_member(w.id));
$$;
