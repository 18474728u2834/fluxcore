ALTER TABLE public.webhook_templates
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS embeds jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS advanced_mode boolean NOT NULL DEFAULT false;