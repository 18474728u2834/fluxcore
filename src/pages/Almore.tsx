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
  ShoppingCart,
  Loader2,
  Star,
  Leaf,
  Award,
  CheckCircle2,
  Globe2,
  Heart,
  Briefcase,
  Headphones,
  Truck,
  Apple,
  Quote,
  ExternalLink,
} from "lucide-react";

const ROBLOX_GROUP_ID = "16109128";
const ROBLOX_GROUP_URL =
  "https://www.roblox.com/communities/16109128/Almore-Shopping-LTD";
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
        <div className="flex items-center gap-5 text-xs text-white/50">
          <a href="#about" className="hover:text-white transition-colors hidden sm:inline">About</a>
          <a href="#departments" className="hover:text-white transition-colors hidden sm:inline">Departments</a>
          <a href="#values" className="hover:text-white transition-colors hidden sm:inline">Values</a>
          <a
            href={ROBLOX_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-white transition-colors"
          >
            Roblox <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </nav>

      <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-24">
        {/* Hero */}
        <header className="text-center space-y-6 mb-24">
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
              href={ROBLOX_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 hover:text-white px-4 py-2 transition-colors"
            >
              Apply to join the team →
            </a>
          </div>
        </header>

        {/* Stat strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-24">
          {[
            { icon: Users, label: "Members", value: "68K+" },
            { icon: Crown, label: "Owner", value: "AlmoreShopping" },
            { icon: Globe2, label: "Players", value: "Worldwide" },
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

        {/* About */}
        <section id="about" className="grid md:grid-cols-5 gap-4 mb-24">
          <div className="md:col-span-3 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-white/[0.02] to-transparent border border-white/10 p-8 md:p-10">
            <div className="flex items-center gap-2 mb-4 text-emerald-300 text-xs uppercase tracking-[0.15em] font-medium">
              <ShoppingBag className="w-4 h-4" /> About Almore
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-[1.15]">
              A role-playing supermarket built around quality, community and a little bit of fun.
            </h2>
            <div className="space-y-4 text-white/65 leading-relaxed text-[15px]">
              <p>
                Almore Shopping LTD is a Roblox role-playing supermarket where tens of thousands of
                players shop for fresh products at fair prices, explore a hand-crafted map, and hang
                out with friends in a relaxed, welcoming environment.
              </p>
              <p>
                Whether you're stopping by for a quick grocery run, working a shift behind the till,
                or joining one of our community events — Almore is built to feel alive. Mobile,
                tablet, console or PC, the doors are always open.
              </p>
              <p>
                Behind the scenes, a dedicated staff team keeps the shelves stocked, the customers
                happy, and the standards high. This portal is their command centre.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {["Supermarket RP", "Mobile-friendly", "Family-safe", "Active staff", "Community-led"].map(
                (t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-200/80"
                  >
                    {t}
                  </span>
                ),
              )}
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
                  "Training centre",
                  "Discord integration",
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

        {/* Quote */}
        <section className="mb-24">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-500/[0.07] via-white/[0.02] to-amber-400/[0.05] p-10 md:p-14 overflow-hidden">
            <Quote className="absolute -top-4 left-8 w-24 h-24 text-emerald-400/10 rotate-180" />
            <p className="relative text-2xl md:text-3xl font-semibold leading-snug max-w-3xl">
              "Welcome to Almore Shopping. Quality foods, fair prices, and a place where every
              player feels at home — that's what we stand for."
            </p>
            <p className="relative mt-5 text-sm text-white/50">— The Almore Team</p>
          </div>
        </section>

        {/* Departments */}
        <section id="departments" className="mb-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2 text-emerald-300 text-xs uppercase tracking-[0.15em] font-medium">
                <Briefcase className="w-4 h-4" /> Inside the store
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">Departments that keep Almore running</h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: ShoppingCart,
                name: "Cashiers",
                desc: "The face of the store. Friendly checkout, clean tills, happy customers.",
              },
              {
                icon: Apple,
                name: "Stockers",
                desc: "Keep the shelves full and the produce fresh — the backbone of the floor.",
              },
              {
                icon: Truck,
                name: "Logistics",
                desc: "Deliveries, restocks, and behind-the-scenes operations across every shift.",
              },
              {
                icon: Headphones,
                name: "Customer Care",
                desc: "Helping shoppers find what they need and resolving any issues with a smile.",
              },
              {
                icon: Award,
                name: "Management",
                desc: "Leading shifts, mentoring new staff, and protecting the Almore standard.",
              },
              {
                icon: Crown,
                name: "Executives",
                desc: "Steering the future of Almore and partnering with the wider community.",
              },
            ].map((d) => (
              <div
                key={d.name}
                className="group rounded-2xl bg-white/[0.03] border border-white/10 p-6 hover:border-emerald-400/30 hover:bg-white/[0.05] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mb-4 group-hover:bg-emerald-400/20 transition-colors">
                  <d.icon className="w-5 h-5 text-emerald-300" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">{d.name}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section id="values" className="mb-24">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-12">
            <div className="flex items-center gap-2 mb-3 text-emerald-300 text-xs uppercase tracking-[0.15em] font-medium">
              <Heart className="w-4 h-4" /> What we stand for
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-10 leading-tight max-w-2xl">
              Three simple values guide every shift at Almore.
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  n: "01",
                  t: "Quality first",
                  d: "Fresh products, polished interiors, and roleplay that takes itself just seriously enough.",
                },
                {
                  n: "02",
                  t: "People over policy",
                  d: "Customers and coworkers come first. We hire for kindness, then we train for the rest.",
                },
                {
                  n: "03",
                  t: "Always growing",
                  d: "New maps, new products, new staff. Almore never sits still — and neither do we.",
                },
              ].map((v) => (
                <div key={v.n} className="space-y-3">
                  <span className="text-xs font-mono text-emerald-300/70 tracking-widest">{v.n}</span>
                  <h3 className="text-xl font-semibold">{v.t}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{v.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-16">
          <div className="relative rounded-3xl overflow-hidden border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-emerald-500/[0.04] to-transparent p-10 md:p-14 text-center">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-emerald-400/15 blur-[140px] pointer-events-none" />
            <div className="relative space-y-5 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Ready to clock in?
              </h2>
              <p className="text-white/60 text-base">
                Sign in with your Roblox account to access shifts, sessions, and your full
                Almore staff dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button
                  size="lg"
                  onClick={handleContinue}
                  disabled={loading}
                  className="min-w-[220px] bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold"
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
                  href={ROBLOX_GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center text-sm text-white/60 hover:text-white px-6 py-3 rounded-md border border-white/10 hover:border-white/20 transition-colors"
                >
                  Visit Almore on Roblox
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-white/30 space-y-1">
          <p>© {new Date().getFullYear()} Almore Shopping LTD · All rights reserved.</p>
          <p>Staff Portal · almore.fluxcore.works · Powered by Fluxcore</p>
        </footer>
      </div>
    </div>
  );
}
