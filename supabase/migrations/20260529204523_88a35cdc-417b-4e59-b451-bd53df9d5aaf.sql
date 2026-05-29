ALTER TABLE public.partner_portals DROP CONSTRAINT IF EXISTS partner_portals_portal_theme_check;
ALTER TABLE public.partner_portals
  ADD CONSTRAINT partner_portals_portal_theme_check
  CHECK (portal_theme IN ('classic','bargains','almore','shoply'));