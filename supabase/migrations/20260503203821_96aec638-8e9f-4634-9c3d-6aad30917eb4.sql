ALTER TABLE public.scheduled_sessions
ADD COLUMN IF NOT EXISTS occurrence_assignments jsonb NOT NULL DEFAULT '{}'::jsonb;