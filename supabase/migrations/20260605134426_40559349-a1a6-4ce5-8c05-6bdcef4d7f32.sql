DROP POLICY IF EXISTS "Workspace owners upload webhook images" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owners update webhook images" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owners delete webhook images" ON storage.objects;

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