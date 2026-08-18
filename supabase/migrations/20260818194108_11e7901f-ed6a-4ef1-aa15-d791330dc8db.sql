CREATE TABLE public.creations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_path TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.creations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creations TO authenticated;
GRANT ALL ON public.creations TO service_role;

ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published creations"
ON public.creations FOR SELECT TO anon, authenticated
USING (published = true OR public.is_fluxcore_staff());

CREATE POLICY "Fluxcore staff can insert creations"
ON public.creations FOR INSERT TO authenticated
WITH CHECK (public.is_fluxcore_staff());

CREATE POLICY "Fluxcore staff can update creations"
ON public.creations FOR UPDATE TO authenticated
USING (public.is_fluxcore_staff()) WITH CHECK (public.is_fluxcore_staff());

CREATE POLICY "Fluxcore staff can delete creations"
ON public.creations FOR DELETE TO authenticated
USING (public.is_fluxcore_staff());

CREATE TRIGGER creations_updated_at BEFORE UPDATE ON public.creations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can read creations files"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'creations');

CREATE POLICY "Fluxcore staff can upload creations files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'creations' AND public.is_fluxcore_staff());

CREATE POLICY "Fluxcore staff can update creations files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'creations' AND public.is_fluxcore_staff());

CREATE POLICY "Fluxcore staff can delete creations files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'creations' AND public.is_fluxcore_staff());