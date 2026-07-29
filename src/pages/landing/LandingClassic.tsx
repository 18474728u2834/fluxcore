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
import { WorkspaceMarquee } from "@/components/WorkspaceMarquee";
import { SiteBanner } from "@/components/SiteBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import bloxyBargainsBadge from "@/assets/bloxy-bargains-badge.png";

export default function LandingClassic() {
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
    { icon: BadgeCheck, title: "Warnings & promotions", desc: "Track member warnings, log promotions, and keep a full history on every staff profile." },
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
      <nav className="fixed top-0 w-full z-50">
        <SiteBanner placement="marketing" />
        <div className="bg-background/60 backdrop-blur-xl border-b border-border/10">
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

          <button
            onClick={() => navigate("/security")}
            className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-card/40 backdrop-blur-sm text-[12px] text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Encrypted in transit &amp; at rest · RLS-isolated
            <ArrowRight className="w-3 h-3 opacity-60" />
          </button>
        </div>

        {/* Real-UI dashboard mockup — mirrors Nexus (BargainsShell) */}
        <div id="showcase" className="relative mt-20 mx-auto max-w-6xl px-6" style={{ perspective: "2400px" }}>
          {isMobile ? (
            /* Phone frame — the real mobile workspace UI */
            <div className="mx-auto w-[280px] rounded-[2.2rem] border-[6px] border-[#1a1a1c] bg-[#0f0f10] shadow-[0_40px_100px_-25px_hsl(var(--primary)/0.5)] overflow-hidden">
              <div className="relative h-6 bg-[#0a0a0b] flex items-center justify-center">
                <div className="w-20 h-3.5 rounded-full bg-[#0f0f10]" />
              </div>
              <div className="text-white" style={{ background: "#0f0f10" }}>
                {/* App bar */}
                <div className="h-11 px-3 flex items-center justify-between border-b" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-[5px]" style={{ background: "#f55a4a" }} />
                    <span className="text-[12px] font-semibold">Staff Team</span>
                  </div>
                  <Command className="w-4 h-4 text-white/40" />
                </div>
                <div className="p-3 space-y-3">
                  <div className="rounded-lg h-[92px] p-3 flex flex-col justify-end" style={{ background: "linear-gradient(135deg, #6ea8ff 0%, #88b8ff 40%, #b6d2ff 100%)" }}>
                    <div className="text-[8px] font-semibold uppercase tracking-wider text-white/85">Welcome back</div>
                    <div className="text-white text-[15px] font-bold leading-tight">Novavoff</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[["Online now", "8", "live"], ["Hours today", "142h", "▲ +12h"]].map(([l, v, s]) => (
                      <div key={l} className="rounded-lg border p-2.5" style={{ background: "#1a1a1c", borderColor: "#26262a" }}>
                        <div className="text-[8px] text-white/50 uppercase tracking-wider">{l}</div>
                        <div className="text-lg font-bold">{v}</div>
                        <div className="text-[8px] text-emerald-400 font-mono">{s}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {[["synt", "Promoted to Supervisor"], ["kai", "Signed Staff Handbook"], ["mira", "Logged 6h in-game"]].map(([n, a]) => (
                      <div key={n} className="flex items-center gap-2 rounded-lg border px-2.5 py-2" style={{ background: "#1a1a1c", borderColor: "#26262a" }}>
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary/60 to-violet-500/60 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold">{n}</div>
                          <div className="text-[9px] text-white/50 truncate">{a}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Bottom tab bar */}
                <div className="flex items-center justify-around border-t py-2" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
                  {[LayoutDashboard, Users, Clock, CalendarDays, Settings].map((Icon, i) => (
                    <Icon key={i} className="w-[16px] h-[16px]" strokeWidth={1.8} style={{ color: i === 0 ? "#fff" : "#7a7a7e" }} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
          <div
            className="relative rounded-2xl border border-border/40 shadow-[0_50px_140px_-20px_hsl(var(--primary)/0.4)] overflow-hidden"
            style={{ transform: "rotateX(6deg)", transformStyle: "preserve-3d", background: "#0f0f10" }}
          >

            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b" style={{ borderColor: "#1a1a1c", background: "#0a0a0b" }}>
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
              <div className="flex-1 flex justify-center">
                <div className="px-3 py-1 rounded-md border text-[11px] text-white/50 font-mono" style={{ background: "#161618", borderColor: "#1f1f22" }}>
                  fluxcore.works/w/staff-team/dashboard
                </div>
              </div>
            </div>

            {/* Nexus body */}
            <div className="relative min-h-[520px] flex" style={{ background: "#0f0f10", color: "#fafafa" }}>
              {/* Slim icon rail */}
              <aside className="w-[56px] shrink-0 flex flex-col items-center py-3 border-r" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
                <div className="w-8 h-8 rounded-md mb-3 flex items-center justify-center" style={{ background: "#f55a4a" }}>
                  <span className="text-white font-black text-[11px]">F</span>
                </div>
                <nav className="flex flex-col gap-1 flex-1">
                  {railNav.map((i, idx) => (
                    <div key={i.label} className="w-8 h-8 rounded-md flex items-center justify-center"
                      style={{ background: idx === 0 ? "#1f1f22" : "transparent", color: idx === 0 ? "#fff" : "#7a7a7e" }}>
                      <i.icon className="w-[15px] h-[15px]" strokeWidth={1.8} />
                    </div>
                  ))}
                </nav>
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ color: "#7a7a7e" }}>
                  <Settings className="w-[15px] h-[15px]" strokeWidth={1.8} />
                </div>
              </aside>

              {/* Right column */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="h-12 flex items-center px-4 gap-4 border-b" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md" style={{ background: "transparent" }}>
                    <div className="w-5 h-5 rounded-[5px]" style={{ background: "#f55a4a" }} />
                    <span className="text-[12px] font-semibold">Staff Team</span>
                    <ArrowRight className="w-3 h-3 opacity-50 rotate-90" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="w-full max-w-md h-7 rounded-md border flex items-center px-2.5 text-[11px] text-white/40" style={{ background: "#161618", borderColor: "#1f1f22" }}>
                      Search anything...
                    </div>
                  </div>
                  <div className="w-[120px]" />
                </header>

                {/* Main */}
                <div className="flex-1 p-6">
                  {/* Blue hero banner — the customizable one */}
                  <div className="rounded-md overflow-hidden relative h-[180px] flex flex-col justify-end p-6"
                    style={{ background: "linear-gradient(135deg, #6ea8ff 0%, #88b8ff 40%, #b6d2ff 100%)" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-white/85 flex items-center gap-1.5 mb-1.5">
                      <span className="inline-block w-2.5 h-2.5">👋</span> Welcome, Novavoff
                    </div>
                    <h2 className="text-white text-2xl leading-[1.05] font-bold tracking-[-0.02em]">
                      Great to see you back, Novavoff
                    </h2>
                  </div>

                  {/* Quick play tile */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="rounded-md border overflow-hidden relative h-[100px]" style={{ background: "#1a1a1c", borderColor: "#26262a" }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <div className="text-white font-bold text-[12px] mb-1">Staff Team</div>
                        <div className="inline-flex items-center gap-1 h-5 px-2 rounded text-[9px] font-semibold bg-white/15 text-white">
                          <Play className="w-2.5 h-2.5 fill-current" /> Play
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border p-3" style={{ background: "#1a1a1c", borderColor: "#26262a" }}>
                      <div className="text-[10px] text-white/50 uppercase tracking-wider">Online now</div>
                      <div className="text-2xl font-bold mt-1">8</div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5">live</div>
                    </div>
                    <div className="rounded-md border p-3" style={{ background: "#1a1a1c", borderColor: "#26262a" }}>
                      <div className="text-[10px] text-white/50 uppercase tracking-wider">Hours today</div>
                      <div className="text-2xl font-bold mt-1">142h</div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5">▲ +12h</div>
                    </div>
                  </div>

                  {/* This week section */}
                  <div className="mt-6">
                    <h3 className="text-base font-bold tracking-[-0.02em]">This week at Staff Team</h3>
                    <div className="text-[11px] font-semibold text-white/85 mt-3 flex items-center gap-1.5">
                      New to the team 👋
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[
                        ["synt", "Joined Mon"],
                        ["kai", "Joined Tue"],
                        ["mira", "Joined Wed"],
                      ].map(([n, w]) => (
                        <div key={n} className="rounded-md border p-2.5 flex items-center gap-2" style={{ background: "#1a1a1c", borderColor: "#26262a" }}>
                          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary/60 to-violet-500/60 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold truncate">{n}</div>
                            <div className="text-[9px] text-white/50">{w}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom fade */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0f0f10] to-transparent pointer-events-none" />
            </div>
          </div>
          )}


          {/* Reflection / glow under */}
          <div className="absolute inset-x-12 -bottom-10 h-40 bg-primary/30 blur-[80px] rounded-full opacity-60 pointer-events-none" />
        </div>
      </section>


      {/* Trusted */}
      <section className="py-20 relative">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-6">
            Trusted by Roblox communities
          </p>
          <div className="flex items-center justify-center gap-10 flex-wrap opacity-80 mb-8">
            <div className="flex items-center gap-2.5 transition-all">
              <img src={bloxyBargainsBadge} alt="Bloxy Bargains" className="w-7 h-7 rounded-md object-cover" />
              <span className="text-sm font-bold">Bloxy Bargains</span>
            </div>
            <span className="text-sm font-bold text-muted-foreground/40">+ a growing list of groups</span>
          </div>
          <WorkspaceMarquee />
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
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.025em] leading-[1.05] mb-4">
              Free for everyone. Forever.
            </h2>
            <p className="text-[16px] text-muted-foreground">
              No credit card. No subscriptions. No gamepass. Every feature is unlocked for every group.
            </p>
          </div>

          <div className="relative rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/[0.10] via-card/40 to-violet-500/[0.06] p-8 flex flex-col shadow-[0_0_60px_-20px_hsl(var(--primary)/0.5)]">
            <div className="absolute -top-2.5 left-8 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
              Everything included
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-5xl font-black tracking-tight">$0</span>
              <span className="text-muted-foreground text-sm">forever</span>
            </div>
            <p className="text-sm text-muted-foreground mb-7">For every Roblox group, of any size.</p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-8">
              {[
                "Unlimited workspaces & members",
                "Real-time activity tracking",
                "Group ranking & role sync",
                "Sessions, shifts & scheduling",
                "Discord webhook reminders",
                "Policies with digital signatures",
                "In-game message logging",
                "Auto-rank sync over Open Cloud",
                "Full custom branding",
                "Per-role quotas & analytics",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/30" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
              {isLoggedIn ? "Open dashboard" : "Get started — it's free"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
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
          <p className="text-xs text-muted-foreground">© 2026 Fluxcore · All Rights Reserved to RetailPro Technologies UIA</p>
        </div>
      </footer>
    </div>
  );
}
