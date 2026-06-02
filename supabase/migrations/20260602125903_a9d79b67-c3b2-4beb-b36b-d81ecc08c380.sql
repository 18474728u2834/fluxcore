
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS quota_log_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS quota_log_webhook_url text,
  ADD COLUMN IF NOT EXISTS quota_log_configured boolean NOT NULL DEFAULT false;
