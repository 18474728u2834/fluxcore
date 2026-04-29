-- Premium grants created by Fluxcore staff
CREATE TABLE public.premium_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
  label text,
  days integer NOT NULL DEFAULT 7,
  max_uses integer NOT NULL DEFAULT 1,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_grants ENABLE ROW LEVEL SECURITY;

-- Fluxcore staff can do anything
CREATE POLICY "Staff manage grants"
ON public.premium_grants FOR ALL
TO authenticated
USING (public.is_fluxcore_staff())
WITH CHECK (public.is_fluxcore_staff() AND created_by = auth.uid());

-- Anyone authenticated can read a grant they have a token for (RLS still on; we filter by token in query)
CREATE POLICY "Anyone authenticated can view grants"
ON public.premium_grants FOR SELECT
TO authenticated
USING (true);

-- Claims log
CREATE TABLE public.premium_grant_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL REFERENCES public.premium_grants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  workspace_id uuid,
  days integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grant_id, user_id)
);

ALTER TABLE public.premium_grant_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own claims"
ON public.premium_grant_claims FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_fluxcore_staff());

CREATE POLICY "User can claim"
ON public.premium_grant_claims FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Atomic claim function: validates grant, increments uses, records claim, returns days
CREATE OR REPLACE FUNCTION public.claim_premium_grant(_token text)
RETURNS TABLE(days integer, grant_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g record;
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO g FROM public.premium_grants WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  IF g.expires_at IS NOT NULL AND g.expires_at < now() THEN
    RAISE EXCEPTION 'expired';
  END IF;

  IF g.uses >= g.max_uses THEN
    RAISE EXCEPTION 'used_up';
  END IF;

  -- Already claimed by this user? return existing
  IF EXISTS (SELECT 1 FROM public.premium_grant_claims WHERE grant_id = g.id AND user_id = uid) THEN
    RETURN QUERY SELECT g.days, g.id;
    RETURN;
  END IF;

  INSERT INTO public.premium_grant_claims (grant_id, user_id, days)
  VALUES (g.id, uid, g.days);

  UPDATE public.premium_grants SET uses = uses + 1 WHERE id = g.id;

  RETURN QUERY SELECT g.days, g.id;
END;
$$;

-- Apply the claim to a workspace owned by the caller
CREATE OR REPLACE FUNCTION public.apply_grant_to_workspace(_grant_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  d integer;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Must be owner of workspace
  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = _workspace_id AND owner_id = uid) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  -- Must own the claim and it must not have been applied yet
  SELECT days INTO d
  FROM public.premium_grant_claims
  WHERE grant_id = _grant_id AND user_id = uid AND workspace_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_unapplied_claim';
  END IF;

  UPDATE public.workspaces
  SET premium = true,
      premium_until = GREATEST(COALESCE(premium_until, now()), now()) + (d || ' days')::interval
  WHERE id = _workspace_id;

  UPDATE public.premium_grant_claims
  SET workspace_id = _workspace_id
  WHERE grant_id = _grant_id AND user_id = uid;

  RETURN true;
END;
$$;