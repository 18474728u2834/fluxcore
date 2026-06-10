GRANT SELECT ON public.site_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_banners TO authenticated;
GRANT ALL ON public.site_banners TO service_role;

GRANT SELECT ON public.status_components TO anon, authenticated;
GRANT SELECT ON public.status_checks TO anon, authenticated;
GRANT SELECT ON public.status_incidents TO anon, authenticated;
GRANT SELECT ON public.status_incident_components TO anon, authenticated;
GRANT SELECT ON public.status_incident_updates TO anon, authenticated;
GRANT SELECT ON public.status_maintenance TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.status_components, public.status_incidents, public.status_incident_components, public.status_incident_updates, public.status_maintenance TO authenticated;
GRANT ALL ON public.status_components, public.status_checks, public.status_incidents, public.status_incident_components, public.status_incident_updates, public.status_maintenance TO service_role;