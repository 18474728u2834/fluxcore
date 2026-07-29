import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LandingTheme = "classic" | "aurora" | "terminal";

export const LANDING_THEMES: { value: LandingTheme; label: string; desc: string }[] = [
  { value: "classic", label: "Classic", desc: "The current gradient hero with the Nexus dashboard mockup." },
  { value: "aurora", label: "Aurora", desc: "Editorial split hero, soft aurora gradients, large type." },
  { value: "terminal", label: "Terminal", desc: "Dark mono, command-line energy, dense feature grid." },
];

const CACHE_KEY = "fluxcore-landing-theme";

function isTheme(v: unknown): v is LandingTheme {
  return v === "classic" || v === "aurora" || v === "terminal";
}

export function useLandingTheme() {
  const [theme, setTheme] = useState<LandingTheme>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (isTheme(cached)) return cached;
    } catch {}
    return "classic";
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "landing_theme")
        .maybeSingle();
      if (!alive) return;
      const next = (data?.value as { theme?: string } | null)?.theme;
      if (isTheme(next)) {
        setTheme(next);
        try { localStorage.setItem(CACHE_KEY, next); } catch {}
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { theme, loading };
}
