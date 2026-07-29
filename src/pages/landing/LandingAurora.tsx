import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  ArrowRight, Sun, Moon, Activity, Calendar, Shield, FileSignature, Users, Target,
  MessageSquare, Plane, Megaphone, KeyRound, Zap, BadgeCheck, ShieldCheck, CheckCircle2, Headphones,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { WorkspaceMarquee } from "@/components/WorkspaceMarquee";
import { SiteBanner } from "@/components/SiteBanner";

const features = [
  { icon: Activity, title: "Activity tracking", desc: "Live heartbeats every 30 seconds with idle detection." },
  { icon: Shield, title: "Group ranking", desc: "Promote and demote straight from the dashboard, synced via Open Cloud." },
  { icon: Calendar, title: "Sessions & shifts", desc: "Trainings, raids, patrols — with automatic Discord reminders." },
  { icon: FileSignature, title: "Policies & signatures", desc: "Write once, require digital sign-off, auto-assign with deadlines." },
  { icon: Users, title: "Roles & permissions", desc: "Import Roblox roles, granular per-page permissions." },
  { icon: Target, title: "Per-role quotas", desc: "Weekly session and time targets that reset on your schedule." },
  { icon: MessageSquare, title: "Message logs", desc: "Search every staff chat in-game. Audit and moderate." },
  { icon: Plane, title: "Leave of absence", desc: "Requests in, approvals out, quotas adjust automatically." },
  { icon: Megaphone, title: "Staff wall", desc: "Pin announcements the whole team actually reads." },
  { icon: BadgeCheck, title: "Warnings & promotions", desc: "A full history on every staff profile." },
  { icon: KeyRound, title: "Open Cloud API", desc: "Auto-rank straight to Roblox. No bots required." },
  { icon: Zap, title: "Discord webhooks", desc: "Reminders and alerts routed where your team lives." },
];

export default function LandingAurora() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;
  const go = () => navigate(isLoggedIn ? "/workspaces" : "/login");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Aurora field */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 -left-40 w-[900px] h-[900px] rounded-full bg-primary/[0.14] blur-[190px]" />
        <div className="absolute top-1/3 -right-64 w-[820px] h-[820px] rounded-full bg-violet-500/[0.10] blur-[200px]" />
        <div className="absolute bottom-0 left-1/3 w-[700px] h-[600px] rounded-full bg-emerald-400/[0.06] blur-[190px]" />
      </div>

      <nav className="fixed top-0 w-full z-50">
        <SiteBanner placement="marketing" />
        <div className="bg-background/50 backdrop-blur-2xl border-b border-border/10">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-primary-foreground font-black text-xs">F</span>
              <span className="text-[17px] font-black tracking-[-0.03em]">fluxcore</span>
            </button>
            <div className="hidden md:flex items-center gap-7">
              <a href="#features" className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Product</a>
              <button onClick={() => navigate("/pricing")} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
              <button onClick={() => navigate("/security")} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Security</button>
              <button onClick={() => navigate("/support")} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Support</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Button size="sm" onClick={go} className="h-9 px-4 rounded-full font-semibold shadow-lg shadow-primary/25">
                {isLoggedIn ? "Open dashboard" : "Get started"}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO — asymmetric split */}
      <section className="relative pt-36 pb-24">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-card/40 backdrop-blur-sm text-[12px] text-muted-foreground mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Free forever · Sign in with Roblox
            </div>
            <h1 className="text-[46px] sm:text-[64px] lg:text-[76px] font-black leading-[0.95] tracking-[-0.04em] mb-7">
              Run your group
              <br />
              like a{" "}
              <span className="bg-gradient-to-br from-primary via-violet-400 to-emerald-300 bg-clip-text text-transparent">
                real company.
              </span>
            </h1>
            <p className="text-[18px] text-muted-foreground max-w-xl leading-relaxed mb-9">
              Activity tracking, ranking, scheduling and policies for Roblox staff teams —
              one workspace instead of seven browser tabs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={go} className="group h-12 px-7 rounded-full font-semibold text-[15px] shadow-[0_0_44px_-10px_hsl(var(--primary)/0.7)] transition-all hover:-translate-y-0.5">
                {isLoggedIn ? "Open dashboard" : "Create your workspace"}
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/security")} className="h-12 px-6 rounded-full font-semibold text-[15px]">
                <ShieldCheck className="w-4 h-4 mr-2 text-emerald-400" /> How we protect data
              </Button>
            </div>
            <div className="flex items-center gap-6 mt-10 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Unlimited members</span>
            </div>
          </div>

          {/* Floating stat cards */}
          <div className="relative">
            <div className="rounded-3xl border border-border/30 bg-card/50 backdrop-blur-xl p-6 shadow-[0_40px_120px_-30px_hsl(var(--primary)/0.5)]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Live workspace</div>
                  <div className="text-lg font-bold">Staff Team</div>
                </div>
                <span className="text-[11px] font-mono px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-400">online</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[["8", "in-game"], ["142h", "this week"], ["96%", "quota met"]].map(([v, l]) => (
                  <div key={l} className="rounded-2xl border border-border/30 bg-background/40 p-4">
                    <div className="text-2xl font-black tracking-tight">{v}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {[["synt", "Promoted to Supervisor"], ["kai", "Signed Staff Handbook"], ["mira", "Hosted training session"]].map(([n, a]) => (
                  <div key={n} className="flex items-center gap-3 rounded-2xl border border-border/25 bg-background/30 px-4 py-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/60 to-violet-500/60" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold">{n}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden sm:block rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl px-5 py-4 shadow-xl">
              <div className="text-[11px] text-muted-foreground">Auto-ranked today</div>
              <div className="text-xl font-black">37 members</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted */}
      <section className="py-16 relative">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-6">
            Trusted by Roblox communities
          </p>
          <WorkspaceMarquee />
        </div>
      </section>

      {/* FEATURES — bento-ish */}
      <section id="features" className="py-24 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">Features</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] leading-[1.03]">
              Every tool your staff team keeps asking for.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f, i) => (
              <div key={f.title}
                className={`group rounded-3xl border border-border/25 bg-card/40 backdrop-blur-sm p-6 hover:border-primary/40 hover:bg-card/70 transition-all ${i === 0 ? "sm:col-span-2" : ""}`}>
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <f.icon className="w-[18px] h-[18px] text-primary" strokeWidth={2.2} />
                </div>
                <h3 className="text-[15px] font-bold mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative rounded-[2rem] border border-primary/25 bg-gradient-to-br from-primary/[0.12] via-card/50 to-emerald-400/[0.06] p-12 sm:p-16 text-center overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[320px] rounded-full bg-primary/20 blur-[110px]" />
            <div className="relative">
              <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] leading-[1.03] mb-4">
                Set it up in under a minute.
              </h2>
              <p className="text-[16px] text-muted-foreground mb-8 max-w-lg mx-auto">
                Free forever, for every Roblox group, of any size.
              </p>
              <Button size="lg" onClick={go} className="h-12 px-7 rounded-full font-bold shadow-[0_0_44px_-10px_hsl(var(--primary)/0.7)]">
                {isLoggedIn ? "Open dashboard" : "Get started — it's free"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/20 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-[15px] font-black tracking-[-0.03em]">fluxcore</span>
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
