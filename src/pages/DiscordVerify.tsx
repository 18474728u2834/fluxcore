import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";

export default function DiscordVerify() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "binding" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return; // wait for login button
    if (state !== "idle") return;
    (async () => {
      setState("binding");
      const { data, error } = await supabase.rpc("bind_discord_account" as any, { _token: token });
      if (error) { setError(error.message); setState("error"); return; }
      setResult(data);
      setState("done");
    })();
  }, [user, loading, state, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="glass rounded-xl p-10 max-w-md w-full text-center space-y-4">
        <ShieldCheck className="w-12 h-12 mx-auto text-primary" />
        <h1 className="text-xl font-bold">Discord verification</h1>

        {!user && !loading && (
          <>
            <p className="text-sm text-muted-foreground">Sign in to Fluxcore to link this Discord account.</p>
            <Button onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.hash.slice(1))}`)}>Sign in</Button>
          </>
        )}
        {state === "binding" && <div className="flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
        {state === "done" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-success" />
            <p className="text-sm">Your Discord account is now linked. You can run Fluxcore slash commands in your server.</p>
            <Button onClick={() => navigate(`/w/${result?.workspace_id}/dashboard`)}>Open workspace</Button>
          </>
        )}
        {state === "error" && (
          <p className="text-sm text-destructive">{error || "Verification failed. Ask the user to run /verify again."}</p>
        )}
      </div>
    </div>
  );
}
