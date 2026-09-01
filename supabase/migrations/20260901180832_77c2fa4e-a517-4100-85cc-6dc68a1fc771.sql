-- 1) Partner portals: limit public exposure to safe columns via a view
DROP POLICY IF EXISTS "Anyone can view portals" ON public.partner_portals;

CREATE POLICY "Members and staff view portals"
ON public.partner_portals FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id) OR public.is_fluxcore_staff());

CREATE OR REPLACE VIEW public.public_partner_portals
WITH (security_invoker = off) AS
SELECT id, subdomain, workspace_id, name, tagline, logo_url, accent_color,
       roblox_group_url, links, status, use_hyra_ui, auto_created, portal_theme
FROM public.partner_portals;

GRANT SELECT ON public.public_partner_portals TO anon, authenticated;

-- 2) workspace_members: no free self-join; require a valid invite code
DROP POLICY IF EXISTS "Users can join via invite" ON public.workspace_members;

CREATE OR REPLACE FUNCTION public.join_workspace_with_invite(
  code text,
  _roblox_username text DEFAULT NULL,
  _roblox_user_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws public.workspaces%ROWTYPE;
  existing_id uuid;
  new_id uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO ws FROM public.workspaces WHERE invite_code = code;
  IF ws.id IS NULL THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_blacklist b
    WHERE b.workspace_id = ws.id AND b.roblox_user_id = COALESCE(_roblox_user_id, '0')
  ) THEN
    RAISE EXCEPTION 'blacklisted';
  END IF;

  SELECT id INTO existing_id FROM public.workspace_members
  WHERE workspace_id = ws.id AND user_id = uid;
  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, roblox_username, roblox_user_id, role)
  VALUES (ws.id, uid, COALESCE(_roblox_username, 'Unknown'), COALESCE(_roblox_user_id, '0'), 'Member')
  ON CONFLICT (workspace_id, roblox_user_id) DO UPDATE SET user_id = EXCLUDED.user_id
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_workspace_with_invite(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.join_workspace_with_invite(text, text, text) TO authenticated;

-- 3) Server-issued Roblox verification challenges
CREATE TABLE IF NOT EXISTS public.roblox_verification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username_lower text NOT NULL,
  code text NOT NULL,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rvc_username ON public.roblox_verification_challenges (username_lower, created_at DESC);

GRANT ALL ON public.roblox_verification_challenges TO service_role;
ALTER TABLE public.roblox_verification_challenges ENABLE ROW LEVEL SECURITY;
-- No policies: only reachable through the edge function (service role)