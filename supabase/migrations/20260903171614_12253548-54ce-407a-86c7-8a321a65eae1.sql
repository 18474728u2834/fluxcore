INSERT INTO public.workspace_members (
  id,
  workspace_id,
  user_id,
  roblox_user_id,
  roblox_username,
  role,
  verified,
  updated_at
)
VALUES (
  'a3f56ffa-d0a7-4083-ac97-51ef8e5edd8e'::uuid,
  '9f2c9234-c02f-492b-8121-74324e0df624'::uuid,
  '40f664a1-006a-41e3-8854-84fd254c3fd1'::uuid,
  '3797048832',
  'jackk_inspired',
  'Human Resources Director',
  true,
  now()
)
ON CONFLICT (workspace_id, roblox_user_id)
DO UPDATE SET
  user_id = EXCLUDED.user_id,
  roblox_username = EXCLUDED.roblox_username,
  role = EXCLUDED.role,
  verified = true,
  updated_at = now();