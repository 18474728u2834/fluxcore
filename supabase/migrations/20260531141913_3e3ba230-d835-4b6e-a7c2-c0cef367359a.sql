
-- Webhook templates per workspace + category
CREATE TABLE public.webhook_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('Shift','Training','Event')),
  use_embed boolean NOT NULL DEFAULT true,
  title text NOT NULL DEFAULT '🟢 {category} Starting Now',
  description text NOT NULL DEFAULT '**{title}** is starting!',
  color text NOT NULL DEFAULT '#22c55e',
  image_url text,
  image_position text NOT NULL DEFAULT 'bottom' CHECK (image_position IN ('middle','bottom')),
  link_mode text NOT NULL DEFAULT 'embedded' CHECK (link_mode IN ('embedded','plain')),
  link_label text NOT NULL DEFAULT 'Click to join',
  link_position text NOT NULL DEFAULT 'field' CHECK (link_position IN ('field','description','below')),
  show_claims boolean NOT NULL DEFAULT true,
  show_host boolean NOT NULL DEFAULT true,
  show_time boolean NOT NULL DEFAULT true,
  plain_message text DEFAULT '🟢 **{title}** ({category}) is starting now! {link}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, category)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_templates TO authenticated;
GRANT ALL ON public.webhook_templates TO service_role;

ALTER TABLE public.webhook_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view templates"
  ON public.webhook_templates FOR SELECT TO authenticated
  USING (is_workspace_owner(workspace_id) OR is_workspace_member(workspace_id));

CREATE POLICY "Owners manage templates"
  ON public.webhook_templates FOR ALL TO authenticated
  USING (is_workspace_owner(workspace_id))
  WITH CHECK (is_workspace_owner(workspace_id));

CREATE TRIGGER update_webhook_templates_updated_at
  BEFORE UPDATE ON public.webhook_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for webhook images
INSERT INTO storage.buckets (id, name, public)
VALUES ('webhook-images','webhook-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Webhook images are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'webhook-images');

CREATE POLICY "Workspace owners upload webhook images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'webhook-images'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = w.id::text
    )
  );

CREATE POLICY "Workspace owners update webhook images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'webhook-images'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = w.id::text
    )
  );

CREATE POLICY "Workspace owners delete webhook images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'webhook-images'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = w.id::text
    )
  );
