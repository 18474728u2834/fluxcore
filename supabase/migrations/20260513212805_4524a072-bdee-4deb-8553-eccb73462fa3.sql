
CREATE TABLE public.account_removal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  target_username text,
  requested_by uuid NOT NULL,
  requested_by_username text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

CREATE UNIQUE INDEX account_removal_one_pending ON public.account_removal_requests (target_user_id) WHERE status = 'pending';

ALTER TABLE public.account_removal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Target user can view own removal requests"
  ON public.account_removal_requests FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());

CREATE POLICY "Target user can deny own pending request"
  ON public.account_removal_requests FOR UPDATE TO authenticated
  USING (target_user_id = auth.uid() AND status = 'pending')
  WITH CHECK (target_user_id = auth.uid() AND status IN ('denied','approved'));

CREATE POLICY "Staff can view all removal requests"
  ON public.account_removal_requests FOR SELECT TO authenticated
  USING (has_staff_permission('delete_users'));

CREATE POLICY "Staff can insert removal requests"
  ON public.account_removal_requests FOR INSERT TO authenticated
  WITH CHECK (has_staff_permission('delete_users') AND requested_by = auth.uid());

CREATE POLICY "Staff can delete removal requests"
  ON public.account_removal_requests FOR DELETE TO authenticated
  USING (has_staff_permission('delete_users'));
