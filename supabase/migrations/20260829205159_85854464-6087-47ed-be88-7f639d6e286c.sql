CREATE TABLE public.site_designs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target text not null default 'landing',
  ui_label text not null default 'Fluxcore',
  theme jsonb not null default '{}'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.site_designs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_designs TO authenticated;
GRANT ALL ON public.site_designs TO service_role;

ALTER TABLE public.site_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active designs"
ON public.site_designs FOR SELECT
USING (is_active = true OR public.is_fluxcore_staff());

CREATE POLICY "Staff can insert designs"
ON public.site_designs FOR INSERT TO authenticated
WITH CHECK (public.is_fluxcore_staff());

CREATE POLICY "Staff can update designs"
ON public.site_designs FOR UPDATE TO authenticated
USING (public.is_fluxcore_staff()) WITH CHECK (public.is_fluxcore_staff());

CREATE POLICY "Staff can delete designs"
ON public.site_designs FOR DELETE TO authenticated
USING (public.is_fluxcore_staff());

CREATE TRIGGER update_site_designs_updated_at
BEFORE UPDATE ON public.site_designs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();