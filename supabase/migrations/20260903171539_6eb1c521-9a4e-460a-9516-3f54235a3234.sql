INSERT INTO public.verified_users (user_id, roblox_user_id, roblox_username, verified_at)
SELECT u.id,
       u.raw_user_meta_data->>'roblox_user_id',
       u.raw_user_meta_data->>'roblox_username',
       now()
FROM auth.users u
WHERE u.id = '40f664a1-006a-41e3-8854-84fd254c3fd1'::uuid
  AND u.raw_user_meta_data->>'roblox_user_id' = '3797048832'
  AND NOT EXISTS (
    SELECT 1 FROM public.verified_users v WHERE v.user_id = u.id
  );

UPDATE public.workspace_members
SET user_id = '40f664a1-006a-41e3-8854-84fd254c3fd1'::uuid,
    verified = true,
    updated_at = now()
WHERE roblox_user_id = '3797048832'
  AND user_id IS DISTINCT FROM '40f664a1-006a-41e3-8854-84fd254c3fd1'::uuid;