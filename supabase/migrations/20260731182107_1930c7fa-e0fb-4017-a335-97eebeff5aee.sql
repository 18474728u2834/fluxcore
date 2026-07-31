ALTER TABLE public.scheduled_sessions
  ADD COLUMN IF NOT EXISTS route_number text,
  ADD COLUMN IF NOT EXISTS aircraft_model text,
  ADD COLUMN IF NOT EXISTS tail_number text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS destination text;