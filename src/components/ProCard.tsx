import { useEffect, useState } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RETURN_FLAG = "pro_return";

export async function startProCheckout(workspaceId: string) {
  const ret = new URL(window.location.href);
  ret.searchParams.set(RETURN_FLAG, "1");
  const { data, error } = await supabase.functions.invoke("whop-checkout", {
    body: { workspace_id: workspaceId, return_url: ret.toString() },
  });
  if (error || !data?.url) {
    toast.error((data as any)?.error || "Couldn't open checkout. Try again.");
    return;
  }
  window.location.href = data.url;
}

export function ProCard({ workspaceId, isOwner }: { workspaceId: string; isOwner: boolean }) {
  const [pro, setPro] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("workspaces").select("pro").eq("id", workspaceId).maybeSingle();
      const current = !!(data as any)?.pro;
      if (cancelled) return;
      setPro(current);
      if (current || !isOwner) return;

      // Owner without Pro: confirm with Whop whether they've paid (covers returning from checkout).
      const returning = new URLSearchParams(window.location.search).has(RETURN_FLAG)
        || window.location.hash.includes(RETURN_FLAG);
      setChecking(returning);
      const attempts = returning ? 5 : 1;
      for (let i = 0; i < attempts && !cancelled; i++) {
        const { data: v } = await supabase.functions.invoke("whop-checkout", { body: { action: "verify", workspace_id: workspaceId } });
        if ((v as any)?.pro) {
          if (cancelled) return;
          setPro(true);
          if (returning) toast.success("Fluxcore Pro is now active for this workspace!");
          break;
        }
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [workspaceId, isOwner]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Fluxcore Pro
          </p>
          <p className="mt-1 text-sm text-muted-foreground">One-time $3 for this workspace.</p>
        </div>
        {pro && <span className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground">Active</span>}
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Priority support</li>
        <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Early access to new Nexus versions</li>
      </ul>
      {checking && !pro && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Confirming your payment…
        </p>
      )}
      {!pro && pro !== null && !checking && (
        isOwner ? (
          <Button className="mt-4" disabled={busy} onClick={async () => { setBusy(true); await startProCheckout(workspaceId); setBusy(false); }}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Get Pro — $3
          </Button>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">Only the workspace owner can buy Pro.</p>
        )
      )}
    </div>
  );
}
