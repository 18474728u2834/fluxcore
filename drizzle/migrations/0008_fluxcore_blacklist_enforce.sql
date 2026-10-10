create or replace function public.my_blacklist_status()
returns table(reason text, created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select b.reason, b.created_at from public.fluxcore_blacklist b
  join public.verified_users vu on vu.roblox_user_id = b.roblox_user_id
  where vu.user_id = auth.uid()
  limit 1
$$;
revoke all on function public.my_blacklist_status() from public, anon;
grant execute on function public.my_blacklist_status() to authenticated;

CREATE OR REPLACE FUNCTION public.get_accessible_workspaces()
 RETURNS TABLE(id uuid, name text, role text, owner_id uuid, primary_color text, text_color text, background_color text, show_grid boolean, roblox_group_id text, verified_official boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT * FROM (
    SELECT w.id, w.name, 'Owner'::text AS role, w.owner_id, w.primary_color, w.text_color, w.background_color, w.show_grid, w.roblox_group_id, w.verified_official
    FROM public.workspaces w WHERE w.owner_id = auth.uid()
    UNION
    SELECT w.id, w.name, wm.role, w.owner_id, w.primary_color, w.text_color, w.background_color, w.show_grid, w.roblox_group_id, w.verified_official
    FROM public.workspace_members wm JOIN public.workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ) x
  WHERE NOT EXISTS (SELECT 1 FROM public.my_blacklist_status());
$function$;