import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeDesign, type SiteDesign } from "@/lib/siteDesign";

const cache = new Map<string, SiteDesign | null>();

/** Loads the active published design for a target ("landing" | "workspace"). */
export function useActiveSiteDesign(target: "landing" | "workspace") {
  const [design, setDesign] = useState<SiteDesign | null>(() => cache.get(target) ?? null);
  const [loading, setLoading] = useState(!cache.has(target));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_designs")
        .select("*")
        .eq("target", target)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const d = data ? normalizeDesign(data) : null;
      cache.set(target, d);
      if (!cancelled) { setDesign(d); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [target]);

  return { design, loading };
}
