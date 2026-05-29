
-- Add Discord linking to verified_users
ALTER TABLE public.verified_users
  ADD COLUMN IF NOT EXISTS discord_user_id text,
  ADD COLUMN IF NOT EXISTS discord_username text;

CREATE UNIQUE INDEX IF NOT EXISTS verified_users_discord_user_id_key
  ON public.verified_users(discord_user_id)
  WHERE discord_user_id IS NOT NULL;

-- Short-lived pending link tokens issued after a first-time Discord OAuth
CREATE TABLE IF NOT EXISTS public.discord_pending_links (
  token text PRIMARY KEY,
  discord_user_id text NOT NULL,
  discord_username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

GRANT ALL ON public.discord_pending_links TO service_role;

ALTER TABLE public.discord_pending_links ENABLE ROW LEVEL SECURITY;
-- No client policies: only the service role (edge functions) touches this table.
