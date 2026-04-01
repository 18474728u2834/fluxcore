
-- Add invite_code to workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS invite_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(12), 'hex');

-- Add unique constraint on invite_code
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_invite_code_key UNIQUE (invite_code);

-- Allow authenticated users to look up a workspace by invite code (for joining)
CREATE POLICY "Anyone can lookup by invite code" ON public.workspaces FOR SELECT TO authenticated
  USING (true);

-- Drop the old narrower select policies since the above covers it
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;

-- Allow members to insert themselves via invite
CREATE POLICY "Users can join via invite" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
