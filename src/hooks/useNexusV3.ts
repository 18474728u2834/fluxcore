import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Nexus UI 3.0 is an invite-only trial. A Fluxcore admin grants access per
 * workspace from Admin → Trials; everyone else never sees the option.
 */
const cache = new Map<string, boolean>();

export function useNexusV3Trial(workspaceId?: string) {
  const [enabled, setEnabled] = useState<boolean>(() => (workspaceId ? cache.get(workspaceId) ?? false : false));
  const [loading, setLoading] = useState(!(workspaceId && cache.has(workspaceId)));

  useEffect(() => {
    if (!workspaceId) { setEnabled(false); setLoading(false); return; }
    if (cache.has(workspaceId)) { setEnabled(cache.get(workspaceId)!); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("nexus_v3_trials")
        .select("workspace_id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      const ok = !!data;
      cache.set(workspaceId, ok);
      if (!cancelled) { setEnabled(ok); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  return { enabled, loading };
}
