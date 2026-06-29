
CREATE TABLE public.discord_bot_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT,
  command TEXT NOT NULL,
  options JSONB,
  result TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discord_bot_logs TO authenticated;
GRANT ALL ON public.discord_bot_logs TO service_role;
ALTER TABLE public.discord_bot_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and managers can view bot logs"
ON public.discord_bot_logs FOR SELECT TO authenticated
USING (
  workspace_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    OR public.internal_member_has_permission(auth.uid(), workspace_id, 'manage_members')
  )
);
CREATE INDEX idx_discord_bot_logs_workspace_created ON public.discord_bot_logs(workspace_id, created_at DESC);
