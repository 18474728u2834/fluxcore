import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Info, AlertTriangle, CheckCircle2, X } from "lucide-react";

type Banner = {
  id: string;
  message: string;
  level: string;
  link_url: string | null;
  link_label: string | null;
  active: boolean;
  placement: string;
  starts_at: string | null;
  ends_at: string | null;
};

const LEVEL_STYLES: Record<string, { bg: string; icon: any }> = {
  info: { bg: "bg-primary/10 border-primary/30 text-primary-foreground", icon: Info },
  warning: { bg: "bg-amber-500/10 border-amber-500/30 text-amber-200", icon: AlertTriangle },
  critical: { bg: "bg-red-500/10 border-red-500/30 text-red-200", icon: AlertCircle },
  success: { bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-200", icon: CheckCircle2 },
};

export function SiteBanner({ placement }: { placement: "marketing" | "workspaces" }) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("fluxcore_banner_dismissed") || "[]"); } catch { return []; }
  });
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    (async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("site_banners")
        .select("*")
        .eq("active", true)
        .in("placement", [placement, "all"])
        .order("created_at", { ascending: false })
        .limit(5);
      const active = (data as Banner[] || []).find(b =>
        (!b.starts_at || b.starts_at <= now) && (!b.ends_at || b.ends_at >= now)
      );
      setBanner(active || null);
    })();
  }, [placement]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 0) {
        setVisible(true);
      } else if (y > lastScrollY.current) {
        setVisible(true);
      } else {
        setVisible(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dismiss = () => {
    if (!banner) return;
    const next = [...dismissed, banner.id];
    setDismissed(next);
    localStorage.setItem("fluxcore_banner_dismissed", JSON.stringify(next));
  };

  if (!banner || dismissed.includes(banner.id)) return null;
  const meta = LEVEL_STYLES[banner.level] || LEVEL_STYLES.info;
  const Icon = meta.icon;

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-[60] w-full border-b ${meta.bg} text-foreground transition-transform duration-300 ${visible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3 text-sm">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="flex-1">{banner.message}</span>
          {banner.link_url && (
            <a href={banner.link_url} target={banner.link_url.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
               className="font-medium underline shrink-0 hover:opacity-80">
              {banner.link_label || "Learn more"}
            </a>
          )}
          <button onClick={dismiss} className="opacity-60 hover:opacity-100 shrink-0" aria-label="Dismiss"><X className="w-4 h-4" /></button>
        </div>
      </div>
      {visible && <div className="h-10" aria-hidden="true" />}
    </>
  );
}
