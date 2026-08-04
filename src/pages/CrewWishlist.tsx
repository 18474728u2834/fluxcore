import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CrewWishlistDialog } from "@/components/CrewWishlistDialog";
import { bx } from "@/bargains/Shell";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Standalone crew wishlist page — the link a dispatcher shares with staff:
 * /wishlist/:sessionId/:occurrence  (occurrence = ISO timestamp)
 */
export default function CrewWishlist() {
  const { sessionId, occurrence } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!sessionId) return;
      const { data, error } = await supabase
        .from("scheduled_sessions")
        .select("id, title, route_number, workspace_id, scheduled_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (error || !data) { setError("This wishlist link is no longer available."); return; }
      setSession(data);
    })();
  }, [sessionId]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`, { replace: true });
    }
  }, [authLoading, user]);

  const occursAt = occurrence ? new Date(decodeURIComponent(occurrence)) : null;

  if (error || (occursAt && isNaN(occursAt.getTime()))) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0b0b0d", color: bx.textDim }}>
        <p className="text-sm">{error ?? "That wishlist link looks broken."}</p>
      </div>
    );
  }

  if (!session || !occursAt) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0b0b0d" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: bx.coral }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0b0b0d" }}>
      <CrewWishlistDialog
        workspaceId={session.workspace_id}
        session={session}
        occursAt={occursAt}
        onClose={() => navigate("/sessions")}
      />
    </div>
  );
}
