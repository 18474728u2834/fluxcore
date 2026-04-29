ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until timestamptz,
  ADD COLUMN IF NOT EXISTS tutorial_completed boolean NOT NULL DEFAULT false;