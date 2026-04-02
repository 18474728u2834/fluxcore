import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSessionFromToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const tokenHash = searchParams.get("token_hash");
      const email = searchParams.get("email");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(`Authentication failed: ${errorParam.replace(/_/g, " ")}`);
        return;
      }

      if (!tokenHash || !email) {
        setError("Missing authentication data. Please try again.");
        return;
      }

      try {
        const { error: sessionErr } = await setSessionFromToken(tokenHash, email);
        if (sessionErr) throw sessionErr;
        navigate("/workspaces");
      } catch (err: any) {
        console.error("Session error:", err);
        setError(err.message || "Failed to complete sign in.");
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
