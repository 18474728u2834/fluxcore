import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Shield, Target, FileText, Users, Zap, Bot, MessageSquare, BarChart3, Globe, Palette, Award, Gift, Webhook, Image as ImageIcon, Calendar, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

const CURRENT_VERSION = "4.0.0";

const features = [
  { icon: Gift, title: "Fluxcore is now free for everyone", desc: "No more Premium plan — every workspace gets the full feature set, including per-role quotas and unlimited members, at zero cost." },
  { icon: Webhook, title: "Discohook-style webhook templates", desc: "Owners can now customise Shift, Training and Event alerts with multiple embeds, fields, custom username and avatar, and per-category branding." },
  { icon: ImageIcon, title: "Custom images in alerts", desc: "Upload your own banners and pick whether they show in the middle or at the bottom of the embed — different for Shifts, Trainings and Events." },
  { icon: MessageSquare, title: "Flexible link formatting", desc: "Choose between an embedded button-style link or a plain text URL, and every notification is signed off with Fluxcore Systems on the final embed." },
  { icon: Calendar, title: "Reliable session reminders", desc: "The reminder pipeline was rewritten — recurring shifts now fire once per occurrence and never get stuck on stale ‘starting now’ checks." },
  { icon: Shield, title: "Roblox group ownership check", desc: "Workspace creation now verifies that you actually own the Roblox group you're attaching, blocking impostor workspaces." },
  { icon: Users, title: "Old-UI shifts in Hyra view", desc: "Recurring shifts created in the classic UI now show up on the right day in the Hyra-style Sessions page with per-occurrence claims." },
  { icon: AlertTriangle, title: "Quota logging", desc: "Pick how missed quotas are recorded — automatic warnings on the member's profile, or a Discord webhook report. First-time owners get a quick setup prompt." },
  { icon: Target, title: "Run quota check on demand", desc: "Owners can trigger a quota check from the Quotas page that posts to Discord or logs warnings instantly." },
  { icon: Sparkles, title: "Lots of polish", desc: "Faster dashboard loads, better Roblox avatar handling, more reliable Discord webhook delivery, and small UI fixes throughout." },
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
