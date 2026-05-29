import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  ArrowRight, Sun, Moon, Headphones, ChevronRight, CheckCircle2,
  Sparkles, MessageSquareText, BadgeCheck, Palette, BarChart3, Bot,
  ShieldCheck, FileSignature, Heart
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Pricing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;

  const everything = [
    "Unlimited workspaces",
    "Unlimited members",
    "Auto-rank sync with Roblox group",
    "Real-time activity tracking",
    "Shift, training & event scheduling",
    "Discord webhooks & session reminders",
    "Policies with digital signatures & auto-assign",
    "Leave of absence workflow",
    "In-game message logging",
    "Per-role quotas & leaderboards",
    "Full custom branding (colors, grid, badge)",
    "Audit log of every staff action",
    "Analytics dashboard with historical trends",
    "AI support assistant",
    "Priority support",
  ];

  const highlights = [
    { icon: Sparkles, title: "Unlimited Workspaces", desc: "Run as many groups, projects or sub-divisions as you want from one account." },
    { icon: MessageSquareText, title: "In-Game Message Logs", desc: "Searchable chat history of every staff message in your servers." },
    { icon: BarChart3, title: "Per-Role Quotas", desc: "Set different session and time targets for every rank." },
    { icon: Palette, title: "Full Custom Branding", desc: "Custom primary, text and background colors plus a verified badge." },
    { icon: ShieldCheck, title: "Audit Log", desc: "Full timeline of every promotion, demotion, warning, and config change." },
    { icon: Bot, title: "Analytics Dashboard", desc: "Heatmaps, leaderboards, idle-time breakdowns and historical trends." },
    { icon: FileSignature, title: "Document Auto-Assign", desc: "Push policies to new staff automatically and require signatures on rank-up." },
    { icon: BadgeCheck, title: "Priority Support", desc: "Fast-tracked tickets and direct line to the team." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.05] blur-[100px]" />
      </div>

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

      <section className="relative pt-36 pb-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-6">
            <Heart className="w-3 h-3" />
            Free forever · Every feature · No card, no Robux
          </div>
          <h1 className="text-5xl sm:text-6xl font-black leading-[1.05] tracking-tight mb-5">
            Fluxcore is now
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
              free for everyone.
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No more Premium tier. Every feature — unlimited workspaces, message logs, quotas, branding, analytics — is unlocked for every group, at no cost.
          </p>
        </div>
      </section>

      <section className="relative pb-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="relative rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/[0.08] via-card/40 to-violet-500/[0.05] backdrop-blur-sm p-10 shadow-2xl shadow-primary/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
              Everything included
            </div>
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-6xl font-black">$0</span>
                <span className="text-muted-foreground font-medium">forever</span>
              </div>
              <p className="text-sm text-muted-foreground">No plans, no upgrades, no gamepass. Just sign in and go.</p>
            </div>
            <ul className="space-y-3 mb-10 grid sm:grid-cols-2 gap-x-6">
              {everything.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/30" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
              {isLoggedIn ? "Open Dashboard" : "Get started — it's free"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-4">
              What's included
            </div>
            <h2 className="text-4xl font-black mb-3">Built for groups that take staffing seriously.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Every feature, every workspace, every member — free.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {highlights.map((f) => (
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

      <section className="relative py-20 border-t border-border/10">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-10">Common questions</h2>
          <div className="space-y-4">
            {[
              { q: "Is Fluxcore really free now?", a: "Yes. Every feature that used to be Premium — unlimited workspaces, message logs, quotas, full branding, analytics, audit logs — is now free for everyone, with no cap." },
              { q: "Do I still need to buy the Roblox gamepass?", a: "No. Premium has been removed entirely. Anyone who bought the gamepass before keeps everything they had — there is just nothing extra to buy anymore." },
              { q: "Are there usage limits?", a: "No artificial caps. Create as many workspaces, invite as many members, and run as many sessions as you need. Fair-use protections still apply against abuse." },
              { q: "How do you sustain it?", a: "Fluxcore is run lean and supported by the community. If we ever need to introduce paid add-ons, current features will stay free." },
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

      <section className="relative py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black mb-4">Ready to run your staff team?</h2>
          <p className="text-muted-foreground mb-8">Sign in with Roblox and you're in. No paywalls, ever.</p>
          <Button size="lg" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-13 px-8">
            {isLoggedIn ? "Open Dashboard" : "Start for free"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
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
