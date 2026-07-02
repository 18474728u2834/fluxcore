
-- 1. partner_portals: hide workspace_id / created_by from anonymous readers
REVOKE SELECT ON public.partner_portals FROM anon;
GRANT SELECT (
  id, subdomain, name, tagline, logo_url, accent_color, roblox_group_url,
  links, status, closed_reason, created_at, updated_at, use_hyra_ui,
  auto_created, last_active_at, portal_theme
) ON public.partner_portals TO anon;

-- 2. premium_grants: restrict token visibility to owner admins only
DROP POLICY IF EXISTS "Staff manage grants" ON public.premium_grants;
CREATE POLICY "Owner admins read grants" ON public.premium_grants
  FOR SELECT TO authenticated
  USING (public.is_staff_owner_admin());
CREATE POLICY "Staff insert grants" ON public.premium_grants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_fluxcore_staff() AND created_by = auth.uid());
CREATE POLICY "Staff update grants" ON public.premium_grants
  FOR UPDATE TO authenticated
  USING (public.is_fluxcore_staff())
  WITH CHECK (public.is_fluxcore_staff());
CREATE POLICY "Staff delete grants" ON public.premium_grants
  FOR DELETE TO authenticated
  USING (public.is_fluxcore_staff());

-- 3. newsletter_subscribers: replace WITH CHECK (true) with a real email check
DROP POLICY IF EXISTS "anyone_can_subscribe" ON public.newsletter_subscribers;
CREATE POLICY "anyone_can_subscribe" ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- 4. Set search_path on utility functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.internal_answer_matches(text, text, text) SET search_path = public;
