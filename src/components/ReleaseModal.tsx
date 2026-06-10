import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Shield, Search, Building2, Activity, MessageSquare, Megaphone, BarChart3, Code, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

const CURRENT_VERSION = "4.5.0";

const features = [
  { icon: BarChart3, title: "Public status page at status.fluxcore.works", desc: "BetterStack-style components, 90-day uptime bars, incident history and scheduled maintenance — everyone can see the state of Fluxcore at a glance." },
  { icon: Megaphone, title: "Site-wide banners", desc: "Staff can post banners on the marketing site and workspace selector for announcements, incidents and links — dismissible per user." },
  { icon: Building2, title: "Departments as sub-workspaces", desc: "Spin up HR, Operations, or any team with its own announcements, documents and sessions — scoped by department membership." },
  { icon: Search, title: "Global search in Nexus UI", desc: "⌘K (or Ctrl+K) jumps to any member, session, document or page across the workspace, with grouped results and keyboard nav." },
  { icon: Activity, title: "In-game ranking script", desc: "A second Lua endpoint that checks the requester's Fluxcore permissions before ranking. No silent kicks — declined requests just get told no." },
  { icon: Code, title: "One-script activity tracker", desc: "The server script now installs the input beacon for you. Two steps instead of three — one paste, you're done." },
  { icon: Shield, title: "Per-admin status permission", desc: "New 'manage_status' staff permission so the right people can post incidents and banners without owner-admin keys." },
  { icon: ArrowUpRight, title: "Polish & fixes", desc: "Faster workspace switching, sharper Nexus shell, and a heap of small QoL tweaks across the dashboard." },
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
