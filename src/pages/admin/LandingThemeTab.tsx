import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { LANDING_THEMES, type LandingTheme } from "@/hooks/useLandingTheme";

export default function LandingThemeTab() {
  const [theme, setTheme] = useState<LandingTheme>("classic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<LandingTheme | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "landing_theme")
        .maybeSingle();
      const t = (data?.value as { theme?: string } | null)?.theme;
      if (t === "classic" || t === "aurora" || t === "terminal") setTheme(t);
      setLoading(false);
    })();
  }, []);

  const save = async (next: LandingTheme) => {
    setSaving(next);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "landing_theme", value: { theme: next }, updated_at: new Date().toISOString() });
    setSaving(null);
    if (error) return toast.error(error.message || "Failed to save");
    setTheme(next);
    try { localStorage.setItem("fluxcore-landing-theme", next); } catch {}
    toast.success("Landing page design updated for everyone");
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Landing page design</h2>
        <p className="text-sm text-muted-foreground">
          Pick the homepage design every visitor sees. Preview any design with <code>?theme=</code> before switching.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {LANDING_THEMES.map((t) => {
          const active = t.value === theme;
          return (
            <div
              key={t.value}
              className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
                active ? "border-primary bg-primary/5" : "border-border/50 bg-card/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t.label}</span>
                {active && <span className="text-[11px] font-semibold text-primary flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Live</span>}
              </div>
              <p className="text-[13px] text-muted-foreground flex-1">{t.desc}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={active || saving === t.value} onClick={() => save(t.value)}>
                  {saving === t.value ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : active ? "Active" : "Use this"}
                </Button>
                <a
                  href={`/?theme=${t.value}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Preview <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
