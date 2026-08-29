import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

export type LandingThemeKey = "fluxcore" | "nexus";

const THEMES: { key: LandingThemeKey; name: string; desc: string }[] = [
  {
    key: "fluxcore",
    name: "Fluxcore (current)",
    desc: "The refreshed landing page — bold headline, Trusted By strip, capability grid and the security block.",
  },
  {
    key: "nexus",
    name: "Nexus landing page",
    desc: "The previous Nexus-styled landing page with the original hero, product window and layout.",
  },
];

export default function LandingThemeTab() {
  const [active, setActive] = useState<LandingThemeKey>("fluxcore");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<LandingThemeKey | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "landing_theme")
        .maybeSingle();
      const v = (data?.value as any)?.theme;
      if (v === "nexus" || v === "fluxcore") setActive(v);
      setLoading(false);
    })();
  }, []);

  const apply = async (key: LandingThemeKey) => {
    setSaving(key);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "landing_theme", value: { theme: key } }, { onConflict: "key" });
    setSaving(null);
    if (error) {
      toast.error("Could not save the landing theme");
      return;
    }
    setActive(key);
    toast.success("Landing theme updated for everyone");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading landing theme…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Landing theme</h2>
        <p className="text-sm text-muted-foreground">
          Choose which landing page every visitor sees on fluxcore.works.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {THEMES.map((t) => (
          <Card
            key={t.key}
            className={`p-5 border transition-colors ${
              active === t.key ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-semibold">{t.name}</h3>
              {active === t.key && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Check className="w-3.5 h-3.5" /> Live
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t.desc}</p>
            <Button
              size="sm"
              variant={active === t.key ? "secondary" : "default"}
              disabled={active === t.key || saving !== null}
              onClick={() => apply(t.key)}
            >
              {saving === t.key ? "Applying…" : active === t.key ? "In use" : "Use this theme"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
