import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  ArrowRight, Zap, Shield, BarChart3, Users, Clock, FileText,
  ChevronRight, Info, Sun, Moon, MessageSquare,
} from "lucide-react";

const features = [
  {
    icon: Users,
    label: "Core",
    title: "Staff Management",
    description: "Custom roles, granular permissions, and Roblox group rank syncing.",
  },
  {
    icon: Clock,
    label: "Tracking",
    title: "Activity Tracking",
    description: "Real-time session logs, attendance metrics, and in-game monitoring via Lua scripts.",
  },
  {
    icon: Shield,
    label: "Security",
    title: "Roblox Verification",
    description: "Sign in with Roblox OAuth or emoji-based bio verification for secure identity confirmation.",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    title: "Leaderboards & Insights",
    description: "Activity leaderboards, engagement trends, and team performance dashboards.",
  },
  {
    icon: FileText,
    label: "Sessions",
    title: "Shift & Event Scheduling",
    description: "Schedule shifts, trainings, and events with self-assignable Host/Co-Host/Trainer roles.",
  },
  {
    icon: Zap,
    label: "Wall",
    title: "Announcements Board",
    description: "Post updates, notices, and pinned announcements visible to your entire staff team.",
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-extrabold text-gradient tracking-tight cursor-pointer" onClick={() => navigate("/")}>
            Fluxcore
          </span>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <button onClick={() => navigate("/feedback")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Feedback</button>
            <button onClick={() => navigate("/terms")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isLoggedIn ? (
              <Button variant="hero" size="sm" onClick={() => navigate("/workspaces")}>
                Go to Workspaces <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground">
                  Sign in
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate("/login")}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Premium Banner */}
      <div className="fixed top-14 w-full z-40 border-b border-warning/20 bg-warning/5 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-3">
          <Info className="w-3.5 h-3.5 text-warning shrink-0" />
          <p className="text-[11px] text-warning">
            <strong>From 19.07.2026</strong> — A Gamepass (400 Robux) will be needed for premium features to help us host Fluxcore.
          </p>
        </div>
      </div>

      {/* Hero */}
      <section className="relative pt-36 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-secondary/40 text-xs text-muted-foreground mb-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <Zap className="w-3 h-3 text-primary" />
            The all-in-one Roblox group management platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-5 opacity-0 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Run your Roblox group<br />
            <span className="text-gradient-hero">with total control.</span>
          </h1>

          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            Track activity, schedule shifts, manage staff, and handle everything your Roblox community needs — all in one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center opacity-0 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            {isLoggedIn ? (
              <Button variant="hero" size="lg" onClick={() => navigate("/workspaces")} className="px-8">
                Go to Workspaces <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button variant="hero" size="lg" onClick={() => navigate("/login")} className="px-8">
                Start for free <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-8 border-t border-border/20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Trusted By</p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">BB</div>
              <span className="text-xs font-medium">Bloxy Bargains</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Features</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Everything your group needs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="glass-hover rounded-xl p-5 group cursor-default">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">{f.label}</span>
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t border-border/30">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Free During Beta</h2>
          </div>

          <div className="glass rounded-xl p-8 text-center gradient-border max-w-md mx-auto">
            <h3 className="text-xl font-bold text-foreground">Free</h3>
            <p className="text-3xl font-extrabold text-foreground mt-2">$0</p>
            <p className="text-xs text-muted-foreground mt-1">Free during beta — premium coming 19.07.2026</p>
            <ul className="space-y-2 text-sm text-muted-foreground mt-6 text-left max-w-xs mx-auto">
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Unlimited workspaces</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Activity tracking & leaderboards</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Real-time event logging</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Session scheduling</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Announcement wall</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Roblox OAuth sign-in</li>
            </ul>
            <Button variant="hero" className="w-full mt-6" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
              {isLoggedIn ? "Go to Workspaces" : "Get Started"}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-lg font-extrabold text-gradient tracking-tight cursor-pointer" onClick={() => navigate("/")}>Fluxcore</span>
          <p className="text-xs text-muted-foreground">© 2026 Fluxcore. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <button onClick={() => navigate("/feedback")} className="hover:text-foreground transition-colors flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Feedback
            </button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
