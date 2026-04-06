
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#0f0f11';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS show_grid boolean DEFAULT true;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS release_version text DEFAULT '';
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS roblox_group_rank integer;
ALTER TABLE public.activity_sessions ADD COLUMN IF NOT EXISTS message_count integer DEFAULT 0;
ALTER TABLE public.activity_sessions ADD COLUMN IF NOT EXISTS idle_seconds integer DEFAULT 0;
