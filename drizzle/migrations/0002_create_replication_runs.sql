CREATE TABLE public.replication_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  tables_copied integer NOT NULL DEFAULT 0,
  rows_copied integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error text
);

GRANT ALL ON public.replication_runs TO service_role;
GRANT SELECT ON public.replication_runs TO authenticated;

ALTER TABLE public.replication_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fluxcore staff can read replication runs"
  ON public.replication_runs FOR SELECT
  TO authenticated
  USING (public.is_staff_admin());
