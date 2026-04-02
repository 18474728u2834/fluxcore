
-- Fix workspace visibility: replace overly permissive policy
DROP POLICY IF EXISTS "Anyone can lookup by invite code" ON public.workspaces;

CREATE POLICY "Members can view workspace" ON public.workspaces
  FOR SELECT TO authenticated
  USING (is_workspace_owner(id) OR is_workspace_member(id));

-- Function to lookup workspace by invite code (bypasses RLS)
CREATE OR REPLACE FUNCTION public.lookup_workspace_by_invite(code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.name FROM public.workspaces w WHERE w.invite_code = code LIMIT 1;
$$;

-- Feedback system
CREATE TABLE public.feedback_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  roblox_username text NOT NULL,
  type text NOT NULL DEFAULT 'bug',
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tickets" ON public.feedback_tickets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create tickets" ON public.feedback_tickets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can update tickets" ON public.feedback_tickets
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.feedback_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  roblox_username text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view messages" ON public.feedback_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can post messages" ON public.feedback_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
