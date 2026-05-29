import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Users,
  Crown,
  Sparkles,
  ShoppingBasket,
  ShoppingCart,
  Loader2,
  Leaf,
  CheckCircle2,
  Apple,
  Carrot,
  Heart,
  Headphones,
  Truck,
  ShieldCheck,
  GraduationCap,
  Quote,
  ExternalLink,
  Store,
  Tag,
  Receipt,
  TrendingUp,
  Clock,
  Cookie,
} from "lucide-react";

const WORKSPACE_ID = "9f2c9234-c02f-492b-8121-74324e0df624";
const ROBLOX_GROUP_ID = "495300212";
const ROBLOX_GROUP_URL =
  "https://www.roblox.com/communities/495300212/Shoply-Shopping";
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;

const AISLES = [
  { icon: Apple, name: "Produce", tag: "Fresh daily" },
  { icon: Carrot, name: "Greens", tag: "Garden picked" },
  { icon: Cookie, name: "Bakery", tag: "Oven warm" },
  { icon: ShoppingCart, name: "Checkout", tag: "No queues" },
  { icon: Tag, name: "Deals", tag: "Weekly drops" },
  { icon: Truck, name: "Delivery", tag: "Same day" },
];

export default function Shoply() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [groupIcon, setGroupIcon] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Shoply Shopping — Staff Portal";
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
    if (user) navigate(`/w/${WORKSPACE_ID}/dashboard`);
    else navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#04101c] text-white relative overflow-hidden">
      {/* Aurora backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-[0.04]" />
        <div
          className="absolute -top-48 left-1/3 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full bg-sky-500/20 blur-[200px] animate-pulse"
          style={{ animationDuration: "7s" }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[700px] h-[700px] rounded-full bg-emerald-400/15 blur-[180px] animate-pulse"
          style={{ animationDuration: "9s" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-cyan-400/10 blur-[160px] animate-pulse"
          style={{ animationDuration: "11s" }}
        />
      </div>

      {/* Top nav */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {groupIcon ? (
            <img src={groupIcon} alt="" className="w-10 h-10 rounded-xl ring-1 ring-white/15" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-300 to-sky-600 ring-1 ring-white/15 flex items-center justify-center">
              <ShoppingBasket className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-wide">SHOPLY</span>
            <span className="text-[10px] text-sky-300/70 tracking-[0.25em]">SHOPPING</span>
          </div>
        </div>
        <div className="flex items-center gap-5 text-xs text-white/50">
          <a href="#about" className="hover:text-white transition-colors hidden sm:inline">About</a>
          <a href="#aisles" className="hover:text-white transition-colors hidden sm:inline">Aisles</a>
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

      <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-24">
        {/* Hero */}
        <header className="text-center space-y-7 mb-20 stagger-fade">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/25 text-[11px] uppercase tracking-[0.18em] text-emerald-300 font-medium">
            <Leaf className="w-3 h-3" /> Roblox's Leading Ro-Store
          </div>

          {groupIcon && (
            <div className="relative inline-block">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-sky-400/40 via-cyan-300/20 to-emerald-300/30 blur-2xl" />
              <img
                src={groupIcon}
                alt="Shoply Shopping"
                className="relative w-32 h-32 mx-auto rounded-3xl ring-1 ring-white/15 shadow-[0_30px_100px_-20px_rgba(56,189,248,0.6)] hover:scale-105 hover:rotate-3 transition-transform duration-500"
              />
            </div>
          )}

          <div className="space-y-3">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[0.95]">
              <span className="bg-gradient-to-br from-white via-sky-100 to-sky-300 bg-clip-text text-transparent">
                Shoply
              </span>
              <span className="block text-3xl md:text-4xl font-semibold mt-3 text-emerald-200/80 tracking-tight">
                fresh aisles. real shifts. real team.
              </span>
            </h1>
            <p className="text-base md:text-lg text-sky-200/70 font-medium tracking-wide">
              By Nova · Est. 2025 · 77+ members and growing
            </p>
          </div>

          <p className="text-lg text-white/65 max-w-2xl mx-auto leading-relaxed">
            The internal hub for the Shoply Shopping staff team. Stock the shelves, run the
            tills, lead the trainings — and keep Roblox's leading Ro-Store humming, one
            shift at a time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={loading}
              className="min-w-[230px] h-12 bg-gradient-to-br from-sky-300 to-sky-500 hover:from-sky-200 hover:to-sky-400 text-sky-950 font-semibold shadow-[0_15px_50px_-10px_rgba(56,189,248,0.7)] hover:shadow-[0_20px_60px_-10px_rgba(56,189,248,0.9)] hover:scale-[1.03] transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {user ? "Enter Staff Portal" : "Sign In With Roblox"}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
            <a
              href={ROBLOX_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/55 hover:text-white px-4 py-3 transition-colors"
            >
              Apply to join the team →
            </a>
          </div>
        </header>

        {/* Aisle marquee */}
        <section className="relative mb-24 -mx-6 px-6">
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#04101c] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#04101c] to-transparent z-10 pointer-events-none" />
          <div className="overflow-hidden">
            <div className="flex gap-3 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
              {[...AISLES, ...AISLES, ...AISLES].map((a, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-sm"
                >
                  <a.icon className="w-4 h-4 text-emerald-300" />
                  <span className="text-sm font-medium">{a.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {a.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stat strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-24 stagger-fade">
          {[
            { icon: Users, label: "Members", value: "77+" },
            { icon: Crown, label: "Founder", value: "Nova" },
            { icon: Store, label: "Category", value: "Ro-Store" },
            { icon: TrendingUp, label: "Status", value: "Growing" },
          ].map((s, i) => (
            <div
              key={i}
              className="group rounded-2xl bg-white/[0.03] border border-white/10 p-5 backdrop-blur-sm hover:border-emerald-400/40 hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400/20 to-emerald-400/20 border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <s.icon className="w-4 h-4 text-sky-300" />
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] mb-1">{s.label}</p>
              <p className="text-base font-semibold truncate">{s.value}</p>
            </div>
          ))}
        </section>

        {/* About */}
        <section id="about" className="grid md:grid-cols-5 gap-4 mb-24">
          <div className="md:col-span-3 relative rounded-3xl overflow-hidden border border-white/10 p-8 md:p-10 bg-gradient-to-br from-sky-500/10 via-white/[0.02] to-emerald-500/10">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4 text-emerald-300 text-xs uppercase tracking-[0.15em] font-medium">
                <ShoppingBasket className="w-4 h-4" /> About Shoply
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-[1.15]">
                A fresh take on the Ro-Store — built around great teams, great shifts, and a brand worth showing up for.
              </h2>
              <div className="space-y-4 text-white/65 leading-relaxed text-[15px]">
                <p>
                  Shoply Shopping is a Roblox supermarket community founded by Nova in late
                  2025. Born as a "Small Groups" and "New Shops" pick, Shoply has grown into one
                  of the most ambitious Ro-Stores on the platform.
                </p>
                <p>
                  From produce to checkout to the back-of-house management team, every shift
                  here is run by real people who care about the standard. This portal is
                  where the team plans, trains and tracks it all.
                </p>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-2">
                {["Supermarket RP", "Family-safe", "Active staff", "Community-led", "Always hiring"].map(
                  (t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-200/85"
                    >
                      {t}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-3xl bg-white/[0.03] border border-white/10 p-8 flex flex-col justify-between backdrop-blur-sm">
            <div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center mb-4">
                <Receipt className="w-5 h-5 text-sky-950" />
              </div>
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
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 text-[11px] text-white/40">
              Powered by{" "}
              <a href="https://fluxcore.works" className="text-sky-300 hover:text-sky-200">
                Fluxcore
              </a>
            </div>
          </div>
        </section>

        {/* Quote */}
        <section className="mb-24">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-r from-sky-500/[0.08] via-white/[0.02] to-emerald-400/[0.08] p-10 md:p-14 overflow-hidden">
            <Quote className="absolute -top-4 left-8 w-24 h-24 text-emerald-400/10 rotate-180" />
            <p className="relative text-2xl md:text-3xl font-semibold leading-snug max-w-3xl">
              "Shoply was built for the people who love the small details — the way the
              shelves look, the way the till sounds, the way a good shift feels. Everything
              else follows from that."
            </p>
            <p className="relative mt-5 text-sm text-white/50">— Nova, Founder</p>
          </div>
        </section>

        {/* Aisles */}
        <section id="aisles" className="mb-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2 text-emerald-300 text-xs uppercase tracking-[0.15em] font-medium">
                <Store className="w-4 h-4" /> Inside the store
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                The teams that keep Shoply moving
              </h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade">
            {[
              {
                icon: ShoppingCart,
                name: "Cashiers",
                desc: "Front of house. Fast checkouts, friendly faces, and clean tills every shift.",
              },
              {
                icon: Truck,
                name: "Stockers",
                desc: "Keeping aisles full and the floor presentable — the backbone of the store.",
              },
              {
                icon: ShieldCheck,
                name: "Security",
                desc: "Watching the doors, calming trouble, and keeping the experience safe for everyone.",
              },
              {
                icon: Headphones,
                name: "Customer Care",
                desc: "Helping shoppers with anything they need and resolving issues with a smile.",
              },
              {
                icon: GraduationCap,
                name: "Training",
                desc: "Onboarding new hires and getting them confident on the shop floor.",
              },
              {
                icon: Crown,
                name: "Management",
                desc: "Leading shifts, mentoring staff, and protecting the Shoply standard.",
              },
            ].map((d) => (
              <div
                key={d.name}
                className="group relative rounded-2xl bg-white/[0.03] border border-white/10 p-6 hover:border-emerald-400/40 hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400/15 to-emerald-400/15 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <d.icon className="w-5 h-5 text-emerald-200" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">{d.name}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section id="values" className="mb-24">
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-sky-500/[0.05] blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3 text-emerald-300 text-xs uppercase tracking-[0.15em] font-medium">
                <Heart className="w-4 h-4" /> What we stand for
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-10 leading-tight max-w-2xl">
                Three values guide every shift at Shoply.
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    n: "01",
                    t: "Fresh always",
                    d: "Stale stock, stale shifts, stale energy — none of it. Shoply runs on freshness, everywhere.",
                  },
                  {
                    n: "02",
                    t: "Sharp on the floor",
                    d: "Sharp uniforms, sharp till work, sharp customer service. The standard is high and the team meets it.",
                  },
                  {
                    n: "03",
                    t: "Grow together",
                    d: "Every cashier today is a manager tomorrow. We promote from within and we celebrate the climb.",
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
          </div>
        </section>

        {/* Live ticker */}
        <section className="mb-24">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Clock, label: "Open", value: "24/7" },
              { icon: Tag, label: "Weekly deals", value: "Always on" },
              { icon: Leaf, label: "Vibe", value: "Fresh" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center shrink-0">
                  <s.icon className="w-6 h-6 text-sky-950" />
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.18em] mb-0.5">{s.label}</p>
                  <p className="text-lg font-semibold">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-16">
          <div className="relative rounded-3xl overflow-hidden border border-emerald-400/25 bg-gradient-to-br from-sky-500/20 via-sky-500/[0.04] to-emerald-400/15 p-10 md:p-14 text-center">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-sky-400/20 blur-[160px] pointer-events-none" />
            <div className="absolute -bottom-32 right-0 w-[400px] h-[400px] rounded-full bg-emerald-400/15 blur-[140px] pointer-events-none" />
            <div className="relative space-y-5 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] uppercase tracking-[0.18em] text-white/80">
                <Sparkles className="w-3 h-3" /> Staff only
              </div>
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                Ready to clock in?
              </h2>
              <p className="text-white/65 text-base max-w-xl mx-auto">
                Sign in with your Roblox account to access shifts, training, activity, and
                your full Shoply Shopping staff dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button
                  size="lg"
                  onClick={handleContinue}
                  disabled={loading}
                  className="min-w-[230px] h-12 bg-gradient-to-br from-sky-300 to-sky-500 hover:from-sky-200 hover:to-sky-400 text-sky-950 font-semibold shadow-[0_15px_50px_-10px_rgba(56,189,248,0.7)]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {user ? "Enter Staff Portal" : "Sign In With Roblox"}
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </Button>
                <a
                  href={ROBLOX_GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center text-sm text-white/65 hover:text-white px-6 py-3 rounded-md border border-white/15 hover:border-white/30 transition-colors"
                >
                  Visit Shoply on Roblox
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-white/30 space-y-1">
          <p>© {new Date().getFullYear()} Shoply Shopping · All rights reserved.</p>
          <p>Staff Portal · shoply.fluxcore.works · Powered by Fluxcore</p>
        </footer>
      </div>
    </div>
  );
}
