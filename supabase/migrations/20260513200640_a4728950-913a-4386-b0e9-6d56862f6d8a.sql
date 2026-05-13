
CREATE TABLE public.fluxcore_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roblox_user_id text NOT NULL UNIQUE,
  roblox_username text NOT NULL,
  reason text,
  blacklisted_by uuid NOT NULL,
  blacklisted_by_username text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fluxcore_blacklist ENABLE ROW LEVEL SECURITY;

-- Any signed-in user may check whether THEIR linked Roblox account is on the list
CREATE POLICY "Users can check own blacklist status"
ON public.fluxcore_blacklist
FOR SELECT
TO authenticated
USING (
  roblox_user_id IN (
    SELECT vu.roblox_user_id FROM public.verified_users vu WHERE vu.user_id = auth.uid()
  )
);

-- Staff with manage_blacklist permission can read all entries
CREATE POLICY "Staff can view blacklist"
ON public.fluxcore_blacklist
FOR SELECT
TO authenticated
USING (public.has_staff_permission('manage_blacklist'));

-- Staff with manage_blacklist permission can add entries
CREATE POLICY "Staff can add blacklist"
ON public.fluxcore_blacklist
FOR INSERT
TO authenticated
WITH CHECK (public.has_staff_permission('manage_blacklist') AND blacklisted_by = auth.uid());

-- Staff with manage_blacklist permission can remove entries
CREATE POLICY "Staff can remove blacklist"
ON public.fluxcore_blacklist
FOR DELETE
TO authenticated
USING (public.has_staff_permission('manage_blacklist'));

CREATE INDEX idx_fluxcore_blacklist_roblox_user_id ON public.fluxcore_blacklist(roblox_user_id);
