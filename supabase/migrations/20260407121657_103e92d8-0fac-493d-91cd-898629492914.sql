
-- Add workspace settings columns
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS discord_webhook_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS message_logger_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_rank_enabled boolean DEFAULT false;

-- Add Roblox role ID mapping to workspace roles
ALTER TABLE public.workspace_roles
  ADD COLUMN IF NOT EXISTS roblox_role_id text DEFAULT NULL;

-- Support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  roblox_username text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  assigned_to text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Support ticket messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  roblox_username text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages on own tickets"
  ON public.support_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id AND st.user_id = auth.uid()
  ));

CREATE POLICY "Users can add messages to own tickets"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id AND st.user_id = auth.uid()
  ));
