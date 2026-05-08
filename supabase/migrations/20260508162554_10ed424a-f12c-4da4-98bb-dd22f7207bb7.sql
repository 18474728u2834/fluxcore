ALTER TABLE public.workspace_quotas
  ADD COLUMN IF NOT EXISTS last_reset_at timestamp with time zone NOT NULL DEFAULT now();