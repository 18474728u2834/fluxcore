import { useEffect, useState } from "react";
import { Crown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ProCard({ workspaceId, isOwner }: { workspaceId: string | null; isOwner: boolean }) {
  const [pro, setPro] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    supabase.from("workspaces").select("pro").eq("id", workspaceId).maybeSingle()
      .then(({ data }) => setPro(!!(data as any)?.pro));
  }, [workspaceId]);

  const buy = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("whop-checkout", {
      body: { workspace_id: workspaceId, return_url: window.location.href },
    });
    setBusy(false);
    if (error || !data?.url) { toast.error(data?.error ?? "Couldn't open checkout. Try again shortly."); return; }
    window.location.href = data.url;
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Crown className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold">Fluxcore Pro</h3>
        {pro && <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary">Active</span>}
      </div>
      <p className="text-xs text-muted-foreground mb-4">One-time $3 for this workspace. Everything else stays free.</p>
      <ul className="space-y-1.5 mb-4 text-sm">
        {["Priority support", "Beta access to new Nexus versions", "Early access to new features"].map((p) => (
          <li key={p} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" />{p}</li>
        ))}
      </ul>
      {pro === null ? null : pro ? (
        <p className="text-xs text-muted-foreground">Thanks for supporting Fluxcore.</p>
      ) : isOwner ? (
        <Button onClick={buy} disabled={busy} className="font-semibold">
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Get Pro — $3
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Only the workspace owner can buy Pro.</p>
      )}
    </div>
  );
}
