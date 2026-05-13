import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  ArrowRight,
  Sun,
  Moon,
  Headphones,
  Play,
  CheckCircle2,
  Activity,
  Calendar,
  Shield,
  FileSignature,
  Users,
  Bot,
  MessageSquare,
  Plane,
  Target,
  Megaphone,
  KeyRound,
  Zap,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import bloxyBargainsBadge from "@/assets/bloxy-bargains-badge.png";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;

  const features = [
    { icon: Activity, title: "Activity tracking", desc: "Live heartbeats every 30 seconds with idle detection. Know exactly who's in-game and for how long." },
    { icon: Shield, title: "Group ranking", desc: "Promote and demote straight from the dashboard. Synced with your Roblox group via Open Cloud." },
    { icon: Calendar, title: "Sessions & shifts", desc: "Schedule trainings, raids, patrols. Automatic Discord reminders. Staff claim slots themselves." },
    { icon: FileSignature, title: "Policies & signatures", desc: "Write policies once. Require digital sign-off. Auto-assign to every new member with deadlines." },
    { icon: Users, title: "Roles & permissions", desc: "Import roles from Roblox. Granular per-page permissions. Split promote and demote rights." },
    { icon: Target, title: "Per-role quotas", desc: "Weekly session and time targets. Reset weekly, monthly, or never — your call." },
    { icon: MessageSquare, title: "Message logs", desc: "Search every staff chat in-game. Audit, moderate, never lose context again." },
    { icon: Plane, title: "Leave of absence", desc: "Staff request time off. Leadership approves in one click. Quotas adjust automatically." },
    { icon: Megaphone, title: "Staff wall", desc: "Pin announcements, post updates. Skip the seventh Discord channel nobody reads." },
    { icon: Bot, title: "AI support", desc: "Built-in tickets with an AI that handles common questions before they hit you." },
    { icon: KeyRound, title: "Open Cloud API", desc: "Auto-rank syncs straight to Roblox via your group's API key. No bots required." },
    { icon: Zap, title: "Discord webhooks", desc: "Session reminders, role changes, alerts — all routed where your team already lives." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[1100px] h-[800px] rounded-full bg-primary/[0.10] blur-[160px]" />
        <div className="absolute top-[40%] -right-40 w-[500px] h-[500px] rounded-full bg-violet-500/[0.06] blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <span className="text-primary-foreground font-black text-sm">F</span>
            </div>
            <span className="text-[17px] font-bold tracking-tight">Fluxcore</span>
          </button>

          <div className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
            <a href="#features" className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Product</a>
            <button onClick={() => navigate("/pricing")} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => navigate("/feedback")} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Changelog</button>
            <button onClick={() => navigate("/support")} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Support</button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isLoggedIn ? (
              <Button size="sm" onClick={() => navigate("/workspaces")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 px-4 rounded-lg shadow-lg shadow-primary/30">
                Open dashboard
              </Button>
            ) : (
              <>
                <button onClick={() => navigate("/login")} className="text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block px-3 py-1.5">
                  Sign in
                </button>
                <Button size="sm" onClick={() => navigate("/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 px-4 rounded-lg shadow-lg shadow-primary/30">
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-40 pb-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/40 bg-card/40 backdrop-blur-sm text-[12px] font-medium text-muted-foreground mb-9 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            New · In-game message logs are live
            <ArrowRight className="w-3 h-3 opacity-60" />
          </div>

          <h1 className="text-[44px] sm:text-[68px] lg:text-[84px] font-black leading-[0.98] tracking-[-0.035em] mb-7 max-w-5xl mx-auto">
            The all-in-one tool to run
            <br className="hidden sm:block" />{" "}
            your <span className="bg-gradient-to-br from-primary via-violet-400 to-primary bg-clip-text text-transparent">Roblox community.</span>
          </h1>

          <p className="text-[17px] sm:text-[19px] text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Activity tracking, ranking, scheduling, policies — everything your
            staff team needs in one place. Built for groups that take it seriously.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
            <Button
              size="lg"
              onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}
              className="group bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 px-7 text-[15px] rounded-xl shadow-[0_0_40px_-8px_hsl(var(--primary)/0.6)] transition-all hover:-translate-y-0.5"
            >
              {isLoggedIn ? "Open dashboard" : "Get started — free"}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="h-12 px-6 text-[15px] font-semibold text-foreground/90 hover:bg-card/60 rounded-xl"
            >
              <Play className="w-4 h-4 mr-2 text-primary fill-primary" />
              See it in action
            </Button>
          </div>

          <p className="text-[12px] text-muted-foreground">
            Free forever for the basics · No credit card · Sign in with Roblox
          </p>
        </div>

        {/* Dashboard mockup — 3D tilted */}
        <div className="relative mt-20 mx-auto max-w-6xl px-6" style={{ perspective: "2000px" }}>
          <div
            className="relative rounded-2xl border border-border/30 bg-card/80 backdrop-blur-xl shadow-[0_50px_120px_-20px_hsl(var(--primary)/0.35)] overflow-hidden"
            style={{ transform: "rotateX(8deg)", transformStyle: "preserve-3d" }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/30 bg-card/60">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
              <div className="flex-1 flex justify-center">
                <div className="px-3 py-1 rounded-md bg-background/40 text-[11px] text-muted-foreground font-mono">fluxcore.app/w/staff/dashboard</div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-0">
              {/* Sidebar */}
              <div className="col-span-2 border-r border-border/30 p-4 space-y-1 bg-background/20">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workspace</div>
                {[
                  ["Dashboard", true],
                  ["Members", false],
                  ["Activity", false],
                  ["Sessions", false],
                  ["Roles", false],
                  ["Wall", false],
                  ["Policies", false],
                  ["Quotas", false],
                ].map(([name, active]) => (
                  <div
                    key={name as string}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium ${active ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Main */}
              <div className="col-span-10 p-5 space-y-4">
                {/* Stat row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Active staff", val: "24", change: "+3", up: true },
                    { label: "Sessions today", val: "18", change: "+5", up: true },
                    { label: "Hours tracked", val: "142h", change: "+12h", up: true },
                    { label: "Online now", val: "8", change: "live", up: true },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border/30 bg-background/30 p-3.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{s.label}</p>
                      <p className="text-2xl font-black tracking-tight">{s.val}</p>
                      <p className="text-[10px] text-emerald-400 font-mono mt-0.5">▲ {s.change}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 rounded-xl border border-border/30 bg-background/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-semibold text-foreground">Activity · last 14 days</p>
                      <div className="flex gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-mono">Day</span>
                        <span className="px-1.5 py-0.5 rounded text-muted-foreground text-[9px] font-mono">Week</span>
                      </div>
                    </div>
                    <div className="flex items-end gap-1.5 h-24">
                      {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95, 70, 88].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/20 to-primary/80" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/30 bg-background/30 p-4">
                    <p className="text-[11px] font-semibold text-foreground mb-3">Online now</p>
                    <div className="space-y-2">
                      {[
                        ["synt", "2h 14m"],
                        ["kai", "47m"],
                        ["mira", "1h 02m"],
                        ["devs", "idle"],
                      ].map(([n, t], i) => (
                        <div key={n} className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/60 to-violet-500/60" />
                          <span className="text-[11px] font-medium flex-1">@{n}</span>
                          <span className={`text-[10px] font-mono ${i === 3 ? "text-amber-400" : "text-muted-foreground"}`}>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Trusted */}
      <section className="py-16 relative">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-6">
            Trusted by Roblox communities
          </p>
          <div className="flex items-center justify-center gap-10 flex-wrap opacity-80">
            <div className="flex items-center gap-2.5 grayscale hover:grayscale-0 transition-all">
              <img src={bloxyBargainsBadge} alt="Bloxy Bargains" className="w-7 h-7 rounded-md object-cover" />
              <span className="text-sm font-bold">Bloxy Bargains</span>
            </div>
            <span className="text-sm font-bold text-muted-foreground/40">+ a growing list of groups</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-28 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">Features</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.025em] leading-[1.05] mb-4">
              Everything your staff team needs.
            </h2>
            <p className="text-[16px] text-muted-foreground">
              Stop juggling spreadsheets, Discord bots, and seven open tabs. Fluxcore replaces all of it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm p-6 hover:border-primary/40 hover:bg-card/70 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-105 transition-all">
                  <f.icon className="w-4.5 h-4.5 text-primary" strokeWidth={2.2} />
                </div>
                <h3 className="text-[15px] font-bold mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-28 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.025em] leading-[1.05] mb-4">
              Free to start. Premium when you grow.
            </h2>
            <p className="text-[16px] text-muted-foreground">
              No credit card. No subscriptions. Premium is a one-time Robux unlock.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/30 bg-card/40 p-7 flex flex-col">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Free</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-5xl font-black tracking-tight">$0</span>
                <span className="text-muted-foreground text-sm">forever</span>
              </div>
              <p className="text-sm text-muted-foreground mb-7">For groups getting started.</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "Unlimited workspaces & members",
                  "Real-time activity tracking",
                  "Group ranking & role sync",
                  "Sessions, shifts & scheduling",
                  "Discord webhook reminders",
                  "Policies with digital signatures",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-11 font-semibold border-border/50 rounded-xl" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
                {isLoggedIn ? "Open dashboard" : "Get started"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="relative rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/[0.10] via-card/40 to-violet-500/[0.06] p-7 flex flex-col shadow-[0_0_60px_-20px_hsl(var(--primary)/0.5)]">
              <div className="absolute -top-2.5 left-7 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                Premium
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-3">One-time</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-5xl font-black tracking-tight">400</span>
                <span className="text-muted-foreground text-sm">Robux</span>
              </div>
              <p className="text-sm text-muted-foreground mb-7">For groups going pro.</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "Everything in Free",
                  "In-game message logging",
                  "Auto-rank sync over Open Cloud",
                  "Verified workspace badge",
                  "Full custom branding",
                  "Per-role quotas & analytics",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/30" onClick={() => navigate("/pricing")}>
                See Premium <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.12] via-card/60 to-violet-500/[0.08] p-12 sm:p-16 text-center overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-primary/20 blur-[100px]" />
            <div className="relative">
              <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.025em] leading-[1.05] mb-4">
                Ready to run your group properly?
              </h2>
              <p className="text-[16px] text-muted-foreground mb-8 max-w-lg mx-auto">
                Set up a workspace in under a minute. Free forever for the essentials.
              </p>
              <Button
                size="lg"
                onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-7 rounded-xl shadow-[0_0_40px_-8px_hsl(var(--primary)/0.6)] transition-all hover:-translate-y-0.5"
              >
                {isLoggedIn ? "Open dashboard" : "Get started — it's free"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
              <span className="text-primary-foreground font-black text-[11px]">F</span>
            </div>
            <span className="text-[15px] font-bold tracking-tight">Fluxcore</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground flex-wrap justify-center">
            <button onClick={() => navigate("/support")} className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5" /> Support
            </button>
            <button onClick={() => navigate("/feedback")} className="hover:text-foreground transition-colors">Feedback</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
            <LanguageSelector />
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Fluxcore</p>
        </div>
      </footer>
    </div>
  );
}
