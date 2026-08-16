import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Runs on the workspace subdomain. Exchanges the one-time handoff token for a
 * session so the user lands signed in without re-linking Roblox or Discord.
 */
export default function SsoCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setSessionFromToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  const token = params.get("token");
  const next = params.get("next") || "/dashboard";

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (!token) {
        setError("Missing sign-in token.");
        return;
      }
      const { data, error: fnErr } = await supabase.functions.invoke("sso-handoff", {
        body: { action: "exchange", token },
      });
      if (fnErr || !data?.token_hash || !data?.email) {
        console.error("[SSO] exchange failed", fnErr, data);
        setError("This sign-in link has expired. Please sign in again.");
        return;
      }
      const { error: sessErr } = await setSessionFromToken(data.token_hash, data.email);
      if (sessErr) {
        setError(sessErr.message || "Could not complete sign in.");
        return;
      }
      navigate(next.startsWith("/") ? next : `/${next}`, { replace: true });
    })();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-md text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive">Sign-in failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={() => navigate("/login")} className="text-sm text-primary hover:underline">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
