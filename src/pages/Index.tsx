import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { ArrowRight, Sun, Moon, Headphones, ChevronRight, BarChart3, Shield, Calendar, FileText, Users, Bot, Zap, Palette, CheckCircle2, MessageSquare, ClipboardList, Target, Plane, Megaphone, KeyRound, Activity, Lock, Webhook, Trophy } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;

  const features = [
    { icon: BarChart3, title: "Activity Tracking", desc: "Real-time sessions with idle detection and 30-second heartbeats. Know who's actually working.", color: "bg-violet-500" },
    { icon: Shield, title: "Group Ranking", desc: "Promote and demote straight from the dashboard. Synced with Roblox group roles.", color: "bg-blue-500" },
    { icon: Calendar, title: "Shift Scheduling", desc: "Create shifts, trainings, events. Discord reminders before start. Staff claim roles.", color: "bg-emerald-500" },
    { icon: FileText, title: "Policies & Signatures", desc: "Write policies, require digital signatures, auto-assign to new members.", color: "bg-amber-500" },
    { icon: Users, title: "Role Management", desc: "Import roles from Roblox, set granular permissions, split promote and demote.", color: "bg-pink-500" },
    { icon: Bot, title: "AI Support", desc: "Built-in ticket system with AI that handles common questions before escalating.", color: "bg-indigo-500" },
    { icon: MessageSquare, title: "Message Logging", desc: "Premium chat logs of every staff message in-game. Search, audit, moderate.", color: "bg-rose-500" },
    { icon: Plane, title: "Leave of Absence", desc: "Staff request time off, leadership approves in one click. Quotas adjust automatically.", color: "bg-cyan-500" },
    { icon: Target, title: "Activity Quotas", desc: "Per-role weekly targets. Track session counts and time in-game without spreadsheets.", color: "bg-orange-500" },
    { icon: Megaphone, title: "Staff Wall", desc: "Pin announcements, post updates, keep everyone aligned without another Discord channel.", color: "bg-teal-500" },
    { icon: ClipboardList, title: "Member Logs", desc: "Warnings, notes, promotions — every action attributed and timestamped.", color: "bg-fuchsia-500" },
    { icon: Trophy, title: "Verified Workspaces", desc: "Premium workspaces get a verified badge so members know they're in the real one.", color: "bg-yellow-500" },
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
              <a href="#features" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-white/5 transition-all">
                Features
              </a>
              <button onClick={() => navigate("/pricing")} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-white/5 transition-all">
                Pricing
              </button>
              <button onClick={() => navigate("/feedback")} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-white/5 transition-all">
                Feedback
              </button>
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
              <>
                <button onClick={() => navigate("/login")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block px-3 py-1.5">
                  Log in
                </button>
                <Button size="sm" onClick={() => navigate("/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 px-4">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden">

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Free Forever · Premium Available
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            The command center
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
              for your Roblox group
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Stop juggling spreadsheets and Discord bots.
            Track activity, schedule shifts, manage ranks — all from one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <Button size="lg" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 px-10 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5 press-shrink">
              {isLoggedIn ? "Open Dashboard" : "Start for free"} <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="h-14 px-10 text-base font-semibold border-border/30 hover:bg-white/5 transition-all duration-300 hover:-translate-y-0.5 press-shrink">
              See what's included
            </Button>
          </div>

          {/* Dashboard mockup */}
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="rounded-2xl border border-border/20 bg-card/40 backdrop-blur-sm p-6 shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <div className="flex-1" />
                <div className="px-3 py-1 rounded-md bg-muted/50 text-[10px] text-muted-foreground font-mono">fluxcore.works/dashboard</div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Active Staff", val: "24", change: "+3" },
                  { label: "Sessions Today", val: "18", change: "+5" },
                  { label: "Hours Tracked", val: "142h", change: "+12h" },
                  { label: "Staff Online", val: "8", change: "" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="text-xl font-black text-foreground">{s.val}</p>
                    {s.change && <p className="text-[10px] text-emerald-400 font-semibold">{s.change}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="col-span-2 rounded-lg bg-muted/30 p-3 h-24">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Activity Graph</p>
                  <div className="flex items-end gap-1 h-12">
                    {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-primary/40" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 h-24">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Recent</p>
                  {["synt joined", "kai promoted", "devs left"].map(e => (
                    <p key={e} className="text-[10px] text-muted-foreground truncate">{e}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-10 border-y border-border/10 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-10 flex-wrap">
            <span className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">Trusted by</span>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-[10px] font-black text-white">BB</div>
              <span className="text-sm font-bold text-foreground">Bloxy Bargains</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-[10px] font-black text-white">BD</div>
              <span className="text-sm font-bold text-foreground">Bargains Downtown</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-4">
              Features
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground mb-4">
              Everything your staff team needs
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Built by group owners who got tired of duct-taping tools together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-border/15 bg-card/20 p-7 hover:bg-card/40 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 ease-out hover:-translate-y-1 opacity-0 animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-5 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Secondary features */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap, title: "Discord Notifications", desc: "Webhook reminders before every session." },
              { icon: Palette, title: "Custom Branding", desc: "Your colors, your feel. Make it yours." },
              { icon: Shield, title: "Roblox OAuth", desc: "One click sign-in. No extra accounts." },
              { icon: KeyRound, title: "Granular Permissions", desc: "Lock pages and actions behind custom roles." },
              { icon: Activity, title: "Live Heartbeats", desc: "30-second pings catch staff who go AFK." },
              { icon: Lock, title: "Workspace Blacklist", desc: "Block bad actors from joining your group." },
              { icon: Webhook, title: "Open Cloud API", desc: "Auto-rank syncs straight to Roblox via API key." },
              { icon: FileText, title: "Document Deadlines", desc: "Require sign-off by a date — auto-reminders." },
            ].map((f, i) => (
              <div
                key={f.title}
                className="rounded-xl border border-border/15 bg-card/20 p-5 flex items-start gap-4 hover:bg-card/40 hover:border-border/40 transition-all duration-300 hover:-translate-y-0.5 opacity-0 animate-fade-up"
                style={{ animationDelay: `${i * 50 + 200}ms` }}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-0.5">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-4">
            Pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-foreground mb-4">
            Free to start. Premium when you need it.
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
            Free forever for the essentials. Unlock advanced features with a one-time Roblox gamepass — no subscriptions, no card required.
          </p>

          <div className="grid md:grid-cols-2 gap-5 text-left">
            {/* Free card */}
            <div className="rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm p-7 shadow-xl shadow-primary/5 flex flex-col">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Free</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-foreground">$0</span>
                <span className="text-muted-foreground font-medium">forever</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "Unlimited workspaces & members",
                  "Real-time activity tracking",
                  "Group ranking & role sync",
                  "Shift & event scheduling",
                  "Discord webhook reminders",
                  "Policies with digital signatures",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-12 font-semibold border-border/30" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
                {isLoggedIn ? "Open Dashboard" : "Get Started"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Premium card */}
            <div className="relative rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/[0.10] via-card/40 to-violet-500/[0.06] backdrop-blur-sm p-7 shadow-2xl shadow-primary/20 flex flex-col">
              <div className="absolute -top-3 left-6 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                Premium
              </div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">One-time</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-foreground">400</span>
                <span className="text-muted-foreground font-medium">Robux</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "Everything in Free",
                  "In-game message logging",
                  "Auto-rank sync with Roblox",
                  "Verified workspace badge",
                  "Full custom branding",
                  "Per-role quotas & analytics",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/30" onClick={() => navigate("/pricing")}>
                See full Premium <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/10 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-black tracking-tight">
            <span className="text-primary">flux</span>core
          </span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => navigate("/support")} className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5" /> Support
            </button>
            <button onClick={() => navigate("/feedback")} className="hover:text-foreground transition-colors">Feedback</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Fluxcore</p>
        </div>
      </footer>
    </div>
  );
}
