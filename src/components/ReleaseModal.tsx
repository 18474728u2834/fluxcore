import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Shield, Target, FileText, Users, Zap, Bot, MessageSquare, BarChart3, Globe, Palette, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

const CURRENT_VERSION = "3.0.0";

const features = [
  { icon: Globe, title: "Full Roblox Group Integration", desc: "Import ALL group roles (with pagination), promote/demote directly, and auto-rank from group hierarchy." },
  { icon: Sparkles, title: "AI-Powered Support", desc: "Built-in AI assistant answers common questions instantly. Type 'staff' to escalate to the team." },
  { icon: Palette, title: "Workspace Branding", desc: "Customize background color, grid pattern, primary color, and text color. Your dashboard, your style." },
  { icon: Shield, title: "Modern Login Page", desc: "Full-screen split login with Roblox OAuth 2.0 (PKCE) and emoji verification." },
  { icon: Bot, title: "Discord Shift Reminders", desc: "Automatic Discord notifications 5 minutes before sessions start via webhooks." },
  { icon: BarChart3, title: "Quota Admin View", desc: "Track who completed their quotas with progress bars and admin overview." },
  { icon: MessageSquare, title: "Message Logger", desc: "Log in-game staff messages for moderation (only tracks staff, not customers)." },
  { icon: Zap, title: "Activity Tracker v2", desc: "Staff-only tracking with idle detection, heartbeats, join/leave events, and message logging." },
  { icon: FileText, title: "Documents & Policies", desc: "Digital signature policies with deadlines, auto-assignment, and multiple signature types." },
  { icon: Award, title: "Updated Feature Showcase", desc: "Landing page now shows all 9 major features with a grid background." },
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
