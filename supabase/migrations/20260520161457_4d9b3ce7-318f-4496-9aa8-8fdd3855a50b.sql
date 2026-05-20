
CREATE TABLE public.user_birthdays (
  user_id uuid PRIMARY KEY,
  birthday_month smallint NOT NULL,
  birthday_day smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_birthdays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own birthday"
ON public.user_birthdays FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Workspace members view birthdays of co-members"
ON public.user_birthdays FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members me
    JOIN public.workspace_members them ON them.workspace_id = me.workspace_id
    WHERE me.user_id = auth.uid() AND them.user_id = user_birthdays.user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspaces w
    JOIN public.workspace_members wm ON wm.workspace_id = w.id
    WHERE w.owner_id = user_birthdays.user_id AND wm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspaces w
    JOIN public.workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = user_birthdays.user_id AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Users insert own birthday"
ON public.user_birthdays FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own birthday"
ON public.user_birthdays FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
