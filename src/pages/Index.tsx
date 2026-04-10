import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { ArrowRight, Sun, Moon, Headphones, ChevronRight, BarChart3, Shield, Calendar, FileText, Users, Zap, Bot, Palette } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;

  const features = [
    { icon: BarChart3, title: "Activity Tracking", desc: "See who's actually working. Real-time sessions with idle detection and 30-second heartbeats.", accent: "from-violet-500 to-purple-600" },
    { icon: Shield, title: "Group Ranking", desc: "Promote and demote directly from the dashboard. Synced with your Roblox group roles.", accent: "from-blue-500 to-cyan-500" },
    { icon: Calendar, title: "Shift Scheduling", desc: "Create shifts, trainings, and events. Staff claim roles. Discord reminders before start.", accent: "from-emerald-500 to-green-500" },
    { icon: FileText, title: "Policies & Signatures", desc: "Write policies, require digital signatures, auto-assign to new members on join.", accent: "from-orange-500 to-amber-500" },
    { icon: Users, title: "Role Management", desc: "Import roles from Roblox, set granular permissions, split promote and demote access.", accent: "from-pink-500 to-rose-500" },
    { icon: Bot, title: "AI Support", desc: "Built-in ticket system with AI that handles common questions before escalating to you.", accent: "from-indigo-500 to-violet-500" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/10 bg-background/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-xl font-black tracking-tight cursor-pointer" onClick={() => navigate("/")}>
              <span className="text-primary">flux</span>core
            </span>
            <div className="hidden md:flex items-center gap-1">
              {["Features", "Pricing"].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/50 transition-all">
                  {item}
                </a>
              ))}
              <button onClick={() => navigate("/feedback")} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/50 transition-all">
                Feedback
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/support")} className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all" title="Support Center">
              <Headphones className="w-4 h-4" />
            </button>
            <button onClick={toggleTheme} className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all">
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
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px]" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Free Forever · New Paid Features From July
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-5">
            The command center<br />
            for your Roblox group
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
            Stop juggling spreadsheets and Discord bots. Track activity, schedule shifts, manage ranks — all from one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 px-8 text-base">
              {isLoggedIn ? "Open Dashboard" : "Start for free"} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="h-12 px-8 text-base font-medium border-border/50">
              See what's included
            </Button>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-8 border-y border-border/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Trusted by</span>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">BB</div>
              <span className="text-sm font-semibold text-foreground">Bloxy Bargains</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">BD</div>
              <span className="text-sm font-semibold text-foreground">Bargains Downtown</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary mb-2">Features</p>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-3">
              Everything your staff team needs
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Built by group owners who got tired of duct-taping tools together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="group relative rounded-xl border border-border/20 bg-card/30 p-6 hover:border-border/40 hover:bg-card/50 transition-all duration-300">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${f.accent} flex items-center justify-center mb-4 shadow-lg shadow-primary/5`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Extra features row */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Zap, title: "Discord Notifications", desc: "Webhook reminders 5 minutes before every session." },
              { icon: Palette, title: "Custom Branding", desc: "Your colors, your logo feel. Make the dashboard yours." },
              { icon: Shield, title: "Roblox OAuth Login", desc: "One click to sign in. No passwords, no extra accounts." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border/20 bg-card/30 p-5 flex items-start gap-4 hover:border-border/40 hover:bg-card/50 transition-all">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
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
      <section id="pricing" className="py-24 border-t border-border/10">
        <div className="max-w-lg mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-primary mb-2">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-3">
            Free forever
          </h2>
          <p className="text-muted-foreground mb-10">
            Every feature, no limits, no credit card. New paid features coming July 2026.
          </p>

          <div className="rounded-2xl border border-border/30 bg-card/40 p-8 text-left">
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-black text-foreground">$0</span>
              <span className="text-muted-foreground font-medium">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Unlimited workspaces & members",
                "Real-time activity tracking",
                "Group ranking & role sync",
                "Shift & event scheduling",
                "Discord webhook reminders",
                "Policies with digital signatures",
                "AI support center",
                "Roblox OAuth sign-in",
                "Custom branding",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
              {isLoggedIn ? "Open Dashboard" : "Get Started"} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-base font-black tracking-tight">
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
