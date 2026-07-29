import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  ArrowRight, Sun, Moon, Activity, Calendar, Shield, FileSignature, Users, Target,
  MessageSquare, Plane, KeyRound, Zap, ShieldCheck, Headphones, Menu, X, ChevronRight,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SiteBanner } from "@/components/SiteBanner";

const features = [
  { icon: Activity, title: "Activity tracking", desc: "Live heartbeats with idle detection." },
  { icon: Shield, title: "Group ranking", desc: "Promote and demote via Open Cloud." },
  { icon: Calendar, title: "Sessions & shifts", desc: "Trainings, patrols, Discord reminders." },
  { icon: Target, title: "Per-role quotas", desc: "Weekly targets that reset on schedule." },
  { icon: FileSignature, title: "Policies & signing", desc: "Digital sign-off with deadlines." },
  { icon: Users, title: "Roles & permissions", desc: "Granular per-page access control." },
  { icon: MessageSquare, title: "Message logs", desc: "Search every in-game staff chat." },
  { icon: Plane, title: "Leave of absence", desc: "Requests in, approvals out." },
  { icon: KeyRound, title: "Open Cloud API", desc: "Auto-rank without bots." },
  { icon: Zap, title: "Discord webhooks", desc: "Alerts where your team lives." },
];

export default function LandingMobile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoggedIn = !authLoading && !!user;
  const go = () => navigate(isLoggedIn ? "/workspaces" : "/login");

  const navItems: [string, string][] = [
    ["Pricing", "/pricing"],
    ["Security", "/security"],
    ["Support", "/support"],
    ["Feedback", "/feedback"],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-primary/[0.16] blur-[130px]" />
        <div className="absolute bottom-1/4 -right-40 w-[460px] h-[460px] rounded-full bg-violet-500/[0.10] blur-[140px]" />
      </div>

      {/* App-style top bar */}
      <header className="fixed top-0 inset-x-0 z-50">
        <SiteBanner placement="marketing" />
        <div className="bg-background/70 backdrop-blur-2xl border-b border-border/20">
          <div className="h-14 px-4 flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-primary-foreground font-black text-xs">F</span>
              <span className="text-[16px] font-black tracking-[-0.03em]">fluxcore</span>
            </button>
            <div className="flex items-center gap-1">
              <button onClick={toggleTheme} aria-label="Toggle theme" className="p-2 text-muted-foreground rounded-md">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" className="p-2 text-muted-foreground rounded-md">
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {menuOpen && (
          <nav className="bg-background/95 backdrop-blur-2xl border-b border-border/20 px-4 py-2">
            {navItems.map(([label, path]) => (
              <button
                key={path}
                onClick={() => { setMenuOpen(false); navigate(path); }}
                className="w-full flex items-center justify-between py-3 text-[15px] border-b border-border/10 last:border-0"
              >
                {label}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="relative px-5 pt-24 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-card/40 text-[11px] text-muted-foreground mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Free forever · Sign in with Roblox
        </div>
        <h1 className="text-[38px] font-black leading-[1.02] tracking-[-0.04em] mb-4">
          Run your group like a{" "}
          <span className="bg-gradient-to-br from-primary via-violet-400 to-emerald-300 bg-clip-text text-transparent">real company.</span>
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
          Activity tracking, ranking, scheduling and policies for Roblox staff teams — in one workspace.
        </p>
        <div className="flex flex-col gap-2.5">
          <Button size="lg" onClick={go} className="h-12 w-full rounded-2xl font-semibold text-[15px] shadow-[0_0_40px_-12px_hsl(var(--primary)/0.8)]">
            {isLoggedIn ? "Open dashboard" : "Create your workspace"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate("/security")} className="h-12 w-full rounded-2xl font-semibold text-[15px]">
            <ShieldCheck className="w-4 h-4 mr-2 text-emerald-400" /> How we protect data
          </Button>
        </div>
      </section>

      {/* Live workspace card */}
      <section className="relative px-5 pb-10">
        <div className="rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Live workspace</div>
              <div className="text-base font-bold">Staff Team</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-400">online</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["8", "in-game"], ["142h", "this week"], ["96%", "quota"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-border/30 bg-background/40 p-3">
                <div className="text-lg font-black tracking-tight">{v}</div>
                <div className="text-[10px] text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {[["synt", "Promoted to Supervisor"], ["kai", "Signed Staff Handbook"]].map(([n, a]) => (
              <div key={n} className="flex items-center gap-3 rounded-2xl border border-border/25 bg-background/30 px-3 py-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/60 to-violet-500/60 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">{n}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative px-5 pb-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary mb-2">Features</p>
        <h2 className="text-[28px] font-black tracking-[-0.03em] leading-[1.08] mb-6">
          Everything your staff team asks for.
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border/25 bg-card/40 p-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <f.icon className="w-4 h-4 text-primary" strokeWidth={2.2} />
              </div>
              <h3 className="text-[13px] font-bold mb-1 leading-tight">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-5 pb-28">
        <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.14] via-card/50 to-emerald-400/[0.06] p-7 text-center">
          <h2 className="text-[26px] font-black tracking-[-0.03em] leading-[1.1] mb-3">Set it up in under a minute.</h2>
          <p className="text-[14px] text-muted-foreground mb-5">Free forever, for every Roblox group.</p>
          <Button size="lg" onClick={go} className="h-12 w-full rounded-2xl font-bold">
            {isLoggedIn ? "Open dashboard" : "Get started — it's free"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="relative border-t border-border/20 px-5 py-8 pb-24 space-y-4 text-center">
        <span className="block text-[15px] font-black tracking-[-0.03em]">fluxcore</span>
        <div className="flex items-center justify-center gap-4 flex-wrap text-sm text-muted-foreground">
          <button onClick={() => navigate("/support")} className="flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5" /> Support</button>
          <button onClick={() => navigate("/terms")}>Terms</button>
          <button onClick={() => navigate("/privacy")}>Privacy</button>
          <LanguageSelector />
        </div>
        <p className="text-[11px] text-muted-foreground">© 2026 Fluxcore · All Rights Reserved to RetailPro Technologies UIA</p>
      </footer>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border/20 bg-background/85 backdrop-blur-2xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button onClick={go} className="h-11 w-full rounded-2xl font-semibold">
          {isLoggedIn ? "Open dashboard" : "Sign in with Roblox"}
        </Button>
      </div>
    </div>
  );
}
