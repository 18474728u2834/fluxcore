import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { ArrowRight, Sun, Moon, MessageSquare } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav — minimal */}
      <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md">
        <div className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-extrabold text-foreground text-base tracking-tight cursor-pointer" onClick={() => navigate("/")}>
            fluxcore
          </span>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isLoggedIn ? (
              <button onClick={() => navigate("/workspaces")} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Dashboard →
              </button>
            ) : (
              <button onClick={() => navigate("/login")} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Sign in →
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-[1080px] mx-auto px-6 pt-28 pb-24">
        <div className="max-w-[620px]">
          <p className="text-sm text-muted-foreground mb-4">For Roblox group owners & staff teams</p>
          <h1 className="text-[2.75rem] sm:text-[3.25rem] font-extrabold leading-[1.08] tracking-tight text-foreground mb-5">
            Your group deserves<br />
            better than a<br />
            Google Sheet.
          </h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-8 max-w-[480px]">
            Fluxcore is the dashboard we built because we were tired of the same mess — scattered spreadsheets, broken bots, and nobody knowing who's actually active. It handles activity tracking, ranking, shifts, and policies so you can focus on running your group.
          </p>
          <div className="flex items-center gap-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}
            >
              {isLoggedIn ? "Open dashboard" : "Try it free"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <span className="text-xs text-muted-foreground">Free during beta · No card needed</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* What it does — plain language, no cards */}
      <div className="max-w-[1080px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 gap-x-16">
          <div className="md:col-span-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">What's in the box</p>
            <h2 className="text-xl font-bold text-foreground leading-snug">
              Built by group owners,<br />for group owners.
            </h2>
          </div>
          <div className="md:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-7">
              {[
                ["Activity tracking", "See who's online, how long they've been active, and whether they're actually doing something. Idle detection, heartbeats, the works."],
                ["Group ranking", "Import your Roblox group roles, promote and demote people right from the dashboard. No more switching tabs."],
                ["Shifts & events", "Schedule shifts, trainings, events. Staff claim Host or Co-Host spots. Discord pings 5 min before."],
                ["Quotas", "Set weekly or monthly targets per role. Staff see their own progress, you see everyone's."],
                ["Policies", "Write rules, require a signature, set a deadline. New members get auto-assigned."],
                ["One-click login", "Roblox OAuth. No passwords, no extra accounts. They click, they're in."],
                ["Discord alerts", "Paste a webhook URL, get automatic session reminders. Nothing to install."],
                ["AI support", "Staff open tickets, AI handles the easy stuff, you handle the rest."],
              ].map(([title, desc]) => (
                <div key={title}>
                  <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Who uses it */}
      <div className="max-w-[1080px] mx-auto px-6 py-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold shrink-0">Used by</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">BB</div>
              <span className="text-sm text-foreground font-medium">Bloxy Bargains</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">BD</div>
              <span className="text-sm text-foreground font-medium">Bargains Downtown</span>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Pricing — dead simple */}
      <div className="max-w-[1080px] mx-auto px-6 py-20">
        <div className="max-w-[400px]">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Pricing</p>
          <h2 className="text-xl font-bold text-foreground mb-2">Free right now.</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Everything's included while we're in beta. No limits, no feature gates. Paid plans start July 2026 — we'll give you plenty of notice.
          </p>
          <Button variant="hero" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
            {isLoggedIn ? "Go to dashboard" : "Get started"} <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/40" />
      <footer className="max-w-[1080px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="font-extrabold text-foreground text-sm tracking-tight">fluxcore</span>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <button onClick={() => navigate("/feedback")} className="hover:text-foreground transition-colors flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Feedback
          </button>
          <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
          <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Fluxcore</p>
      </footer>
    </div>
  );
}
