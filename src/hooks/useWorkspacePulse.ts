import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PulseSession {
  id: string;
  title: string;
  scheduled_at: string;
  host_name: string | null;
  category: string | null;
}

export interface WorkspacePulse {
  staffInGame: number;
  loaPending: number;
  promotionsPending: number;
  nextSession: PulseSession | null;
  upcoming: PulseSession[];
  loading: boolean;
  refresh: () => void;
}

/**
 * Live operational signal for a workspace: who is in game right now, what is
 * waiting for a decision, and what happens next. Shared by the Nexus 4.0 shell
 * inbox and the 4.0 dashboard briefing.
 */
export function useWorkspacePulse(workspaceId?: string): WorkspacePulse {
  const [staffInGame, setStaffInGame] = useState(0);
  const [loaPending, setLoaPending] = useState(0);
  const [promotionsPending, setPromotionsPending] = useState(0);
  const [upcoming, setUpcoming] = useState<PulseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    const load = async () => {
      const nowIso = new Date().toISOString();
      const [live, loa, noms, sessions] = await Promise.all([
        supabase.from("activity_sessions")
          .select("roblox_user_id")
          .eq("workspace_id", workspaceId).is("left_at", null).eq("discarded", false),
        supabase.from("loa_requests")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("status", "pending"),
        supabase.from("promotion_nominations")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("status", "pending"),
        supabase.from("scheduled_sessions")
          .select("id, title, scheduled_at, host_name, category")
          .eq("workspace_id", workspaceId)
          .gte("scheduled_at", nowIso)
          .order("scheduled_at", { ascending: true })
          .limit(4),
      ]);

      if (cancelled) return;
      setStaffInGame(new Set((live.data || []).map((r: any) => r.roblox_user_id)).size);
      setLoaPending(loa.count ?? 0);
      setPromotionsPending(noms.count ?? 0);
      setUpcoming((sessions.data || []) as PulseSession[]);
      setLoading(false);
    };

    load();
    const iv = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [workspaceId, tick]);

  return {
    staffInGame, loaPending, promotionsPending,
    nextSession: upcoming[0] || null,
    upcoming, loading, refresh,
  };
}

export function untilLabel(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}
