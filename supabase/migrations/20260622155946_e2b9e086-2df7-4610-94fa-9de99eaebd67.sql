CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_uniq
  ON public.newsletter_subscribers (lower(email));

GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT SELECT, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_subscribe" ON public.newsletter_subscribers;
CREATE POLICY "anyone_can_subscribe"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "staff_can_read_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "staff_can_read_subscribers"
  ON public.newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (public.is_staff_admin());

DROP POLICY IF EXISTS "staff_can_delete_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "staff_can_delete_subscribers"
  ON public.newsletter_subscribers
  FOR DELETE
  TO authenticated
  USING (public.is_staff_admin());