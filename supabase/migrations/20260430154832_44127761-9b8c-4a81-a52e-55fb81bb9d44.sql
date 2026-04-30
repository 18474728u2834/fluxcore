-- Owner-configurable AFK confirmation timeout (seconds). 0/null = disabled.
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS afk_confirm_seconds INTEGER DEFAULT 0;

-- Track when AFK prompts have been issued and whether the session was discarded.
ALTER TABLE public.activity_sessions
  ADD COLUMN IF NOT EXISTS afk_prompt_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS afk_confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS discarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discard_reason TEXT;

-- Allow workspace owners (and members with manage_members) to edit / delete sessions.
DROP POLICY IF EXISTS "Owners can update sessions" ON public.activity_sessions;
CREATE POLICY "Owners can update sessions"
ON public.activity_sessions
FOR UPDATE
TO authenticated
USING (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'))
WITH CHECK (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'));

DROP POLICY IF EXISTS "Owners can delete sessions" ON public.activity_sessions;
CREATE POLICY "Owners can delete sessions"
ON public.activity_sessions
FOR DELETE
TO authenticated
USING (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'));

DROP POLICY IF EXISTS "Owners can insert sessions" ON public.activity_sessions;
CREATE POLICY "Owners can insert sessions"
ON public.activity_sessions
FOR INSERT
TO authenticated
WITH CHECK (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'));