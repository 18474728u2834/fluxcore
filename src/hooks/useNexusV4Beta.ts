import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, boolean>();

export function useNexusV4Beta(workspaceId?: string) {
  const [enabled, setEnabled] = useState(() => workspaceId ? cache.get(workspaceId) ?? false : false);
  const [loading, setLoading] = useState(() => !!workspaceId && !cache.has(workspaceId));

  useEffect(() => {
    if (!workspaceId) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(!cache.has(workspaceId));
    supabase.rpc("has_nexus_v4_beta", { _workspace_id: workspaceId }).then(({ data, error }) => {
      if (cancelled) return;
      const allowed = !error && data === true;
      cache.set(workspaceId, allowed);
      setEnabled(allowed);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [workspaceId]);

  return { enabled, loading };
}