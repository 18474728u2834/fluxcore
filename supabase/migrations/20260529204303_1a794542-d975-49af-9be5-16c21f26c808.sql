ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_reason TEXT;

DROP POLICY IF EXISTS "Staff can close workspaces" ON public.workspaces;
CREATE POLICY "Staff can close workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (has_staff_permission('delete_workspaces'))
WITH CHECK (has_staff_permission('delete_workspaces'));