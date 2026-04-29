-- Allow workspace owners (who aren't workspace_members) to sign documents.
-- Make member_id nullable and add owner-aware RLS policies.

ALTER TABLE public.document_signatures
  ALTER COLUMN member_id DROP NOT NULL;

-- Replace overly-permissive insert policy with owner-OR-member rule
DROP POLICY IF EXISTS "Members can sign documents" ON public.document_signatures;

CREATE POLICY "Members and owners can sign documents"
  ON public.document_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.workspace_documents d
      WHERE d.id = document_signatures.document_id
        AND (
          public.is_workspace_owner(d.workspace_id)
          OR public.is_workspace_member(d.workspace_id)
        )
    )
  );

-- Tighten select: only members/owners of the document's workspace, not "true"
DROP POLICY IF EXISTS "Members can view signatures" ON public.document_signatures;

CREATE POLICY "Workspace people can view signatures"
  ON public.document_signatures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_documents d
      WHERE d.id = document_signatures.document_id
        AND (
          public.is_workspace_owner(d.workspace_id)
          OR public.is_workspace_member(d.workspace_id)
        )
    )
  );