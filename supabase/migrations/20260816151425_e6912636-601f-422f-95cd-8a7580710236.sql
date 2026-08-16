CREATE TABLE public.sso_handoff_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  return_origin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 minutes'),
  consumed_at timestamptz
);
GRANT ALL ON public.sso_handoff_tokens TO service_role;
ALTER TABLE public.sso_handoff_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX sso_handoff_tokens_expires_idx ON public.sso_handoff_tokens (expires_at);