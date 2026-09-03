-- 1) Re-link the caller's workspace_members rows to their current auth user
CREATE OR REPLACE FUNCTION public.sync_my_memberships()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  rbx text;
  n integer := 0;
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;

  SELECT v.roblox_user_id INTO rbx
  FROM public.verified_users v
  WHERE v.user_id = uid AND v.roblox_user_id IS NOT NULL AND v.roblox_user_id <> ''
  LIMIT 1;

  IF rbx IS NULL THEN RETURN 0; END IF;

  UPDATE public.workspace_members m
     SET user_id = uid,
         verified = true,
         updated_at = now()
   WHERE m.roblox_user_id = rbx
     AND m.user_id IS DISTINCT FROM uid;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_my_memberships() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_my_memberships() TO authenticated;

-- 2) Invite joins: trust the server-side verified Roblox identity, keep existing rank
CREATE OR REPLACE FUNCTION public.join_workspace_with_invite(code text, _roblox_username text DEFAULT NULL::text, _roblox_user_id text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ws public.workspaces%ROWTYPE;
  existing_id uuid;
  new_id uuid;
  uid uuid := auth.uid();
  rbx_id text;
  rbx_name text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO ws FROM public.workspaces WHERE invite_code = code;
  IF ws.id IS NULL THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  -- Prefer the verified identity on file over anything the client sends
  SELECT v.roblox_user_id, v.roblox_username INTO rbx_id, rbx_name
  FROM public.verified_users v WHERE v.user_id = uid LIMIT 1;

  rbx_id := COALESCE(NULLIF(rbx_id, ''), NULLIF(_roblox_user_id, ''), '0');
  rbx_name := COALESCE(NULLIF(rbx_name, ''), NULLIF(_roblox_username, ''), 'Unknown');

  IF EXISTS (
    SELECT 1 FROM public.workspace_blacklist b
    WHERE b.workspace_id = ws.id AND b.roblox_user_id = rbx_id
  ) THEN
    RAISE EXCEPTION 'blacklisted';
  END IF;

  -- Already a member under this login?
  SELECT id INTO existing_id FROM public.workspace_members
  WHERE workspace_id = ws.id AND user_id = uid
  LIMIT 1;
  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  -- Existing staff record for this Roblox account (group sync / old login): adopt it
  IF rbx_id <> '0' THEN
    UPDATE public.workspace_members
       SET user_id = uid,
           roblox_username = rbx_name,
           verified = true,
           updated_at = now()
     WHERE workspace_id = ws.id AND roblox_user_id = rbx_id
    RETURNING id INTO existing_id;
    IF existing_id IS NOT NULL THEN
      RETURN existing_id;
    END IF;
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, roblox_username, roblox_user_id, role, verified)
  VALUES (ws.id, uid, rbx_name, rbx_id, 'Member', rbx_id <> '0')
  ON CONFLICT (workspace_id, roblox_user_id) DO UPDATE
    SET user_id = EXCLUDED.user_id, verified = true, updated_at = now()
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 3) Repair rows currently attached to no account or a stale account
UPDATE public.workspace_members m
   SET user_id = v.user_id,
       verified = true,
       updated_at = now()
  FROM public.verified_users v
 WHERE v.roblox_user_id = m.roblox_user_id
   AND m.user_id IS DISTINCT FROM v.user_id;
