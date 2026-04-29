import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JoinWorkspace() {
  const { inviteCode, workspaceId: paramWorkspaceId } = useParams<{ inviteCode?: string; workspaceId?: string }>();
  const { user, loading: authLoading, robloxUsername, robloxUserId } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already" | "blacklisted" | "needs-rank">("loading");
  const [workspaceName, setWorkspaceName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [resolvedWsId, setResolvedWsId] = useState<string>("");
  const [autoJoining, setAutoJoining] = useState(false);

  // Mode: invite code OR direct workspace join (via Roblox group)
  const isDirectJoin = !!paramWorkspaceId && !inviteCode;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const redirect = isDirectJoin ? `/w/${paramWorkspaceId}/join` : `/join/${inviteCode}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    const run = async () => {
      // DIRECT JOIN MODE: Roblox-group based
      if (isDirectJoin && paramWorkspaceId) {
        setResolvedWsId(paramWorkspaceId);
        // Try to fetch workspace name (public-readable via membership only — fallback to generic)
        const { data: ws } = await supabase.rpc("get_workspace_context", { _workspace_id: paramWorkspaceId });
        if (ws?.[0]) setWorkspaceName(ws[0].name);
        else setWorkspaceName("workspace");
        await tryAutoJoin(paramWorkspaceId);
        return;
      }

      if (!inviteCode) {
        setStatus("error"); setErrorMsg("Invalid invite link."); return;
      }

      const { data: lookupResult } = await supabase.rpc("lookup_workspace_by_invite", { code: inviteCode }) as any;
      const ws = Array.isArray(lookupResult) ? lookupResult[0] : lookupResult;
      if (!ws) { setStatus("error"); setErrorMsg("Invalid or expired invite link."); return; }

      setWorkspaceName(ws.name);
      setResolvedWsId(ws.id);

      if (robloxUserId) {
        const { data: blacklisted } = await supabase
          .from("workspace_blacklist").select("id")
          .eq("workspace_id", ws.id).eq("roblox_user_id", robloxUserId).maybeSingle();
        if (blacklisted) { setStatus("blacklisted"); return; }
      }

      const { data: existing } = await supabase
        .from("workspace_members").select("id")
        .eq("workspace_id", ws.id).eq("user_id", user.id).maybeSingle();
      if (existing) { setStatus("already"); return; }

      const { error } = await supabase.from("workspace_members").insert({
        workspace_id: ws.id, user_id: user.id,
        roblox_username: robloxUsername || "Unknown",
        roblox_user_id: robloxUserId || "0",
        role: "Member",
      });
      if (error) { setStatus("error"); setErrorMsg(error.message); return; }

      // After invite-join, also sync rank from Roblox if mapping exists
      const { data: justInserted } = await supabase.from("workspace_members").select("id")
        .eq("workspace_id", ws.id).eq("user_id", user.id).maybeSingle();
      if (justInserted) {
        await supabase.functions.invoke("roblox-sync-rank", {
          body: { action: "sync_member", workspace_id: ws.id, member_id: justInserted.id },
        });
      }

      setStatus("success");
      setTimeout(() => navigate(`/w/${ws.id}/dashboard`), 1500);
    };
    run();
  }, [user, authLoading, inviteCode, paramWorkspaceId]);

  const tryAutoJoin = async (wsId: string) => {
    setAutoJoining(true);
    const res = await supabase.functions.invoke("roblox-sync-rank", {
      body: { action: "auto_join", workspace_id: wsId },
    });
    setAutoJoining(false);
    if (res.data?.success) {
      toast.success(res.data.joined ? `Joined as ${res.data.role_name}!` : `Welcome back — synced as ${res.data.role_name}`);
      setStatus("success");
      setTimeout(() => navigate(`/w/${wsId}/dashboard`), 1200);
    } else {
      const err = res.data?.error || res.error?.message || "Could not auto-join";
      if (err.toLowerCase().includes("not mapped") || err.toLowerCase().includes("not in this roblox group")) {
        setStatus("needs-rank"); setErrorMsg(err);
      } else {
        setStatus("error"); setErrorMsg(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="relative w-full max-w-md mx-4">
        <div className="glass rounded-2xl p-8 text-center space-y-4 gradient-border">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <p className="text-foreground font-semibold">{isDirectJoin ? "Checking your Roblox group rank..." : "Joining workspace..."}</p>
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
              <Button variant="hero" onClick={() => navigate(`/w/${resolvedWsId}/dashboard`)} className="mt-2">
                Go to Dashboard
              </Button>
            </>
          )}
          {status === "blacklisted" && (
            <>
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Blacklisted</h2>
              <p className="text-sm text-destructive">You are blacklisted from this workspace.</p>
              <Button variant="outline" onClick={() => navigate("/workspaces")} className="mt-2">Back to Workspaces</Button>
            </>
          )}
          {status === "needs-rank" && (
            <>
              <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7 text-warning" />
              </div>
              <h2 className="text-lg font-bold text-foreground">No matching rank</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <p className="text-xs text-muted-foreground">Ask the workspace owner for an invite link, or get a mapped rank in their Roblox group.</p>
              <Button variant="outline" onClick={() => navigate("/workspaces")} className="mt-2">Back to Workspaces</Button>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Couldn't Join</h2>
              <p className="text-sm text-destructive">{errorMsg}</p>
              {resolvedWsId && !isDirectJoin && (
                <Button variant="hero" onClick={() => tryAutoJoin(resolvedWsId)} disabled={autoJoining} className="mt-2 w-full">
                  {autoJoining && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  <Users className="w-4 h-4 mr-1" /> Try joining via Roblox group rank
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate("/workspaces")} className="mt-2">Back to Workspaces</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
