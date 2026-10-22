ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS pro boolean NOT NULL DEFAULT false;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS pro_since timestamptz;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS pro_payment_id text;
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_pro_payment_id_key ON public.workspaces(pro_payment_id) WHERE pro_payment_id IS NOT NULL;
REVOKE UPDATE (pro, pro_since, pro_payment_id) ON public.workspaces FROM authenticated, anon;
GRANT SELECT (pro, pro_since) ON public.workspaces TO authenticated;