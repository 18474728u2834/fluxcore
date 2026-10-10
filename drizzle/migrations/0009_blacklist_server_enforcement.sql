create or replace function public.is_fluxcore_blacklisted()
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.fluxcore_blacklist b
    where b.roblox_user_id in (
      select vu.roblox_user_id from public.verified_users vu where vu.user_id = auth.uid()
      union
      select coalesce(u.raw_app_meta_data->>'roblox_user_id', u.raw_user_meta_data->>'roblox_user_id')
        from auth.users u where u.id = auth.uid()
    )
  )
$$;
revoke all on function public.is_fluxcore_blacklisted() from public, anon;
grant execute on function public.is_fluxcore_blacklisted() to authenticated;

create or replace function public.my_blacklist_status()
returns table(reason text, created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select b.reason, b.created_at from public.fluxcore_blacklist b
  where b.roblox_user_id in (
    select vu.roblox_user_id from public.verified_users vu where vu.user_id = auth.uid()
    union
    select coalesce(u.raw_app_meta_data->>'roblox_user_id', u.raw_user_meta_data->>'roblox_user_id')
      from auth.users u where u.id = auth.uid()
  )
  limit 1
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT NOT public.is_fluxcore_blacklisted() AND EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT NOT public.is_fluxcore_blacklisted() AND EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = _workspace_id AND owner_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_workspace_permission(_workspace_id uuid, _permission text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT NOT public.is_fluxcore_blacklisted() AND (EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    LEFT JOIN public.workspace_permissions wp
      ON wp.member_id = wm.id AND wp.workspace_id = wm.workspace_id AND wp.permission = _permission
    LEFT JOIN public.workspace_roles wr
      ON wr.id = wm.role_id AND wr.workspace_id = wm.workspace_id
    WHERE wm.workspace_id = _workspace_id
      AND wm.user_id = auth.uid()
      AND (wp.id IS NOT NULL OR COALESCE(wr.permissions, '[]'::jsonb) ? _permission)
  )
  OR public.is_workspace_owner(_workspace_id));
$function$;