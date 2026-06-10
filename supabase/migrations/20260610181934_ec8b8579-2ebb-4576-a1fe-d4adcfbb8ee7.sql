
-- Status page + banner schema

CREATE TABLE public.status_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  check_url text,
  sort_order integer NOT NULL DEFAULT 0,
  current_status text NOT NULL DEFAULT 'operational',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.status_components TO anon, authenticated;
GRANT ALL ON public.status_components TO service_role;
ALTER TABLE public.status_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Status components are publicly readable"
  ON public.status_components FOR SELECT USING (true);
CREATE POLICY "Status admins manage components"
  ON public.status_components FOR ALL TO authenticated
  USING (public.has_staff_permission('manage_status'))
  WITH CHECK (public.has_staff_permission('manage_status'));

CREATE TABLE public.status_checks (
  id bigserial PRIMARY KEY,
  component_id uuid NOT NULL REFERENCES public.status_components(id) ON DELETE CASCADE,
  status text NOT NULL,
  latency_ms integer,
  checked_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'auto'
);
CREATE INDEX status_checks_component_time_idx ON public.status_checks (component_id, checked_at DESC);
GRANT SELECT ON public.status_checks TO anon, authenticated;
GRANT ALL ON public.status_checks TO service_role;
ALTER TABLE public.status_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Checks are publicly readable" ON public.status_checks FOR SELECT USING (true);
CREATE POLICY "Status admins insert checks"
  ON public.status_checks FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission('manage_status'));

CREATE TABLE public.status_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'investigating',
  severity text NOT NULL DEFAULT 'minor',
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.status_incidents TO anon, authenticated;
GRANT ALL ON public.status_incidents TO service_role;
ALTER TABLE public.status_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Incidents publicly readable" ON public.status_incidents FOR SELECT USING (true);
CREATE POLICY "Status admins manage incidents"
  ON public.status_incidents FOR ALL TO authenticated
  USING (public.has_staff_permission('manage_status'))
  WITH CHECK (public.has_staff_permission('manage_status'));

CREATE TABLE public.status_incident_components (
  incident_id uuid NOT NULL REFERENCES public.status_incidents(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.status_components(id) ON DELETE CASCADE,
  affected_status text NOT NULL DEFAULT 'degraded_performance',
  PRIMARY KEY (incident_id, component_id)
);
GRANT SELECT ON public.status_incident_components TO anon, authenticated;
GRANT ALL ON public.status_incident_components TO service_role;
ALTER TABLE public.status_incident_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Incident components readable" ON public.status_incident_components FOR SELECT USING (true);
CREATE POLICY "Status admins manage incident components"
  ON public.status_incident_components FOR ALL TO authenticated
  USING (public.has_staff_permission('manage_status'))
  WITH CHECK (public.has_staff_permission('manage_status'));

CREATE TABLE public.status_incident_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.status_incidents(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.status_incident_updates TO anon, authenticated;
GRANT ALL ON public.status_incident_updates TO service_role;
ALTER TABLE public.status_incident_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Incident updates readable" ON public.status_incident_updates FOR SELECT USING (true);
CREATE POLICY "Status admins manage incident updates"
  ON public.status_incident_updates FOR ALL TO authenticated
  USING (public.has_staff_permission('manage_status'))
  WITH CHECK (public.has_staff_permission('manage_status'));

CREATE TABLE public.status_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.status_maintenance TO anon, authenticated;
GRANT ALL ON public.status_maintenance TO service_role;
ALTER TABLE public.status_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Maintenance publicly readable" ON public.status_maintenance FOR SELECT USING (true);
CREATE POLICY "Status admins manage maintenance"
  ON public.status_maintenance FOR ALL TO authenticated
  USING (public.has_staff_permission('manage_status'))
  WITH CHECK (public.has_staff_permission('manage_status'));

CREATE TABLE public.site_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  link_url text,
  link_label text,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  placement text NOT NULL DEFAULT 'marketing',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_banners TO anon, authenticated;
GRANT ALL ON public.site_banners TO service_role;
ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banners publicly readable" ON public.site_banners FOR SELECT USING (true);
CREATE POLICY "Status admins manage banners"
  ON public.site_banners FOR ALL TO authenticated
  USING (public.has_staff_permission('manage_status'))
  WITH CHECK (public.has_staff_permission('manage_status'));

CREATE TRIGGER status_components_updated BEFORE UPDATE ON public.status_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER status_incidents_updated BEFORE UPDATE ON public.status_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER status_maintenance_updated BEFORE UPDATE ON public.status_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER site_banners_updated BEFORE UPDATE ON public.site_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default components
INSERT INTO public.status_components (name, slug, description, check_url, sort_order) VALUES
  ('Marketing Site', 'web', 'fluxcore.works landing & docs', 'https://fluxcore.works', 1),
  ('Dashboard (Nexus UI)', 'dashboard', 'Workspace dashboards & admin panels', 'https://fluxcore.works', 2),
  ('Auth & API', 'auth-api', 'Roblox OAuth, Lovable Cloud API, edge functions', NULL, 3),
  ('Roblox Sync', 'roblox-sync', 'Group ranking, activity tracker beacons', NULL, 4),
  ('Discord Integrations', 'discord', 'Webhook delivery & session reminders', NULL, 5);
