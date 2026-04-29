import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Copy, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Grant {
  id: string;
  token: string;
  label: string | null;
  days: number;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  created_at: string;
}

/**
 * Visible only to Fluxcore staff (Novavoff). Lets them generate
 * "free premium" claim links that any user can redeem.
 */
export function PremiumGrantManager() {
  const { user } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("7");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresInDays, setExpiresInDays] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("verified_users")
        .select("roblox_username")
        .eq("user_id", user.id)
        .maybeSingle();
      const staff = (data?.roblox_username || "").toLowerCase() === "novavoff";
      setIsStaff(staff);
      if (staff) await loadGrants();
      else setLoading(false);
    })();
  }, [user]);

  const loadGrants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("premium_grants")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setGrants(data as Grant[]);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user) return;
    const d = parseInt(days, 10);
    const m = parseInt(maxUses, 10);
    if (!d || d < 1) { toast.error("Days must be at least 1"); return; }
    if (!m || m < 1) { toast.error("Max uses must be at least 1"); return; }

    setCreating(true);
    const expires = expiresInDays.trim()
      ? new Date(Date.now() + parseInt(expiresInDays, 10) * 86400_000).toISOString()
      : null;

    const { error } = await supabase.from("premium_grants").insert({
      label: label.trim() || null,
      days: d,
      max_uses: m,
      expires_at: expires,
      created_by: user.id,
    });
    setCreating(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Premium link created");
    setLabel(""); setDays("7"); setMaxUses("1"); setExpiresInDays("");
    setOpen(false);
    loadGrants();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this premium link? Anyone with the link will no longer be able to claim it.")) return;
    const { error } = await supabase.from("premium_grants").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    loadGrants();
  };

  const buildLink = (token: string) =>
    `${window.location.origin}${window.location.pathname}#/login?grant=${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(buildLink(token));
    toast.success("Link copied");
  };

  if (!isStaff) return null;

  return (
    <div className="mt-12 rounded-xl border border-primary/20 bg-primary/[0.03] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-foreground text-sm">Staff · Premium Grants</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground h-8">
              <Plus className="w-3.5 h-3.5 mr-1" /> Create Premium Link
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border/30 bg-card">
            <DialogHeader>
              <DialogTitle>Create Free Premium Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm">Label (optional)</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Giveaway winners" className="bg-muted h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Premium days</Label>
                  <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="bg-muted h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Max uses</Label>
                  <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="bg-muted h-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Link expires in (days, optional)</Label>
                <Input type="number" min={1} value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} placeholder="Never" className="bg-muted h-10" />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Generate Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
      ) : grants.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No premium links yet. Create one to give someone free Premium.</p>
      ) : (
        <div className="space-y-2">
          {grants.map((g) => {
            const exhausted = g.uses >= g.max_uses;
            const expired = g.expires_at && new Date(g.expires_at) < new Date();
            return (
              <div key={g.id} className="rounded-lg border border-border/20 bg-background/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {g.label || `${g.days}-day Premium`}
                      </span>
                      {exhausted && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">USED UP</span>}
                      {expired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">EXPIRED</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {g.days} days · {g.uses}/{g.max_uses} claimed
                      {g.expires_at && ` · expires ${new Date(g.expires_at).toLocaleDateString()}`}
                    </div>
                    <code className="block mt-1.5 text-[10px] font-mono text-muted-foreground break-all select-all">
                      {buildLink(g.token)}
                    </code>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => copyLink(g.token)} className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Copy link">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(g.id)} className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
