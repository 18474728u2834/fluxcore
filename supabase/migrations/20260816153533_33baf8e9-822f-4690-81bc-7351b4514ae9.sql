GRANT SELECT ON public.partner_portals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_portals TO authenticated;
GRANT ALL ON public.partner_portals TO service_role;