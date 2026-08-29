CREATE TABLE public.nexus_v3_trials (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nexus_v3_trials TO authenticated;
GRANT ALL ON public.nexus_v3_trials TO service_role;

ALTER TABLE public.nexus_v3_trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members and staff can view trial access"
ON public.nexus_v3_trials FOR SELECT TO authenticated
USING (
  public.is_staff_admin()
  OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = nexus_v3_trials.workspace_id AND w.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = nexus_v3_trials.workspace_id AND m.user_id = auth.uid())
);

CREATE POLICY "Staff admins manage trial access"
ON public.nexus_v3_trials FOR ALL TO authenticated
USING (public.is_staff_admin())
WITH CHECK (public.is_staff_admin());