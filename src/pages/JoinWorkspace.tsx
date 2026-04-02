import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JoinWorkspace() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, loading: authLoading, robloxUsername, robloxUserId } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading");
  const [workspaceName, setWorkspaceName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (!inviteCode) {
      setStatus("error");
      setErrorMsg("Invalid invite link.");
      return;
    }

    const join = async () => {
      // Look up workspace by invite code (uses security definer function)
      const { data: lookupResult } = await supabase.rpc("lookup_workspace_by_invite", { code: inviteCode }) as any;
      const ws = Array.isArray(lookupResult) ? lookupResult[0] : lookupResult;

      if (!ws) {
        setStatus("error");
        setErrorMsg("Invalid or expired invite link.");
        return;
      }

      setWorkspaceName(ws.name);

      // Check if already a member (the lookup doesn't return owner_id)
      // We'll check membership which covers both owner and member cases

      // Check if already a member
      const { data: existing } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", ws.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        setStatus("already");
        return;
      }

      // Join
      const { error } = await supabase.from("workspace_members").insert({
        workspace_id: ws.id,
        user_id: user.id,
        roblox_username: robloxUsername || "Unknown",
        roblox_user_id: robloxUserId || "0",
        role: "Member",
      });

      if (error) {
        setStatus("error");
        setErrorMsg(error.message);
      } else {
        setStatus("success");
        setTimeout(() => navigate(`/w/${ws.id}/dashboard`), 1500);
      }
    };

    join();
  }, [user, authLoading, inviteCode]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="relative w-full max-w-md mx-4">
        <div className="glass rounded-2xl p-8 text-center space-y-4 gradient-border">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <p className="text-foreground font-semibold">Joining workspace...</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Joined {workspaceName}!</h2>
              <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </>
          )}
          {status === "already" && (
            <>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Already in {workspaceName}</h2>
              <Button variant="hero" onClick={() => navigate("/workspaces")} className="mt-2">
                Go to Workspaces
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Couldn't Join</h2>
              <p className="text-sm text-destructive">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate("/workspaces")} className="mt-2">
                Back to Workspaces
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
