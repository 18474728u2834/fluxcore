DROP VIEW IF EXISTS public.public_partner_portals;

DROP POLICY IF EXISTS "Members and staff view portals" ON public.partner_portals;
CREATE POLICY "Anyone can view portals" ON public.partner_portals FOR SELECT USING (true);

REVOKE SELECT ON public.partner_portals FROM anon, authenticated;
GRANT SELECT (id, subdomain, workspace_id, name, tagline, logo_url, accent_color,
              roblox_group_url, links, status, closed_reason, use_hyra_ui, auto_created,
              portal_theme, last_active_at, created_at, updated_at)
ON public.partner_portals TO anon, authenticated;
GRANT ALL ON public.partner_portals TO service_role;