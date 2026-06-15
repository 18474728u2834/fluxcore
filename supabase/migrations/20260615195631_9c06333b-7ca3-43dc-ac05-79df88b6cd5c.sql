
-- ============ KUDOS ============
CREATE TABLE public.kudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  from_member_id uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  to_member_id uuid NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  from_name text NOT NULL,
  to_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX kudos_workspace_created_idx ON public.kudos (workspace_id, created_at DESC);
CREATE INDEX kudos_to_member_idx ON public.kudos (to_member_id);
CREATE INDEX kudos_week_idx ON public.kudos (workspace_id, to_member_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kudos TO authenticated;
GRANT ALL ON public.kudos TO service_role;

ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read kudos"
  ON public.kudos FOR SELECT TO authenticated
  USING (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can post kudos"
  ON public.kudos FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id))
  );

CREATE POLICY "Senders or owners can delete kudos"
  ON public.kudos FOR DELETE TO authenticated
  USING (from_user_id = auth.uid() OR public.is_workspace_owner(workspace_id));

-- ============ PROMOTION NOMINATIONS ============
CREATE TABLE public.promotion_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nominee_member_id uuid NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  nominator_user_id uuid NOT NULL,
  nominator_member_id uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  nominee_name text NOT NULL,
  nominator_name text NOT NULL,
  reason text NOT NULL,
  suggested_rank text,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_by_name text,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX promo_nom_workspace_status_idx ON public.promotion_nominations (workspace_id, status, created_at DESC);
CREATE INDEX promo_nom_nominee_idx ON public.promotion_nominations (nominee_member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotion_nominations TO authenticated;
GRANT ALL ON public.promotion_nominations TO service_role;

ALTER TABLE public.promotion_nominations ENABLE ROW LEVEL SECURITY;

-- Reviewers (owner / promote_members / manage_members) see all; nominators see their own; nominees see their own.
CREATE POLICY "View promotion nominations"
  ON public.promotion_nominations FOR SELECT TO authenticated
  USING (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'promote_members')
    OR public.has_workspace_permission(workspace_id, 'manage_members')
    OR nominator_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.id = nominee_member_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can nominate"
  ON public.promotion_nominations FOR INSERT TO authenticated
  WITH CHECK (
    nominator_user_id = auth.uid()
    AND (public.is_workspace_owner(workspace_id) OR public.is_workspace_member(workspace_id))
  );

CREATE POLICY "Reviewers update nominations"
  ON public.promotion_nominations FOR UPDATE TO authenticated
  USING (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'promote_members')
    OR public.has_workspace_permission(workspace_id, 'manage_members')
  )
  WITH CHECK (
    public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'promote_members')
    OR public.has_workspace_permission(workspace_id, 'manage_members')
  );

CREATE POLICY "Nominator or reviewer can delete"
  ON public.promotion_nominations FOR DELETE TO authenticated
  USING (
    nominator_user_id = auth.uid()
    OR public.is_workspace_owner(workspace_id)
    OR public.has_workspace_permission(workspace_id, 'manage_members')
  );
