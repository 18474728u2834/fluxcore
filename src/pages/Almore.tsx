import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Users,
  Crown,
  Sparkles,
  ShoppingBag,
  Loader2,
  Star,
  Leaf,
  Award,
  CheckCircle2,
} from "lucide-react";

const ROBLOX_GROUP_ID = "16109128";
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;

export default function Almore() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [groupIcon, setGroupIcon] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Almore Shopping LTD — Staff Portal";
    (async () => {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/functions/v1/roblox-group-icon?groupIds=${ROBLOX_GROUP_ID}`,
        );
        const j = await r.json();
        const img = j?.data?.[0]?.imageUrl;
        if (img) setGroupIcon(img);
      } catch {}
    })();
  }, []);

  const handleContinue = () => {
    if (user) navigate("/workspaces");
    else navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#07100c] text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-grid opacity-[0.05] pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-emerald-500/15 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-amber-400/10 blur-[160px] pointer-events-none" />

      {/* Top nav */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {groupIcon ? (
            <img src={groupIcon} alt="" className="w-9 h-9 rounded-lg ring-1 ring-white/15" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-700 ring-1 ring-white/15" />
          )}
          <span className="text-sm font-semibold tracking-wide">ALMORE</span>
        </div>
        <a
          href="https://www.roblox.com/communities/16109128/Almore-Shopping-LTD"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          View on Roblox →
        </a>
      </nav>

      <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-24">
        {/* Hero */}
        <header className="text-center space-y-6 mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-[11px] uppercase tracking-[0.18em] text-emerald-300 font-medium">
            <Sparkles className="w-3 h-3" /> Official Staff Portal
          </div>

          {groupIcon && (
            <img
              src={groupIcon}
              alt="Almore Shopping LTD"
              className="w-28 h-28 mx-auto rounded-3xl ring-1 ring-white/10 shadow-[0_20px_80px_-20px_rgba(16,185,129,0.5)]"
            />
          )}

          <div className="space-y-3">
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-br from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">
                Almore
              </span>
            </h1>
            <p className="text-base md:text-lg text-emerald-200/70 font-medium tracking-wide">
              Shopping LTD · #Quality foods in one place
            </p>
          </div>

          <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            The official internal hub for the Almore staff team. Coordinate shifts, run trainings,
            track activity and keep one of Roblox's biggest shopping communities running smooth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={loading}
              className="min-w-[220px] bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold shadow-[0_10px_40px_-10px_rgba(16,185,129,0.6)]"
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
            <a
              href="https://www.roblox.com/communities/16109128/Almore-Shopping-LTD"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 hover:text-white px-4 py-2 transition-colors"
            >
              Apply to join the team →
            </a>
          </div>
        </header>

        {/* Stat strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-20">
          {[
            { icon: Users, label: "Members", value: "68K+" },
            { icon: Crown, label: "Owner", value: "AlmoreShopping" },
            { icon: Star, label: "Founded", value: "Roblox" },
            { icon: Award, label: "Status", value: "Verified" },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 backdrop-blur-sm hover:border-emerald-400/30 hover:bg-white/[0.05] transition-all"
            >
              <s.icon className="w-5 h-5 text-emerald-400 mb-3" />
              <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] mb-1">{s.label}</p>
              <p className="text-base font-semibold truncate">{s.value}</p>
            </div>
          ))}
        </section>

        {/* About card */}
        <section className="grid md:grid-cols-5 gap-4 mb-20">
          <div className="md:col-span-3 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-white/[0.02] to-transparent border border-white/10 p-8 md:p-10">
            <div className="flex items-center gap-2 mb-4 text-emerald-300 text-xs uppercase tracking-[0.15em] font-medium">
              <ShoppingBag className="w-4 h-4" /> About Almore
            </div>
            <h2 className="text-3xl font-bold mb-5 leading-tight">
              A role-playing supermarket with quality foods, fresh prices, and a global community.
            </h2>
            <div className="space-y-4 text-white/65 leading-relaxed text-[15px]">
              <p>
                Almore Shopping LTD is one of Roblox's largest shopping experiences — a place where
                tens of thousands of players come to shop, work, and hang out with friends in a
                relaxed, welcoming environment.
              </p>
              <p>
                This portal is built for the Almore staff team. Every shift, training and promotion
                lives here, powered by Fluxcore.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 rounded-3xl bg-white/[0.03] border border-white/10 p-8 flex flex-col justify-between">
            <div>
              <Leaf className="w-6 h-6 text-emerald-400 mb-4" />
              <h3 className="text-lg font-semibold mb-3">Built for the team</h3>
              <ul className="space-y-3 text-sm text-white/60">
                {[
                  "Live activity tracking",
                  "Session scheduling",
                  "Auto rank promotions",
                  "Staff applications",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 text-[11px] text-white/40">
              Powered by{" "}
              <a href="https://fluxcore.works" className="text-emerald-300 hover:text-emerald-200">
                Fluxcore
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-white/30 space-y-1">
          <p>© {new Date().getFullYear()} Almore Shopping LTD · All rights reserved.</p>
          <p>Staff Portal · almore.fluxcore.works</p>
        </footer>
      </div>
    </div>
  );
}
