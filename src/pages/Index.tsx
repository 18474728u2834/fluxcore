import { useEffect, useState } from "react";
import LandingClassic from "@/pages/landing/LandingClassic";
import LandingNexus from "@/pages/landing/LandingNexus";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const [theme, setTheme] = useState<"fluxcore" | "nexus" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "landing_theme")
        .maybeSingle();
      if (cancelled) return;
      const v = (data?.value as any)?.theme;
      setTheme(v === "nexus" ? "nexus" : "fluxcore");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!theme) return <div className="min-h-screen bg-background" />;
  return theme === "nexus" ? <LandingNexus /> : <LandingClassic />;
}
