import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Shield, Target, FileText, Users, Zap, Bot, MessageSquare, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

const CURRENT_VERSION = "2.0.0";

const features = [
  { icon: Shield, title: "Roblox OAuth Fixed", desc: "Sign in with Roblox now works with PKCE for secure authentication." },
  { icon: Bot, title: "Discord Shift Reminders", desc: "Get automatic Discord notifications 5 minutes before sessions start." },
  { icon: BarChart3, title: "Quota Admin View", desc: "See exactly who completed their quotas with progress bars and completion tracking." },
  { icon: MessageSquare, title: "Message Logger", desc: "Enable logging of in-game staff messages for moderation and accountability." },
  { icon: Users, title: "Auto-Rank from Group", desc: "Automatically assign workspace roles based on Roblox group rank hierarchy." },
  { icon: Target, title: "Support Center", desc: "Built-in support ticket system for your staff to get help directly." },
  { icon: FileText, title: "Privacy & GDPR", desc: "Full GDPR-compliant privacy policy and data handling transparency." },
  { icon: Zap, title: "Activity Tracker v2", desc: "Enhanced Lua tracker with idle detection, message counting, heartbeats, and staff-only tracking." },
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
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="glass border-border/40 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <DialogTitle className="text-foreground text-lg">What's New in Fluxcore</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">Version {CURRENT_VERSION} — Here's what we've shipped</p>
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
