CREATE POLICY "Blacklisted users cannot create workspaces"
ON public.workspaces AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT public.is_fluxcore_blacklisted());

CREATE POLICY "Blacklisted users cannot join workspaces"
ON public.workspace_members AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT public.is_fluxcore_blacklisted());

CREATE OR REPLACE FUNCTION public.join_workspace_with_invite(code text, _roblox_username text DEFAULT NULL::text, _roblox_user_id text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  ws public.workspaces%ROWTYPE;
  existing_id uuid;
  new_id uuid;
  uid uuid := auth.uid();
  rbx_id text;
  rbx_name text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF public.is_fluxcore_blacklisted() THEN RAISE EXCEPTION 'blacklisted'; END IF;

  SELECT * INTO ws FROM public.workspaces WHERE invite_code = code;
  IF ws.id IS NULL THEN RAISE EXCEPTION 'invalid_invite'; END IF;

  SELECT v.roblox_user_id, v.roblox_username INTO rbx_id, rbx_name
  FROM public.verified_users v WHERE v.user_id = uid LIMIT 1;

  rbx_id := COALESCE(NULLIF(rbx_id, ''), NULLIF(_roblox_user_id, ''), '0');
  rbx_name := COALESCE(NULLIF(rbx_name, ''), NULLIF(_roblox_username, ''), 'Unknown');

  IF EXISTS (SELECT 1 FROM public.workspace_blacklist b WHERE b.workspace_id = ws.id AND b.roblox_user_id = rbx_id) THEN
    RAISE EXCEPTION 'blacklisted';
  END IF;

  SELECT id INTO existing_id FROM public.workspace_members WHERE workspace_id = ws.id AND user_id = uid LIMIT 1;
  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;

  IF rbx_id <> '0' THEN
    UPDATE public.workspace_members
       SET user_id = uid, roblox_username = rbx_name, verified = true, updated_at = now()
     WHERE workspace_id = ws.id AND roblox_user_id = rbx_id
    RETURNING id INTO existing_id;
    IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, roblox_username, roblox_user_id, role, verified)
  VALUES (ws.id, uid, rbx_name, rbx_id, 'Member', rbx_id <> '0')
  ON CONFLICT (workspace_id, roblox_user_id) DO UPDATE SET user_id = EXCLUDED.user_id, verified = true, updated_at = now()
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$function$;