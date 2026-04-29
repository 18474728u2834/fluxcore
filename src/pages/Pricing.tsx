import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  ArrowRight, Sun, Moon, Headphones, ChevronRight, CheckCircle2,
  Sparkles, MessageSquareText, BadgeCheck, Palette, Webhook, BarChart3, Bot,
  Crown, ShieldCheck, FileSignature, Users
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

const PREMIUM_GAMEPASS_URL = "https://www.roblox.com/game-pass/1816876657/Fluxcore-Premium";
const PREMIUM_PRICE_ROBUX = 400;

export default function Pricing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;

  const freeFeatures = [
    "1 workspace",
    "Unlimited members",
    "Auto-rank sync with Roblox group",
    "Real-time activity tracking",
    "Shift, training & event scheduling",
    "Discord webhook for session reminders",
    "Policies with digital signatures",
    "Leave of absence workflow",
    "Basic primary color customization",
    "AI support assistant",
    "Roblox OAuth sign-in",
  ];

  const premiumFeatures = [
    { icon: Sparkles, title: "Unlimited Workspaces", desc: "Run multiple groups, projects or sub-divisions from a single Roblox account." },
    { icon: MessageSquareText, title: "In-Game Message Logs", desc: "Searchable 30-day chat history of every staff message in your servers." },
    { icon: BarChart3, title: "Per-Role Quotas", desc: "Set different session and time targets for every rank — Hyra-style accountability." },
    { icon: Palette, title: "Full Custom Branding", desc: "Custom primary, text and background colors, hidden grid toggle, and verified badge." },
    { icon: ShieldCheck, title: "Audit Log", desc: "Full timeline of every promotion, demotion, warning, and config change in the workspace." },
    { icon: Bot, title: "Analytics Dashboard", desc: "Heatmaps, leaderboards, idle-time breakdowns and 90-day historical trends." },
    { icon: FileSignature, title: "Document Auto-Assign", desc: "Push policies to new staff automatically and require signatures on rank-up." },
    { icon: BadgeCheck, title: "Priority Support", desc: "Fast-tracked tickets, direct line to the team, and early access to beta features." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.05] blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/10 bg-background/70 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-xl font-black tracking-tight cursor-pointer" onClick={() => navigate("/")}>
              <span className="text-primary">flux</span>core
            </span>
            <div className="hidden md:flex items-center gap-1">
              <button onClick={() => navigate("/#features")} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-white/5 transition-all">Features</button>
              <button onClick={() => navigate("/pricing")} className="px-3 py-1.5 text-sm text-foreground rounded-md bg-white/5 transition-all">Pricing</button>
              <button onClick={() => navigate("/feedback")} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-white/5 transition-all">Feedback</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/support")} className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-all" title="Support Center">
              <Headphones className="w-4 h-4" />
            </button>
            <button onClick={toggleTheme} className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-all">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="w-px h-6 bg-border/30 mx-1 hidden sm:block" />
            {isLoggedIn ? (
              <Button size="sm" onClick={() => navigate("/workspaces")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 px-4">
                Dashboard <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate("/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 px-4">
                Get Started
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-6">
            <Sparkles className="w-3 h-3" />
            One-time payment · No subscription · No credit card
          </div>
          <h1 className="text-5xl sm:text-6xl font-black leading-[1.05] tracking-tight mb-5">
            Simple pricing.
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
              Pay in Robux, once.
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Free forever for the essentials. Unlock Premium with a single Roblox gamepass — no recurring billing, no card required.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="relative pb-20">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm p-8 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Free</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-5xl font-black">$0</span>
              <span className="text-muted-foreground font-medium">forever</span>
            </div>
            <p className="text-sm text-muted-foreground mb-8">Everything most groups need to run their staff team.</p>
            <ul className="space-y-3 mb-10 flex-1">
              {freeFeatures.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full h-12 font-semibold border-border/30" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
              {isLoggedIn ? "Open Dashboard" : "Start free"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Premium */}
          <div className="relative rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/[0.08] via-card/40 to-violet-500/[0.05] backdrop-blur-sm p-8 flex flex-col shadow-2xl shadow-primary/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
              Most Popular
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Premium</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-5xl font-black">{PREMIUM_PRICE_ROBUX}</span>
              <span className="text-muted-foreground font-medium">Robux · one-time</span>
            </div>
            <p className="text-sm text-muted-foreground mb-8">Per workspace. Unlock everything below — forever, no renewal.</p>
            <ul className="space-y-3 mb-10 flex-1">
              {[
                "Everything in Free, plus:",
                "Unlimited workspaces",
                "In-game message logging (30 days)",
                "Per-role quotas & leaderboards",
                "Full custom branding (colors, grid, badge)",
                "Verified workspace badge",
                "Audit log of every staff action",
                "Analytics dashboard with 90-day trends",
                "Document auto-assign on rank-up",
                "Priority support",
              ].map((item, i) => (
                <li key={item} className={`flex items-center gap-3 text-sm ${i === 0 ? "font-semibold text-foreground" : ""}`}>
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${i === 0 ? "text-muted-foreground" : "text-primary"}`} />
                  {item}
                </li>
              ))}
            </ul>
            <a href={PREMIUM_GAMEPASS_URL} target="_blank" rel="noreferrer">
              <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/30">
                Buy on Roblox <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Premium activates automatically once you own the gamepass.
            </p>
          </div>
        </div>
      </section>

      {/* Premium feature grid */}
      <section className="relative py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-4">
              What you get with Premium
            </div>
            <h2 className="text-4xl font-black mb-3">Built for groups that take staffing seriously.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Every feature here is rolled out and ready to use the second the gamepass goes through.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {premiumFeatures.map((f) => (
              <div key={f.title} className="rounded-xl border border-border/15 bg-card/20 p-6 hover:bg-card/40 hover:border-primary/30 transition-all">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-bold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-20 border-t border-border/10">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-10">Common questions</h2>
          <div className="space-y-4">
            {[
              { q: "Is it really a one-time payment?", a: "Yes. Premium is a Roblox gamepass — you pay 400 Robux once and Premium stays active on the workspace forever. No subscriptions, no surprise charges." },
              { q: "Does Premium apply to one workspace or all?", a: "Per workspace. The gamepass unlocks Premium on the workspace owned by the Roblox account that purchased it." },
              { q: "What happens to Premium features if I never buy it?", a: "You keep using Fluxcore for free with everything in the Free plan. Premium-only features show a soft upgrade prompt instead of erroring out." },
              { q: "Can I refund the gamepass?", a: "Roblox handles all gamepass payments — refunds follow Roblox's standard policy. Reach out via Support if you need help." },
              { q: "Will free features ever go away?", a: "No. The features listed under Free will stay free. New advanced features may launch as Premium add-ons." },
            ].map((f) => (
              <details key={f.q} className="group rounded-xl border border-border/15 bg-card/20 px-5 py-4 open:bg-card/40">
                <summary className="cursor-pointer text-sm font-semibold list-none flex items-center justify-between">
                  {f.q}
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black mb-4">Ready to upgrade your staff team?</h2>
          <p className="text-muted-foreground mb-8">Start free in seconds. Unlock Premium when you're ready.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-13 px-8">
              {isLoggedIn ? "Open Dashboard" : "Start for free"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <a href={PREMIUM_GAMEPASS_URL} target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="h-13 px-8 font-semibold border-primary/30 hover:bg-primary/10">
                <Crown className="w-4 h-4 mr-2 text-primary" /> Get Premium
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/10 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Fluxcore. Not affiliated with Roblox Corporation.</span>
          <LanguageSelector />
        </div>
      </footer>
    </div>
  );
}
