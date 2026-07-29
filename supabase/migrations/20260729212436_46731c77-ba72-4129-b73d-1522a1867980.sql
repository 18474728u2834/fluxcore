CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "site_settings_staff_manage" ON public.site_settings;
CREATE POLICY "site_settings_staff_manage" ON public.site_settings FOR ALL TO authenticated
USING (public.has_staff_permission('manage_status'))
WITH CHECK (public.has_staff_permission('manage_status'));

GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;

INSERT INTO public.site_settings (key, value)
VALUES ('landing_theme', '{"theme":"classic"}'::jsonb)
ON CONFLICT (key) DO NOTHING;