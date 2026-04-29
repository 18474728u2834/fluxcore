import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, X, ChevronDown, ChevronUp, CheckCircle2, Circle, ArrowRight,
  Users, Settings as SettingsIcon, Webhook, FileText, Crown
} from "lucide-react";

interface Step {
  key: string;
  icon: any;
  title: string;
  desc: string;
  cta: string;
  done: boolean;
  action: () => void;
}

export function SetupTutorial() {
  const { workspace, workspaceId, isOwner, refreshWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState({
    members: false,
    role: false,
    webhook: false,
    document: false,
  });
  const [loading, setLoading] = useState(true);

  // Always run hooks before any early returns
  useEffect(() => {
    if (!workspace || !isOwner || workspace.tutorial_completed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const [members, roles, docs, wsRow] = await Promise.all([
          supabase.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
          supabase.from("workspace_roles").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
          supabase.from("workspace_documents").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
          supabase.from("workspaces").select("discord_webhook_url, roblox_api_key").eq("id", workspaceId).maybeSingle(),
        ]);
        if (cancelled) return;
        setProgress({
          members: (members.count ?? 0) > 0,
          role: (roles.count ?? 0) > 0,
          webhook: !!wsRow.data?.discord_webhook_url || !!wsRow.data?.roblox_api_key,
          document: (docs.count ?? 0) > 0,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [workspace, isOwner, workspaceId]);

  // Don't show if not owner, already completed, or user dismissed this session
  if (!workspace || !isOwner || workspace.tutorial_completed || hidden || loading) {
    return null;
  }

  const steps: Step[] = [
    {
      key: "role",
      icon: Crown,
      title: "Create your first role",
      desc: "Set up a staff role with permissions so people know what they can do.",
      cta: "Open roles",
      done: progress.role,
      action: () => navigate(`/w/${workspaceId}/roles`),
    },
    {
      key: "members",
      icon: Users,
      title: "Invite your team",
      desc: "Share your invite link or import staff straight from your Roblox group.",
      cta: "Manage members",
      done: progress.members,
      action: () => navigate(`/w/${workspaceId}/members`),
    },
    {
      key: "webhook",
      icon: Webhook,
      title: "Connect Discord & Roblox",
      desc: "Add a Discord webhook and your Roblox API key for live alerts and ranking.",
      cta: "Open settings",
      done: progress.webhook,
      action: () => navigate(`/w/${workspaceId}/settings`),
    },
    {
      key: "document",
      icon: FileText,
      title: "Write your first policy",
      desc: "Drop in a code of conduct or training doc and require digital signatures.",
      cta: "New document",
      done: progress.document,
      action: () => navigate(`/w/${workspaceId}/documents`),
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  const dismissForever = async () => {
    await supabase.from("workspaces").update({ tutorial_completed: true }).eq("id", workspaceId);
    await refreshWorkspace();
    setHidden(true);
  };

  const dismissSession = () => setHidden(true);

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-[92vw] sm:w-[380px] animate-fade-in">
      <div className="rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-xl shadow-2xl shadow-primary/20 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
            <Sparkles className="w-5 h-5 text-white" />
            {allDone && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {allDone ? "All set! 🎉" : "Hello there 👋"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {allDone ? "Your workspace is ready to go" : `Let's set up ${workspace.name} (${completedCount}/${steps.length})`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); dismissSession(); }}
              className="p-1 rounded-md hover:bg-white/10 cursor-pointer"
              aria-label="Hide"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
          </div>
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-muted/40">
          <div
            className="h-full bg-gradient-to-r from-primary to-violet-400 transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {open && (
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              First, let's get the essentials in place. Knock these out and you're ready to manage your team.
            </p>
            {steps.map((step) => (
              <button
                key={step.key}
                onClick={step.action}
                className={`w-full text-left rounded-xl border p-3 transition-all flex items-start gap-3 group ${
                  step.done
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/30 bg-card/30 hover:bg-card/60 hover:border-primary/30"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {step.done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <step.icon className={`w-3.5 h-3.5 ${step.done ? "text-emerald-500" : "text-primary"}`} />
                    <p className={`text-sm font-semibold ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {step.title}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug mb-1.5">{step.desc}</p>
                  {!step.done && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:gap-2 transition-all">
                      {step.cta} <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </button>
            ))}

            <button
              onClick={dismissForever}
              className="w-full text-[11px] text-muted-foreground hover:text-foreground py-2 mt-2 transition-colors"
            >
              {allDone ? "Hide guide forever" : "Skip setup — I'll figure it out"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
