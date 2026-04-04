
-- Add customization and API columns to workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#7c3aed';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#ffffff';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS roblox_api_key text;

-- Create workspace_roles table
CREATE TABLE public.workspace_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  position integer NOT NULL DEFAULT 0,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view roles" ON public.workspace_roles
  FOR SELECT TO authenticated
  USING (is_workspace_owner(workspace_id) OR is_workspace_member(workspace_id));

CREATE POLICY "Owners manage roles" ON public.workspace_roles
  FOR ALL TO authenticated
  USING (is_workspace_owner(workspace_id))
  WITH CHECK (is_workspace_owner(workspace_id));

-- Add role_id to workspace_members
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.workspace_roles(id) ON DELETE SET NULL;

-- Create workspace_quotas table
CREATE TABLE public.workspace_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  quota_type text NOT NULL DEFAULT 'sessions',
  target_value integer NOT NULL DEFAULT 1,
  period text NOT NULL DEFAULT 'weekly',
  role_id uuid REFERENCES public.workspace_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view quotas" ON public.workspace_quotas
  FOR SELECT TO authenticated
  USING (is_workspace_owner(workspace_id) OR is_workspace_member(workspace_id));

CREATE POLICY "Owners manage quotas" ON public.workspace_quotas
  FOR ALL TO authenticated
  USING (is_workspace_owner(workspace_id))
  WITH CHECK (is_workspace_owner(workspace_id));

-- Enable realtime for workspace_roles
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_roles;
