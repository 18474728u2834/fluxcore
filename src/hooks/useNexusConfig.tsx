import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NexusVersion = "v1" | "v2";
export type NexusRailMode = "hover" | "icons";

export interface NexusConfig {
  version: NexusVersion;
  /** Nav keys hidden in V2 (e.g. "kudos", "promotions", "members") */
  hiddenNav: string[];
  /** Ordered dashboard card ids shown in V2 */
  cards: string[];
  /** Show the big hero banner in V2 */
  showHero: boolean;
  /** Optional custom hero headline in V2 */
  heroTitle: string;
  /** Sidebar rail: expand with labels on hover, or stay icon-only */
  railMode: NexusRailMode;
}

export const NEXUS_NAV_KEYS = [
  "dashboard", "activity", "documents", "loa", "members", "sessions",
  "quotas", "wall", "kudos", "promotions", "applications", "roles", "staff",
] as const;

export const NEXUS_CARDS: { id: string; label: string; desc: string }[] = [
  { id: "game",         label: "Game / Quick play", desc: "Play tile for the workspace game" },
  { id: "birthdays",    label: "Birthdays",         desc: "Team birthdays happening today" },
  { id: "new_members",  label: "New to the team",   desc: "People who joined this week" },
  { id: "sessions",     label: "Upcoming sessions", desc: "Next scheduled sessions" },
  { id: "activity",     label: "Session activity",  desc: "Latest in-game activity sessions" },
  { id: "quotas",       label: "Quotas",            desc: "Active workspace quotas" },
  { id: "announcements",label: "Announcements",     desc: "Latest posts from the Wall" },
  { id: "kudos",        label: "Kudos feed",        desc: "Recent shoutouts" },
];

export const DEFAULT_NEXUS_CONFIG: NexusConfig = {
  version: "v1",
  hiddenNav: [],
  cards: ["game", "birthdays", "new_members", "sessions", "activity"],
  showHero: true,
  heroTitle: "",
};

export function normalizeNexusConfig(raw: any): NexusConfig {
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    version: c.version === "v2" ? "v2" : "v1",
    hiddenNav: Array.isArray(c.hiddenNav) ? c.hiddenNav.filter((k: any) => typeof k === "string") : [],
    cards: Array.isArray(c.cards) && c.cards.length
      ? c.cards.filter((k: any) => NEXUS_CARDS.some(card => card.id === k))
      : DEFAULT_NEXUS_CONFIG.cards,
    showHero: c.showHero !== false,
    heroTitle: typeof c.heroTitle === "string" ? c.heroTitle : "",
  };
}

// Tiny module-level cache so Shell + Dashboard share one fetch and stay in sync.
const cache = new Map<string, NexusConfig>();
const inflight = new Map<string, Promise<NexusConfig>>();
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }

async function load(workspaceId: string): Promise<NexusConfig> {
  if (cache.has(workspaceId)) return cache.get(workspaceId)!;
  if (inflight.has(workspaceId)) return inflight.get(workspaceId)!;
  const p = (async () => {
    const { data } = await supabase.rpc("get_nexus_config", { _workspace_id: workspaceId });
    const cfg = normalizeNexusConfig(data);
    cache.set(workspaceId, cfg);
    inflight.delete(workspaceId);
    emit();
    return cfg;
  })();
  inflight.set(workspaceId, p);
  return p;
}

export function useNexusConfig(workspaceId?: string) {
  const [config, setConfig] = useState<NexusConfig>(() =>
    (workspaceId && cache.get(workspaceId)) || DEFAULT_NEXUS_CONFIG);
  const [loading, setLoading] = useState(!(workspaceId && cache.has(workspaceId)));

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    const sync = () => {
      const c = cache.get(workspaceId);
      if (c && !cancelled) setConfig(c);
    };
    listeners.add(sync);
    load(workspaceId).then(() => { if (!cancelled) { sync(); setLoading(false); } });
    return () => { cancelled = true; listeners.delete(sync); };
  }, [workspaceId]);

  const save = useCallback(async (next: NexusConfig) => {
    if (!workspaceId) return { error: new Error("no workspace") } as any;
    const { error } = await supabase.rpc("set_nexus_config", {
      _workspace_id: workspaceId,
      _config: next as any,
    });
    if (!error) { cache.set(workspaceId, next); emit(); }
    return { error };
  }, [workspaceId]);

  return { config, loading, save };
}
