import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { ArrowRight, Sun, Moon, MessageSquare, Zap } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/[0.05] blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-extrabold text-gradient tracking-tight cursor-pointer" onClick={() => navigate("/")}>
            Fluxcore
          </span>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <button onClick={() => navigate("/feedback")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Feedback</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isLoggedIn ? (
              <Button variant="hero" size="sm" onClick={() => navigate("/workspaces")}>
                Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <>
                <button onClick={() => navigate("/login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Log in</button>
                <Button variant="hero" size="sm" onClick={() => navigate("/login")}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero — centered, big gradient text */}
      <section className="relative pt-36 pb-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
            Manage your group{" "}
            <span className="text-gradient-hero">like never before.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Activity tracking, shift scheduling, rank management, and everything your Roblox staff team needs — all in one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button variant="hero" size="lg" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")} className="px-8 h-12 text-base">
              {isLoggedIn ? "Open Dashboard" : "Start for free"} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="h-12 text-base border-border/40 hover:border-border">
              See features
            </Button>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/30 bg-card/40 text-xs text-muted-foreground">
            <Zap className="w-3 h-3 text-primary" />
            Free during beta · No credit card required
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="py-10 border-t border-border/20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-5">Trusted by</p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">BB</div>
              <span className="text-sm text-foreground font-medium">Bloxy Bargains</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">BD</div>
              <span className="text-sm text-foreground font-medium">Bargains Downtown</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features — centered header, grid of cards with colored left borders */}
      <section id="features" className="py-24 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
              Everything, one dashboard.
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Built by group owners who were tired of duct-taping tools together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { color: "border-l-primary", title: "Activity Tracking", desc: "Real-time sessions with idle detection, 30-second heartbeats, and staff-only tracking. Know who's active." },
              { color: "border-l-accent", title: "Group Ranking", desc: "Import Roblox group roles, promote and demote directly from the dashboard. Open Cloud integration." },
              { color: "border-l-[hsl(160,84%,39%)]", title: "Shift Scheduling", desc: "Create shifts, trainings, events. Staff claim spots. Discord pings 5 min before start." },
              { color: "border-l-[hsl(32,95%,55%)]", title: "Quotas", desc: "Set targets per role. Staff see their progress, admins see everyone. Weekly or monthly." },
              { color: "border-l-primary", title: "Policies & Signatures", desc: "Write policies, require digital signatures, set deadlines. Auto-assign to new members." },
              { color: "border-l-accent", title: "Roblox OAuth Login", desc: "One click to sign in with Roblox. No passwords, no extra accounts, PKCE secured." },
              { color: "border-l-[hsl(160,84%,39%)]", title: "Discord Notifications", desc: "Paste a webhook URL and get automatic session reminders. Zero setup." },
              { color: "border-l-[hsl(32,95%,55%)]", title: "AI Support Center", desc: "Staff open tickets, AI handles the basics, complex issues get escalated to you." },
              { color: "border-l-primary", title: "Custom Branding", desc: "Pick your background color, primary accent, text color, and toggle the grid. Make it yours." },
            ].map((f) => (
              <div key={f.title} className={`bg-card/50 border border-border/30 border-l-[3px] ${f.color} rounded-lg p-5 hover:bg-card/80 transition-colors`}>
                <h3 className="text-sm font-bold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 border-t border-border/20 relative">
        <div className="max-w-md mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            Free while we build.
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            All features included. No limits. Paid plans start July 2026.
          </p>

          <div className="glass rounded-xl p-8 gradient-border">
            <div className="flex items-baseline justify-center gap-2 mb-6">
              <span className="text-4xl font-extrabold text-foreground">$0</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground text-left mb-8">
              {[
                "Unlimited workspaces & members",
                "Activity tracking with idle detection",
                "Roblox group ranking & role sync",
                "Shift & event scheduling",
                "Discord webhook notifications",
                "Policies with digital signatures",
                "AI-powered support center",
                "Roblox OAuth sign-in",
                "Custom branding & theming",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button variant="hero" className="w-full h-11" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
              {isLoggedIn ? "Open Dashboard" : "Get Started"} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-extrabold text-gradient tracking-tight">Fluxcore</span>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <button onClick={() => navigate("/feedback")} className="hover:text-foreground transition-colors flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Feedback
            </button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Fluxcore</p>
        </div>
      </footer>
    </div>
  );
}
