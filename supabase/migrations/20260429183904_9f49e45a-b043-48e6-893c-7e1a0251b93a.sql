ALTER TABLE public.scheduled_sessions
  ADD COLUMN IF NOT EXISTS game_url text,
  ADD COLUMN IF NOT EXISTS role_labels jsonb;