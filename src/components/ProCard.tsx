import { useEffect, useState } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useWorkspacePro(workspaceId?: string) {
  const [pro, setPro] = useState<boolean | null>(null);
  useEffect(() => {
    if (!workspaceId) return;
    supabase.from("workspaces").select("pro").eq("id", workspaceId).maybeSingle()
      .then(({ data }) => setPro(!!(data as any)?.pro), () => setPro(false));
  }, [workspaceId]);
  return pro;
}

export async function startProCheckout(workspaceId: string) {
  const { data, error } = await supabase.functions.invoke("whop-checkout", {
    body: { workspace_id: workspaceId, return_url: window.location.href },
  });
  if (error || !data?.url) {
    toast.error((data as any)?.error || "Couldn't open checkout. Try again.");
    return;
  }
  window.location.href = data.url;
}

export function ProCard({ workspaceId, isOwner }: { workspaceId: string; isOwner: boolean }) {
  const pro = useWorkspacePro(workspaceId);
  const [busy, setBusy] = useState(false);

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
      {!pro && pro !== null && (
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
