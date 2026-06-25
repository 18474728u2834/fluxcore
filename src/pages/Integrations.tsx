import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe, Bot, ShieldCheck, Target, Code, Gamepad2, ArrowRight, Plug, Loader2, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "connected" | "missing" | "optional";

interface TileSpec {
  id: string;
  title: string;
  desc: string;
  icon: any;
  accent: string;
  section: string;          // settings ?section= target
  status: Status;
  detail: string;           // small status line
}

export default function Integrations() {
  const { workspaceId, workspace, isOwner, loading } = useWorkspace();
  const [secrets, setSecrets] = useState<any>(null);
  const [extras, setExtras] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "connected" | "needs">("all");
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      const [{ data: secretsRows }, { data: ws }] = await Promise.all([
        supabase.rpc("get_workspace_secrets", { _workspace_id: workspaceId }),
        supabase.from("workspaces")
          .select("roblox_group_id, message_logger_enabled, auto_rank_enabled, game_url, quota_log_mode")
          .eq("id", workspaceId).single(),
      ]);
      if (cancelled) return;
      const s = Array.isArray(secretsRows) ? secretsRows[0] : secretsRows;
      setSecrets(s || {});
      setExtras(ws || {});
      setFetched(true);
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const tiles = useMemo<TileSpec[]>(() => {
    const has = (v: any) => typeof v === "string" && v.length > 0;
    return [
      {
        id: "roblox",
        title: "Roblox Open Cloud",
        desc: "Required for promotions, demotions, and importing group roles.",
        icon: Globe,
        accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-400",
        section: "integrations",
        status: has(secrets?.roblox_api_key) ? "connected" : "missing",
        detail: has(secrets?.roblox_api_key)
          ? `Group #${extras?.roblox_group_id || "—"} · API key set`
          : "API key not set",
      },
      {
        id: "rankgun",
        title: "RankGun",
        desc: "Alternative ranking provider for groups via api.rankgun.works.",
        icon: ShieldCheck,
        accent: "from-violet-500/20 to-violet-500/5 text-violet-400",
        section: "integrations",
        status: has(secrets?.rankgun_api_key) ? "connected" : "optional",
        detail: has(secrets?.rankgun_api_key) ? "API key set" : "Optional · not connected",
      },
      {
        id: "discord",
        title: "Discord Webhook",
        desc: "Session announcements and 5-minute reminders posted to a channel.",
        icon: Bot,
        accent: "from-indigo-500/20 to-indigo-500/5 text-indigo-400",
        section: "integrations",
        status: has(secrets?.discord_webhook_url) ? "connected" : "missing",
        detail: has(secrets?.discord_webhook_url) ? "Webhook configured" : "No webhook set",
      },
      {
        id: "quota",
        title: "Quota Webhook",
        desc: "Posts a missed-quota report when you run a quota check.",
        icon: Target,
        accent: "from-rose-500/20 to-rose-500/5 text-rose-400",
        section: "sessions",
        status: extras?.quota_log_mode === "webhook" && has(secrets?.quota_log_webhook_url)
          ? "connected" : "optional",
        detail: extras?.quota_log_mode === "webhook"
          ? (has(secrets?.quota_log_webhook_url) ? "Posting to webhook" : "Mode set, URL missing")
          : extras?.quota_log_mode === "warning" ? "Logging as profile warnings" : "Not logging",
      },
      {
        id: "tracker",
        title: "Lua Activity Tracker",
        desc: "In-game module that streams session time, chat, and AFK events.",
        icon: Code,
        accent: "from-cyan-500/20 to-cyan-500/5 text-cyan-400",
        section: "tracking",
        status: has(secrets?.api_key) ? "connected" : "missing",
        detail: has(secrets?.api_key) ? "API key issued" : "No API key yet",
      },
      {
        id: "ingame",
        title: "In-Game Features",
        desc: "Message logger, auto-rank, AFK confirmation — all toggled per workspace.",
        icon: Gamepad2,
        accent: "from-amber-500/20 to-amber-500/5 text-amber-400",
        section: "tracking",
        status: (extras?.message_logger_enabled || extras?.auto_rank_enabled) ? "connected" : "optional",
        detail: [
          extras?.message_logger_enabled && "Message logger",
          extras?.auto_rank_enabled && "Auto-rank",
        ].filter(Boolean).join(" · ") || "All off",
      },
    ];
  }, [secrets, extras]);

  const filtered = tiles.filter((t) => {
    if (filter === "connected") return t.status === "connected";
    if (filter === "needs") return t.status === "missing";
    return true;
  });

  const connectedCount = tiles.filter(t => t.status === "connected").length;

  if (!loading && !isOwner) {
    return (
      <DashboardLayout title="Integrations">
        <div className="max-w-md mx-auto mt-20 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Owner only</h1>
          <p className="text-sm text-muted-foreground">Only the workspace owner can manage integrations.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Integrations">
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Plug className="w-5 h-5 text-primary" />
              Integrations
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {fetched
                ? `${connectedCount} of ${tiles.length} connected for ${workspace?.name || "your workspace"}.`
                : "Loading integration status…"}
            </p>
          </div>
          <div className="flex gap-1 bg-secondary/40 rounded-lg p-1">
            {(["all", "connected", "needs"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "all" ? "All" : f === "connected" ? "Connected" : "Needs setup"}
              </button>
            ))}
          </div>
        </div>

        {!fetched ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((tile) => {
              const Icon = tile.icon;
              const dot = tile.status === "connected" ? "bg-success" : tile.status === "missing" ? "bg-warning" : "bg-muted-foreground/50";
              return (
                <Link
                  key={tile.id}
                  to={`../settings?section=${tile.section}`}
                  relative="path"
                  className="group glass rounded-xl p-5 hover:bg-muted/30 transition-all hover:-translate-y-0.5 relative overflow-hidden"
                >
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", tile.accent.split(" ").slice(0, 2).join(" "))} />
                  <div className="relative space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={cn("w-10 h-10 rounded-lg bg-background/60 flex items-center justify-center", tile.accent.split(" ").slice(-1)[0])}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
                        {tile.status === "connected" ? "Connected" : tile.status === "missing" ? "Needs setup" : "Optional"}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{tile.title}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tile.desc}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <span className="text-[11px] text-muted-foreground truncate">{tile.detail}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && fetched && (
          <div className="glass rounded-xl p-10 text-center">
            <p className="text-sm text-muted-foreground">Nothing matches that filter.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
