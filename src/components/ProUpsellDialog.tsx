import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProCard } from "@/components/ProCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const seenKey = (id: string) => `fx_pro_upsell_seen_${id}`;
const pendingKey = (id: string) => `fx_pro_upsell_pending_${id}`;

/** Call right after a workspace is created so the owner sees the Pro offer once. */
export function queueProUpsell(workspaceId: string) {
  try { localStorage.setItem(pendingKey(workspaceId), "1"); } catch { /* ignore */ }
}

/** Shows the Pro offer once per workspace: after creating it, or the first time the owner opens Settings. */
export function ProUpsellDialog() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [wsId, setWsId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const m = pathname.match(/^\/w\/([0-9a-f-]{36})(\/[^/]*)?/i);
    if (!m || !user) return;
    const id = m[1];
    const onSettings = m[2] === "/settings";
    let seen = false, pending = false;
    try { seen = !!localStorage.getItem(seenKey(id)); pending = !!localStorage.getItem(pendingKey(id)); } catch { /* ignore */ }
    if (seen || (!pending && !onSettings)) return;

    let cancelled = false;
    supabase.from("workspaces").select("owner_id, pro").eq("id", id).maybeSingle().then(({ data }) => {
      if (cancelled || !data) return;
      const d = data as any;
      if (d.owner_id !== user.id) return;
      try { localStorage.setItem(seenKey(id), "1"); localStorage.removeItem(pendingKey(id)); } catch { /* ignore */ }
      if (d.pro) return;
      setWsId(id);
      setOpen(true);
    });
    return () => { cancelled = true; };
  }, [pathname, user]);

  if (!wsId) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade this workspace to Pro?</DialogTitle>
          <DialogDescription>Optional. Fluxcore stays free — Pro just adds a few extras.</DialogDescription>
        </DialogHeader>
        <ProCard workspaceId={wsId} isOwner />
        <Button variant="ghost" onClick={() => setOpen(false)}>Maybe later</Button>
      </DialogContent>
    </Dialog>
  );
}
