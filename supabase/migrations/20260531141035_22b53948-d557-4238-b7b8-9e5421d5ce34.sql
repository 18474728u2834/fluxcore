CREATE TABLE public.session_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  occurrence_at timestamp with time zone NOT NULL,
  action text NOT NULL DEFAULT 'session_starting',
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (session_id, occurrence_at, action)
);

GRANT ALL ON public.session_notifications TO service_role;

ALTER TABLE public.session_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_session_notifications_workspace_occurrence
  ON public.session_notifications (workspace_id, occurrence_at DESC);