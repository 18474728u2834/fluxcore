import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSessionFromToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      // Validate state
      const storedState = localStorage.getItem("roblox_oauth_state");
      if (state !== storedState) {
        setError("Invalid state parameter. Please try again.");
        return;
      }
      localStorage.removeItem("roblox_oauth_state");

      if (!code) {
        setError("No authorization code received.");
        return;
      }

      try {
        // Exchange code via edge function
        const redirectUri = localStorage.getItem("roblox_oauth_redirect_uri") || "";
        localStorage.removeItem("roblox_oauth_redirect_uri");

        const { data, error: fnError } = await supabase.functions.invoke("roblox-oauth-callback", {
          body: { code, redirect_uri: redirectUri },
        });

        if (fnError) throw fnError;
        if (!data?.success) throw new Error(data?.error || "OAuth failed");

        // Set session
        const { error: sessionErr } = await setSessionFromToken(data.tokenHash, data.email);
        if (sessionErr) throw sessionErr;

        navigate("/workspaces");
      } catch (err: any) {
        console.error("OAuth callback error:", err);
        setError(err.message || "Authentication failed. Please try again.");
      }
    };

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-md text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive">Authentication Failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-primary hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
        <p className="text-foreground font-semibold">Signing you in with Roblox...</p>
      </div>
    </div>
  );
}
