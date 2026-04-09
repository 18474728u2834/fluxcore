import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { ArrowRight, Sun, Moon, MessageSquare, ChevronRight } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 bg-grid opacity-[0.04] pointer-events-none" />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-extrabold text-gradient tracking-tight cursor-pointer" onClick={() => navigate("/")}>
            Fluxcore
          </span>
          <div className="hidden md:flex items-center gap-5">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <button onClick={() => navigate("/feedback")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Feedback</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isLoggedIn ? (
              <Button variant="hero" size="sm" onClick={() => navigate("/workspaces")}>
                Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button variant="hero" size="sm" onClick={() => navigate("/login")}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero — direct, no filler */}
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="relative max-w-3xl mx-auto px-6">
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight mb-6">
            Stop juggling spreadsheets.{" "}
            <span className="text-gradient-hero">Run your Roblox group from one place.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
            Fluxcore replaces your Google Sheets, Discord bots, and manual rank tracking with a single dashboard your entire staff team actually wants to use.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="hero" size="lg" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")} className="px-8">
              {isLoggedIn ? "Open Dashboard" : "Get started — it's free"} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              See what's included
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            No credit card. Free while in beta.
          </p>
        </div>
      </section>

      {/* Social proof — keep it real */}
      <section className="py-6 border-t border-border/20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-3 justify-center text-muted-foreground text-xs">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">BB</div>
            <span>Used by <strong className="text-foreground">Bloxy Bargains</strong> and <strong className="text-foreground">Bargains Downtown</strong></span>
          </div>
        </div>
      </section>

      {/* Features — conversational, not a list */}
      <section id="features" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">What you get</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            Everything your staff team actually needs
          </h2>
          <p className="text-sm text-muted-foreground mb-12 max-w-lg">
            No bloat. Every feature exists because someone running a Roblox group asked for it.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {[
              {
                title: "Activity tracking that works",
                desc: "Real-time sessions with idle detection, 30-second heartbeats, and staff-only tracking. You'll know exactly who's active and for how long.",
              },
              {
                title: "Roblox group ranking",
                desc: "Import your group roles, then promote or demote members directly from the dashboard. No more switching between tabs.",
              },
              {
                title: "Shift & event scheduling",
                desc: "Create shifts, trainings, and events. Staff self-assign as Host, Co-Host, or Trainer. Discord reminders 5 minutes before.",
              },
              {
                title: "Quotas that hold people accountable",
                desc: "Set weekly or monthly targets per role. Track who's hitting quota and who isn't. Staff see their own progress too.",
              },
              {
                title: "Policies with digital signatures",
                desc: "Write policies, require a signature (draw, type, or checkbox), set deadlines, and auto-assign to every new member.",
              },
              {
                title: "OAuth sign-in with Roblox",
                desc: "One-click login with Roblox OAuth 2.0. No passwords to remember, no third-party accounts needed.",
              },
              {
                title: "Discord notifications",
                desc: "Connect a webhook and get automatic session reminders in the channel you choose. Nothing to install.",
              },
              {
                title: "AI-powered support center",
                desc: "Staff submit tickets, an AI handles the easy questions, and real issues get escalated to you automatically.",
              },
            ].map((f) => (
              <div key={f.title} className="group">
                <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed pl-3.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t border-border/30">
        <div className="max-w-lg mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Free while we're in beta</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Everything included. No feature gates. Premium plans start July 2026.
          </p>

          <div className="glass rounded-xl p-8 gradient-border text-left">
            <div className="flex items-baseline justify-between mb-6">
              <span className="text-lg font-bold text-foreground">Beta Plan</span>
              <span className="text-2xl font-extrabold text-foreground">$0</span>
            </div>
            <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
              {[
                "Unlimited workspaces & members",
                "Activity tracking v2 with idle detection",
                "Roblox group ranking & role sync",
                "Shift, training & event scheduling",
                "Discord webhook notifications",
                "Policies with digital signatures",
                "AI support center",
                "Roblox OAuth sign-in",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ChevronRight className="w-3 h-3 text-primary mt-1 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button variant="hero" className="w-full" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
              {isLoggedIn ? "Go to Dashboard" : "Get Started"}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-lg font-extrabold text-gradient tracking-tight">Fluxcore</span>
          <p className="text-xs text-muted-foreground">© 2026 Fluxcore. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <button onClick={() => navigate("/feedback")} className="hover:text-foreground transition-colors flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Feedback
            </button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
