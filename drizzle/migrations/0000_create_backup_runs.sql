CREATE TABLE public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  file_path text,
  size_bytes bigint,
  row_count integer,
  table_counts jsonb,
  status text NOT NULL DEFAULT 'ok',
  error text,
  duration_ms integer
);

GRANT SELECT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;

ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff with manage_status can view backup runs"
ON public.backup_runs
FOR SELECT
TO authenticated
USING (public.has_staff_permission('manage_status'));

CREATE INDEX backup_runs_created_at_idx ON public.backup_runs (created_at DESC);