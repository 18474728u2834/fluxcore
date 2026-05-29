import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";

export type ThemeKey = "bargains" | "almore" | "shoply";

interface PortalConfig {
  workspace_id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  accent_color: string | null;
  roblox_group_url: string | null;
  links: { label: string; url: string }[];
}

const THEMES: Record<ThemeKey, {
  bg: string;
  text: string;
  accentBtn: string;
  accentText: string;
  accentBorder: string;
  glow1: string;
  glow2: string;
  gradientText: string;
  pill: string;
  cardBg: string;
}> = {
  bargains: {
    bg: "bg-[#06121f]",
    text: "text-white",
    accentBtn: "bg-sky-500 hover:bg-sky-400 text-sky-950",
    accentText: "text-sky-300",
    accentBorder: "border-sky-400/20",
    glow1: "bg-sky-500/15",
    glow2: "bg-cyan-400/10",
    gradientText: "from-white via-sky-100 to-sky-300",
    pill: "bg-sky-400/10 border-sky-400/20 text-sky-300",
    cardBg: "bg-white/[0.03] border-white/10",
  },
  almore: {
    bg: "bg-[#07100c]",
    text: "text-white",
    accentBtn: "bg-emerald-500 hover:bg-emerald-400 text-emerald-950",
    accentText: "text-emerald-300",
    accentBorder: "border-emerald-400/20",
    glow1: "bg-emerald-500/15",
    glow2: "bg-amber-400/10",
    gradientText: "from-white via-emerald-100 to-emerald-300",
    pill: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300",
    cardBg: "bg-white/[0.03] border-white/10",
  },
  shoply: {
    bg: "bg-[#04101c]",
    text: "text-white",
    accentBtn: "bg-violet-500 hover:bg-violet-400 text-violet-950",
    accentText: "text-violet-300",
    accentBorder: "border-violet-400/20",
    glow1: "bg-violet-500/15",
    glow2: "bg-fuchsia-400/10",
    gradientText: "from-white via-violet-100 to-violet-300",
    pill: "bg-violet-400/10 border-violet-400/20 text-violet-300",
    cardBg: "bg-white/[0.03] border-white/10",
  },
};

export default function ThemedPortal({ theme, config }: { theme: ThemeKey; config: PortalConfig }) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const t = THEMES[theme];

  useEffect(() => {
    document.title = `${config.name} — Staff Portal`;
  }, [config.name]);

  const handleContinue = () => {
    if (user) navigate(`/w/${config.workspace_id}/dashboard`);
    else navigate("/login");
  };

  const accent = config.accent_color || undefined;

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} relative overflow-hidden`}>
      <div className="absolute inset-0 bg-grid opacity-[0.05] pointer-events-none" />
      <div className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full ${t.glow1} blur-[180px] pointer-events-none animate-pulse`} style={{ animationDuration: "6s" }} />
      <div className={`absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full ${t.glow2} blur-[160px] pointer-events-none animate-pulse`} style={{ animationDuration: "8s" }} />

      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.logo_url ? (
            <img src={config.logo_url} alt="" className="w-9 h-9 rounded-lg ring-1 ring-white/15 object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-lg ring-1 ring-white/15" style={{ background: accent || "#38bdf8" }} />
          )}
          <span className="text-sm font-semibold tracking-wide uppercase">{config.name}</span>
        </div>
        {config.roblox_group_url && (
          <a href={config.roblox_group_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors">
            Roblox <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </nav>

      <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-24">
        <header className="text-center space-y-6 mb-20">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${t.pill} text-[11px] uppercase tracking-[0.18em] font-medium`}>
            <Sparkles className="w-3 h-3" /> Official Staff Portal
          </div>

          {config.logo_url && (
            <img
              src={config.logo_url}
              alt={config.name}
              className="w-28 h-28 mx-auto rounded-3xl ring-1 ring-white/10 object-cover hover:scale-105 hover:rotate-3 transition-transform duration-500"
            />
          )}

          <div className="space-y-3">
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
              <span className={`bg-gradient-to-br ${t.gradientText} bg-clip-text text-transparent`}>
                {config.name}
              </span>
            </h1>
            {config.tagline && (
              <p className={`text-base md:text-lg ${t.accentText} font-medium tracking-wide opacity-80`}>
                {config.tagline}
              </p>
            )}
          </div>

          <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            The official internal hub for the {config.name} staff team. Coordinate shifts,
            run trainings, track activity and keep your community running smooth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={loading}
              className={`min-w-[220px] ${t.accentBtn} font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {user ? "Enter Staff Portal" : "Sign In With Roblox"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
            {config.roblox_group_url && (
              <a
                href={config.roblox_group_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/50 hover:text-white px-4 py-2 transition-colors"
              >
                Apply to join the team →
              </a>
            )}
          </div>
        </header>

        <section className={`grid md:grid-cols-2 gap-4 mb-16`}>
          <div className={`rounded-3xl ${t.cardBg} border p-8`}>
            <h3 className="text-lg font-semibold mb-4">Built for the team</h3>
            <ul className="space-y-3 text-sm text-white/65">
              {["Live activity tracking", "Session scheduling", "Auto rank promotions", "Staff applications", "Training resources", "Discord integration"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${t.accentText} shrink-0`} /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className={`rounded-3xl ${t.cardBg} border p-8`}>
            <h3 className="text-lg font-semibold mb-4">Important links</h3>
            {config.links && config.links.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {config.links.map((l, i) => (
                  <li key={i}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 text-white/75 hover:${t.accentText} transition-colors`}>
                      {l.label} <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/40">No links yet.</p>
            )}
          </div>
        </section>

        <section className="mb-12">
          <div className={`relative rounded-3xl overflow-hidden border ${t.accentBorder} p-10 md:p-14 text-center ${t.cardBg}`}>
            <div className="relative space-y-5 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">Ready to clock in?</h2>
              <p className="text-white/60 text-base">
                Sign in with your Roblox account to access shifts, sessions, and your full {config.name} staff dashboard.
              </p>
              <Button
                size="lg"
                onClick={handleContinue}
                disabled={loading}
                className={`min-w-[220px] ${t.accentBtn} font-semibold`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{user ? "Enter Staff Portal" : "Sign In With Roblox"} <ArrowRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-white/30 space-y-1">
          <p>© {new Date().getFullYear()} {config.name} · Staff Portal · Powered by Fluxcore</p>
        </footer>
      </div>
    </div>
  );
}
