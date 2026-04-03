
-- Member logs for promotion hints, warnings, notes on profiles
CREATE TABLE public.member_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  log_type TEXT NOT NULL DEFAULT 'note',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.member_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view logs in their workspace"
  ON public.member_logs FOR SELECT TO authenticated
  USING (is_workspace_owner(workspace_id) OR is_workspace_member(workspace_id));

CREATE POLICY "Owners and permitted can create logs"
  ON public.member_logs FOR INSERT TO authenticated
  WITH CHECK (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'));

CREATE POLICY "Owners can delete logs"
  ON public.member_logs FOR DELETE TO authenticated
  USING (is_workspace_owner(workspace_id));

-- Blacklist table
CREATE TABLE public.workspace_blacklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  roblox_user_id TEXT NOT NULL,
  roblox_username TEXT NOT NULL,
  reason TEXT,
  blacklisted_by UUID NOT NULL,
  blacklisted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, roblox_user_id)
);

ALTER TABLE public.workspace_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view blacklist"
  ON public.workspace_blacklist FOR SELECT TO authenticated
  USING (is_workspace_owner(workspace_id) OR is_workspace_member(workspace_id));

CREATE POLICY "Owners and admins manage blacklist"
  ON public.workspace_blacklist FOR ALL TO authenticated
  USING (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'))
  WITH CHECK (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'));

-- Leave of Absence requests
CREATE TABLE public.loa_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loa_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view LOA requests"
  ON public.loa_requests FOR SELECT TO authenticated
  USING (is_workspace_owner(workspace_id) OR is_workspace_member(workspace_id));

CREATE POLICY "Members can create own LOA"
  ON public.loa_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can manage LOA"
  ON public.loa_requests FOR UPDATE TO authenticated
  USING (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'))
  WITH CHECK (is_workspace_owner(workspace_id) OR has_workspace_permission(workspace_id, 'manage_members'));

-- Documents (Policies & Handbooks)
CREATE TABLE public.workspace_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'policy',
  signature_type TEXT NOT NULL DEFAULT 'checkbox',
  signature_word TEXT,
  auto_assign BOOLEAN NOT NULL DEFAULT false,
  deadline TIMESTAMP WITH TIME ZONE,
  assign_to TEXT NOT NULL DEFAULT 'all',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view documents"
  ON public.workspace_documents FOR SELECT TO authenticated
  USING (is_workspace_owner(workspace_id) OR is_workspace_member(workspace_id));

CREATE POLICY "Owners manage documents"
  ON public.workspace_documents FOR ALL TO authenticated
  USING (is_workspace_owner(workspace_id))
  WITH CHECK (is_workspace_owner(workspace_id));

-- Document signatures
CREATE TABLE public.document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.workspace_documents(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, member_id)
);

ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view signatures"
  ON public.document_signatures FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Members can sign documents"
  ON public.document_signatures FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add triggers
CREATE TRIGGER update_loa_requests_updated_at
  BEFORE UPDATE ON public.loa_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_documents_updated_at
  BEFORE UPDATE ON public.workspace_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
