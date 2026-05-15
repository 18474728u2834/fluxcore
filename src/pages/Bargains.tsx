import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  ArrowRight,
  Loader2,
  Sparkles,
  Users,
  Calendar,
  Crown,
  Briefcase,
  ShieldCheck,
  GraduationCap,
  ExternalLink,
} from "lucide-react";

const WORKSPACE_ID = "81bd37c3-fb0a-465a-86b5-de4cfed43a09";
const APPLY_URL = "https://bloxybargains.xyz/";
const GROUP_URL = "https://www.roblox.com/communities/11877226/Bloxy-Bargains-PLC";
const MAIN_GAME = "https://www.roblox.com/games/140650538395960/Bloxy-Bargains-Oxford";
const TRAINING = "https://www.roblox.com/games/14732715654/Training-Centre";

// Brand palette (Bloxy Bargains): warm cream + red accent, ink text.
// We deliberately use raw brand colors here (not the dark Fluxcore tokens)
// because this is a partner-branded portal page.
const INK = "#1f1410";
const CREAM = "#fdf6e8";
const RED = "#ef4444";

export default function Bargains() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleContinue = () => {
    if (user) navigate(`/w/${WORKSPACE_ID}/dashboard`);
    else navigate("/login");
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: CREAM, color: INK, fontFamily: "'Outfit', system-ui, sans-serif" }}
    >
      {/* Soft brand blobs */}
      <div
        className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #67e8f9 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-40 -right-32 w-[520px] h-[520px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #fda4af 0%, transparent 70%)" }}
      />
      {/* Dotted texture */}
      <div
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(${INK} 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center border-2"
            style={{ background: "#fff", borderColor: INK }}
          >
            <ShoppingBag className="w-5 h-5" style={{ color: INK }} />
          </div>
          <div className="leading-tight">
            <p className="font-extrabold text-lg">Bloxy Bargains</p>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Staff Portal</p>
          </div>
        </div>
        <a
          href={APPLY_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
        >
          Not staff? Apply <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        {/* Hero */}
        <section className="text-center pt-10 md:pt-16 pb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 mb-7 text-xs font-semibold"
            style={{ background: "#fff", borderColor: INK }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: RED }} />
            EST 2023 · Oxford, UK
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95] mb-6">
            Welcome back,
            <br />
            <span className="relative inline-block">
              <span style={{ color: RED }}>shop</span>
              <span style={{ color: "#f59e0b" }}> floor </span>
              <span style={{ color: "#0891b2" }}>crew.</span>
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                preserveAspectRatio="none"
                style={{ height: 10 }}
              >
                <path
                  d="M2 8 Q 75 2 150 6 T 298 5"
                  stroke={RED}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="text-lg md:text-xl opacity-70 max-w-2xl mx-auto mb-10">
            Your home for managing shifts, sessions, trainings and the team behind
            Roblox's friendliest little shopping experience.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleContinue}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white border-2 shadow-[4px_4px_0_0_#1f1410] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1f1410] active:translate-y-1 active:shadow-none transition-all min-w-[220px]"
              style={{ background: RED, borderColor: INK }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {user ? "Open dashboard" : "Sign in to portal"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <a
              href={APPLY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold border-2 bg-white shadow-[4px_4px_0_0_#1f1410] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1f1410] active:translate-y-1 active:shadow-none transition-all min-w-[220px]"
              style={{ borderColor: INK, color: INK }}
            >
              Want to join the team?
            </a>
          </div>
        </section>

        {/* Stat cards */}
        <section className="grid sm:grid-cols-3 gap-4 mb-16">
          {[
            { icon: Crown, label: "Owner", value: "Archie", tint: "#fde68a" },
            { icon: Users, label: "Group Members", value: "581+", tint: "#bae6fd" },
            { icon: Calendar, label: "Founded", value: "2023", tint: "#fecaca" },
          ].map(({ icon: Icon, label, value, tint }) => (
            <div
              key={label}
              className="rounded-3xl border-2 p-6 bg-white shadow-[6px_6px_0_0_#1f1410] hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_#1f1410] transition-all"
              style={{ borderColor: INK }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 mb-4"
                style={{ background: tint, borderColor: INK }}
              >
                <Icon className="w-5 h-5" style={{ color: INK }} />
              </div>
              <p className="text-[10px] uppercase tracking-[0.18em] opacity-60 mb-1">{label}</p>
              <p className="text-2xl font-extrabold">{value}</p>
            </div>
          ))}
        </section>

        {/* Not staff CTA */}
        <section
          className="relative rounded-[2rem] border-2 p-8 md:p-12 mb-16 overflow-hidden"
          style={{ borderColor: INK, background: "linear-gradient(135deg, #fff 0%, #fff5e6 100%)" }}
        >
          <div className="absolute top-6 right-6 hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border-2"
            style={{ borderColor: INK, background: "#fef3c7" }}>
            <Sparkles className="w-3 h-3" /> Now hiring
          </div>

          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              Don't work here yet? <span style={{ color: RED }}>Come build it with us.</span>
            </h2>
            <p className="opacity-70 mb-6 text-base md:text-lg">
              We hire across staff, security and management. No résumé, no email — just
              your Roblox account and a few questions.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              {[
                { icon: Briefcase, label: "Staff" },
                { icon: ShieldCheck, label: "Security" },
                { icon: GraduationCap, label: "Management" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 bg-white"
                  style={{ borderColor: INK }}
                >
                  <Icon className="w-4 h-4" style={{ color: RED }} />
                  <span className="font-semibold text-sm">{label}</span>
                </div>
              ))}
            </div>

            <a
              href={APPLY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white border-2 shadow-[4px_4px_0_0_#1f1410] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1f1410] active:translate-y-1 active:shadow-none transition-all"
              style={{ background: INK, borderColor: INK }}
            >
              Open the application centre
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Quick links */}
        <section className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { label: "Roblox group", href: GROUP_URL, desc: "Join the community group" },
            { label: "Main game", href: MAIN_GAME, desc: "Bloxy Bargains Oxford" },
            { label: "Training centre", href: TRAINING, desc: "Practice your role" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border-2 p-5 bg-white hover:bg-[#fff7eb] transition-colors"
              style={{ borderColor: INK }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-base mb-1">{l.label}</p>
                  <p className="text-sm opacity-60">{l.desc}</p>
                </div>
                <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </section>

        <footer className="text-center text-xs opacity-50 pt-4">
          © {new Date().getFullYear()} Bloxy Bargains PLC · Staff Portal · Powered by Fluxcore
        </footer>
      </main>
    </div>
  );
}
