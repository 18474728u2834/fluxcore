CREATE TABLE public.partner_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain text NOT NULL UNIQUE,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  tagline text,
  logo_url text,
  accent_color text DEFAULT '#10b981',
  roblox_group_url text,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  closed_reason text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_portals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_portals TO authenticated;
GRANT ALL ON public.partner_portals TO service_role;

ALTER TABLE public.partner_portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portals"
  ON public.partner_portals FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert portals"
  ON public.partner_portals FOR INSERT TO authenticated
  WITH CHECK (public.is_fluxcore_staff() AND created_by = auth.uid());

CREATE POLICY "Staff can update portals"
  ON public.partner_portals FOR UPDATE TO authenticated
  USING (public.is_fluxcore_staff())
  WITH CHECK (public.is_fluxcore_staff());

CREATE POLICY "Staff can delete portals"
  ON public.partner_portals FOR DELETE TO authenticated
  USING (public.is_fluxcore_staff());

CREATE TRIGGER set_partner_portals_updated_at
  BEFORE UPDATE ON public.partner_portals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_partner_portals_subdomain ON public.partner_portals(lower(subdomain));