import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Star, TrendingUp, BarChart3, CheckCircle2, ArrowUpRight, Rocket, Shield, Zap, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

const FALLBACK_VERSION = "4.6.0";

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles, Heart, Star, TrendingUp, BarChart3, CheckCircle2, ArrowUpRight, Rocket, Shield, Zap,
};

const FALLBACK_FEATURES = [
  { icon: Heart, title: "Kudos Wall", desc: "Members can post shoutouts to teammates — a live feed of recognition that flows in real-time across the workspace. Find it in the sidebar under Kudos." },
  { icon: Star, title: "Staff Spotlight", desc: "Each week we automatically highlight the member who received the most kudos in the last 7 days. No nominations, no admin work — just earned recognition." },
  { icon: TrendingUp, title: "Promotion Nominations", desc: "Any member can nominate a teammate for promotion with a reason. Leads and owners get a queue to approve or decline — no more guessing who's ready to move up." },
  { icon: CheckCircle2, title: "Smarter Status Page", desc: "Days without incidents now go green automatically on status.fluxcore.works. Only the days that actually had outages stay flagged." },
  { icon: BarChart3, title: "Available in both UIs", desc: "Kudos and Promotions are wired into the Classic sidebar and the Nexus shell — pick your UI, the features are there." },
  { icon: ArrowUpRight, title: "Polish & fixes", desc: "Tighter glassmorphism, faster page loads, and a sweep of small QoL fixes across the dashboard." },
];

export function ReleaseModal() {
  const { workspaceId, isOwner } = useWorkspace();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isOwner || !workspaceId) return;
    const checkRelease = async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("release_version")
        .eq("id", workspaceId)
        .single();
      if (data && (data as any).release_version !== CURRENT_VERSION) {
        setOpen(true);
      }
    };
    checkRelease();
  }, [workspaceId, isOwner]);

  const dismiss = async () => {
    setOpen(false);
    await supabase
      .from("workspaces")
      .update({ release_version: CURRENT_VERSION } as any)
      .eq("id", workspaceId);
    // Force refresh so new pages, permissions and styles load without manual reload
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="glass border-border/40 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <DialogTitle className="text-foreground text-lg">What's New in Fluxcore v{CURRENT_VERSION}</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">Major update — here's what we've shipped</p>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Button variant="hero" className="w-full mt-2" onClick={dismiss}>
          Got it, let's go
        </Button>
      </DialogContent>
    </Dialog>
  );
}
