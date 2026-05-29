-- Per-user dismissed announcements
CREATE TABLE public.dismissed_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, announcement_id)
);

GRANT SELECT, INSERT, DELETE ON public.dismissed_announcements TO authenticated;
GRANT ALL ON public.dismissed_announcements TO service_role;

ALTER TABLE public.dismissed_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dismissals"
  ON public.dismissed_announcements FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own dismissals"
  ON public.dismissed_announcements FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own dismissals"
  ON public.dismissed_announcements FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_dismissed_announcements_user ON public.dismissed_announcements(user_id);

-- Leaderboard category configuration per workspace
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS leaderboard_categories jsonb NOT NULL DEFAULT '["time_in_game","sessions_hosted"]'::jsonb;
