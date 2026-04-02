
DROP POLICY IF EXISTS "Admin can update tickets" ON public.feedback_tickets;

CREATE POLICY "Creator can update own tickets" ON public.feedback_tickets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
