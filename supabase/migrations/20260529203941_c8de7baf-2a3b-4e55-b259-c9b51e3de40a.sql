ALTER TABLE public.partner_portals
  ADD COLUMN IF NOT EXISTS portal_theme TEXT NOT NULL DEFAULT 'classic'
  CHECK (portal_theme IN ('classic','bargains','almore'));