import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type RemovalRequest = {
  id: string;
  reason: string | null;
  requested_by_username: string | null;
  created_at: string;
};

export function AccountRemovalGate({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [req, setReq] = useState<RemovalRequest | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (loading) return;
    if (!user) {
      setReq(null);
      setChecked(true);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("account_removal_requests")
        .select("id, reason, requested_by_username, created_at")
        .eq("target_user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      if (!alive) return;
      setReq((data as RemovalRequest) || null);
      setChecked(true);
    })();
    return () => { alive = false; };
  }, [user, loading]);

  if (!checked || !req) return <>{children}</>;

  const approve = async () => {
    if (!confirm("This will permanently delete your Fluxcore account and all your data. Continue?")) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/process-account-removal`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
        },
        body: "{}",
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Failed");
      toast.success("Your account has been deleted.");
      await signOut();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove account");
      setBusy(false);
    }
  };

  const deny = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("account_removal_requests")
      .update({ status: "denied", responded_at: new Date().toISOString() })
      .eq("id", req.id);
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    toast.success("Removal request denied.");
    setReq(null);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-md text-foreground flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-6 rounded-2xl border border-destructive/40 bg-card/60 backdrop-blur p-8 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-full bg-destructive/15 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Account removal requested</h1>
          <p className="text-sm text-muted-foreground">
            A Fluxcore staff member has requested the permanent removal of your account.
            Please confirm or reject below.
          </p>
        </div>

        <div className="text-left space-y-3">
          {req.reason && (
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Reason</div>
              <div className="text-sm">{req.reason}</div>
            </div>
          )}
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Requested by</div>
            <div className="text-sm">{req.requested_by_username || "Fluxcore staff"} · {new Date(req.created_at).toLocaleString()}</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Approving will permanently delete your account, workspaces, memberships and all related data.
          This cannot be undone.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="destructive" className="gap-2" onClick={approve} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            Approve removal
          </Button>
          <Button variant="outline" onClick={deny} disabled={busy}>
            Reject request
          </Button>
          <Button variant="ghost" className="gap-2" onClick={() => signOut()} disabled={busy}>
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
