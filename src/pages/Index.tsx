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
  LayoutDashboard,
  Clock,
  CalendarDays,
  FileText,
  CalendarOff,
  UserX,
  ShieldCheck,
  Code,
  Settings,
  Command,
  BadgeCheck,
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

  // Mirrors the real MinimalLayout rail
  const railNav = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: Users, label: "Members" },
    { icon: Clock, label: "Activity" },
    { icon: CalendarDays, label: "Sessions" },
    { icon: Megaphone, label: "Wall" },
    { icon: FileText, label: "Documents" },
    { icon: CalendarOff, label: "LOA" },
    { icon: UserX, label: "Staff" },
    { icon: Target, label: "Quotas" },
    { icon: MessageSquare, label: "Logs" },
  ];
  const railConfig = [
    { icon: ShieldCheck, label: "Roles" },
    { icon: Code, label: "Tracking" },
    { icon: Settings, label: "Settings" },
  ];

  // The Fluxcore logo — restored from the original wordmark, refined.
  const Logo = ({ size = "md" }: { size?: "sm" | "md" }) => (
    <button onClick={() => navigate("/")} className="group flex items-center gap-1.5">
      <span className={`${size === "sm" ? "text-[15px]" : "text-[18px]"} font-black tracking-[-0.02em]`}>
        <span className="bg-gradient-to-br from-primary via-violet-400 to-primary bg-clip-text text-transparent group-hover:from-primary group-hover:to-violet-300 transition-all">
          flux
        </span>
        <span className="text-foreground">core</span>
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[1100px] h-[800px] rounded-full bg-primary/[0.10] blur-[160px]" />
        <div className="absolute top-[40%] -right-40 w-[500px] h-[500px] rounded-full bg-violet-500/[0.06] blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl border-b border-border/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />

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
      <section className="relative pt-40 pb-12">
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
              onClick={() => document.getElementById("showcase")?.scrollIntoView({ behavior: "smooth" })}
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

        {/* Real-UI dashboard mockup — mirrors MinimalLayout */}
        <div id="showcase" className="relative mt-20 mx-auto max-w-6xl px-6" style={{ perspective: "2400px" }}>
          <div
            className="relative rounded-2xl border border-border/40 bg-background shadow-[0_50px_140px_-20px_hsl(var(--primary)/0.4)] overflow-hidden"
            style={{ transform: "rotateX(6deg)", transformStyle: "preserve-3d" }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/30 bg-card/40">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
              <div className="flex-1 flex justify-center">
                <div className="px-3 py-1 rounded-md bg-background/60 border border-border/30 text-[11px] text-muted-foreground font-mono">
                  fluxcore.works/w/staff-team/dashboard
                </div>
              </div>
            </div>

            {/* App body — recreates MinimalLayout */}
            <div
              className="relative min-h-[460px]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 0%, hsl(var(--primary) / 0.08), transparent 40%), radial-gradient(circle at 80% 100%, hsl(var(--primary) / 0.05), transparent 40%)",
              }}
            >
              {/* dotted backdrop */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.18) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                  maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
                }}
              />

              {/* Floating rail */}
              <aside className="absolute left-3 top-3 bottom-3 w-[58px] rounded-2xl border border-border/50 bg-background/70 backdrop-blur-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
                <div className="h-12 flex items-center justify-center border-b border-border/40">
                  <span className="text-[13px] font-black bg-gradient-to-br from-primary to-violet-400 bg-clip-text text-transparent">F</span>
                </div>
                <div className="px-1.5 pt-1.5 pb-1">
                  <div className="h-7 rounded-lg bg-foreground/[0.04] border border-border/40 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                  </div>
                </div>
                <nav className="flex-1 overflow-hidden px-1.5 py-1.5 space-y-0.5">
                  {railNav.map((i, idx) => (
                    <div
                      key={i.label}
                      className={`relative h-8 rounded-lg flex items-center justify-center ${i.active ? "bg-foreground/[0.06]" : ""}`}
                    >
                      {i.active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                      )}
                      <i.icon className={`w-[15px] h-[15px] ${i.active ? "text-foreground" : "text-muted-foreground/70"}`} />
                    </div>
                  ))}
                  <div className="my-1.5 mx-2 border-t border-border/40" />
                  {railConfig.map((i) => (
                    <div key={i.label} className="h-8 rounded-lg flex items-center justify-center">
                      <i.icon className="w-[15px] h-[15px] text-muted-foreground/70" />
                    </div>
                  ))}
                </nav>
                <div className="border-t border-border/40 p-1.5">
                  <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-primary/60 to-violet-500/60 ring-2 ring-primary/30" />
                </div>
              </aside>

              {/* Main content */}
              <div className="pl-[78px] relative">
                {/* App header */}
                <header className="h-12 flex items-center justify-between px-6">
                  <div className="flex items-center gap-1.5 text-[12px]">
                    <span className="text-muted-foreground/60">Staff Team</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
                    <span className="text-foreground font-semibold">Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 h-5 rounded border border-border/50 bg-foreground/[0.03] text-muted-foreground">
                      <Command className="w-2.5 h-2.5" /> K
                    </kbd>
                    <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      <BadgeCheck className="w-2.5 h-2.5" /> VERIFIED
                    </span>
                  </div>
                </header>

                <div className="px-6 pb-6 pt-1 space-y-3">
                  <div>
                    <h2 className="text-[20px] font-black tracking-tight">Overview</h2>
                    <p className="text-[11px] text-muted-foreground">Your workspace at a glance</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { label: "Active staff", val: "24", change: "+3", glyph: Users },
                      { label: "Sessions today", val: "18", change: "+5", glyph: CalendarDays },
                      { label: "Hours tracked", val: "142h", change: "+12h", glyph: Clock },
                      { label: "Online now", val: "8", change: "live", glyph: Activity },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-3">
                        <div className="flex items-center justify-between mb-2">
                          <s.glyph className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span className="text-[9px] font-mono text-emerald-400">▲ {s.change}</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{s.label}</p>
                        <p className="text-[22px] font-black tracking-tight leading-none">{s.val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Two-col */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Top performer / chart */}
                    <div className="col-span-2 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-3.5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[11px] font-semibold">Activity</p>
                          <p className="text-[9px] text-muted-foreground">Last 14 days</p>
                        </div>
                        <div className="flex gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-mono">Day</span>
                          <span className="px-1.5 py-0.5 rounded text-muted-foreground text-[9px] font-mono">Week</span>
                          <span className="px-1.5 py-0.5 rounded text-muted-foreground text-[9px] font-mono">Month</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-1.5 h-20">
                        {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95, 70, 88].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/20 to-primary/80 hover:to-primary transition-colors" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <div className="flex justify-between mt-1.5 text-[8px] text-muted-foreground/60 font-mono">
                        <span>Apr 30</span><span>May 7</span><span>May 13</span>
                      </div>
                    </div>

                    {/* Online list */}
                    <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-3.5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-semibold">Online now</p>
                        <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          live
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          ["synt", "2h 14m", "in-game"],
                          ["kai", "47m", "in-game"],
                          ["mira", "1h 02m", "in-game"],
                          ["devs", "3m", "idle"],
                        ].map(([n, t, st], i) => (
                          <div key={n} className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/60 to-violet-500/60 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-semibold leading-tight truncate">@{n}</p>
                              <p className="text-[8px] text-muted-foreground leading-tight">{st}</p>
                            </div>
                            <span className={`text-[9px] font-mono ${i === 3 ? "text-amber-400" : "text-muted-foreground"}`}>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent activity strip */}
                  <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-3.5">
                    <p className="text-[11px] font-semibold mb-2.5">Recent activity</p>
                    <div className="space-y-1.5">
                      {[
                        ["@kai", "promoted to Senior Mod", "2m ago"],
                        ["@synt", "completed 1h training session", "14m ago"],
                        ["@devs", "submitted leave of absence", "1h ago"],
                      ].map(([who, what, when]) => (
                        <div key={who as string} className="flex items-center gap-2 text-[10px]">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                          <span className="font-semibold">{who}</span>
                          <span className="text-muted-foreground flex-1 truncate">{what}</span>
                          <span className="text-muted-foreground/60 font-mono text-[9px]">{when}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom fade */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Reflection / glow under */}
          <div className="absolute inset-x-12 -bottom-10 h-40 bg-primary/30 blur-[80px] rounded-full opacity-60 pointer-events-none" />
        </div>
      </section>

      {/* Trusted */}
      <section className="py-20 relative">
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
                  <f.icon className="w-[18px] h-[18px] text-primary" strokeWidth={2.2} />
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
          <Logo size="sm" />
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
