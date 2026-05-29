import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, Users, Sparkles } from "lucide-react";

export interface PartnerConfig {
  subdomain: string;
  workspace_id: string;
  name: string;
  tagline?: string | null;
  logo_url?: string | null;
  accent_color?: string | null;
  roblox_group_url?: string | null;
  links: { label: string; url: string }[];
}

export default function PartnerPortal({ config }: { config: PartnerConfig }) {
  const navigate = useNavigate();
  const accent = config.accent_color || "#10b981";

  useEffect(() => {
    document.title = `${config.name} · Staff Portal`;
  }, [config.name]);

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: "#04101c" }}>
      {/* Aurora background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div
          className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full blur-[150px] animate-pulse"
          style={{ background: accent, animationDuration: "7s" }}
        />
        <div
          className="absolute -bottom-40 -right-20 w-[600px] h-[600px] rounded-full blur-[150px] animate-pulse"
          style={{ background: accent, animationDuration: "9s", opacity: 0.5 }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-3">
            {config.logo_url ? (
              <img src={config.logo_url} alt={config.name} className="w-11 h-11 rounded-xl ring-1 ring-white/15" />
            ) : (
              <div
                className="w-11 h-11 rounded-xl ring-1 ring-white/15 flex items-center justify-center text-white font-bold text-lg"
                style={{ background: accent }}
              >
                {config.name[0]}
              </div>
            )}
            <span className="text-xl font-bold tracking-wide">{config.name}</span>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="px-5 h-10 rounded-full font-semibold text-sm transition-all hover:scale-[1.03]"
            style={{ background: accent, color: "#04101c" }}
          >
            Staff Sign In
          </button>
        </header>

        <section className="text-center space-y-6 mb-20">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.18em] font-medium border"
            style={{ borderColor: `${accent}40`, background: `${accent}15`, color: accent }}
          >
            <Sparkles className="w-3 h-3" /> {config.name} Staff Portal
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] max-w-3xl mx-auto">
            Welcome to{" "}
            <span className="bg-gradient-to-br from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              {config.name}.
            </span>
          </h1>
          {config.tagline && (
            <p className="text-white/65 text-lg max-w-2xl mx-auto leading-relaxed">{config.tagline}</p>
          )}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => navigate("/login")}
              className="px-6 h-12 rounded-full font-semibold inline-flex items-center gap-2 transition-all hover:scale-[1.03]"
              style={{ background: accent, color: "#04101c" }}
            >
              Enter Staff Portal <ArrowRight className="w-4 h-4" />
            </button>
            {config.roblox_group_url && (
              <a
                href={config.roblox_group_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 h-12 rounded-full font-semibold inline-flex items-center gap-2 border border-white/15 hover:bg-white/5 transition-all"
              >
                <Users className="w-4 h-4" /> Join Group
              </a>
            )}
          </div>
        </section>

        {config.links?.length > 0 && (
          <section className="grid sm:grid-cols-2 gap-4">
            {config.links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex items-center justify-between hover:bg-white/[0.06] transition-all"
              >
                <span className="font-semibold">{l.label}</span>
                <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
              </a>
            ))}
          </section>
        )}

        <footer className="text-center text-xs text-white/30 mt-20">
          © {new Date().getFullYear()} {config.name} · Powered by Fluxcore
        </footer>
      </div>
    </div>
  );
}
