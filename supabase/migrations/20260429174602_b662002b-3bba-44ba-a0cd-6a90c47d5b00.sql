CREATE OR REPLACE FUNCTION public.is_fluxcore_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.verified_users
    WHERE user_id = auth.uid()
      AND lower(roblox_username) = 'novavoff'
  );
$$;

CREATE POLICY "Staff can view all tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (public.is_fluxcore_staff());

CREATE POLICY "Staff can update all tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (public.is_fluxcore_staff())
WITH CHECK (public.is_fluxcore_staff());

CREATE POLICY "Staff can view all messages"
ON public.support_messages FOR SELECT TO authenticated
USING (public.is_fluxcore_staff());

CREATE POLICY "Staff can reply to any ticket"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (public.is_fluxcore_staff() AND user_id = auth.uid());