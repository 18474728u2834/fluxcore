import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight, Activity, Calendar, Shield, FileSignature, Users, Target, MessageSquare,
  Plane, Megaphone, KeyRound, Zap, BadgeCheck, ShieldCheck, Terminal, Headphones,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { WorkspaceMarquee } from "@/components/WorkspaceMarquee";
import { SiteBanner } from "@/components/SiteBanner";

const features = [
  { icon: Activity, cmd: "activity --live", desc: "Heartbeats every 30s with idle detection." },
  { icon: Shield, cmd: "rank promote <user>", desc: "Ranking synced to Roblox via Open Cloud." },
  { icon: Calendar, cmd: "session schedule", desc: "Trainings, raids, patrols with reminders." },
  { icon: FileSignature, cmd: "docs sign", desc: "Policies with digital signatures + deadlines." },
  { icon: Users, cmd: "roles import", desc: "Granular per-page permissions." },
  { icon: Target, cmd: "quota set --weekly", desc: "Per-role session and time targets." },
  { icon: MessageSquare, cmd: "logs grep", desc: "Search every in-game staff message." },
  { icon: Plane, cmd: "loa request", desc: "Time off requests, one-click approvals." },
  { icon: Megaphone, cmd: "wall post --pin", desc: "Announcements the team actually reads." },
  { icon: BadgeCheck, cmd: "member history", desc: "Warnings and promotions on every profile." },
  { icon: KeyRound, cmd: "api keys rotate", desc: "Open Cloud auto-rank. No bots required." },
  { icon: Zap, cmd: "webhook discord", desc: "Alerts routed where your team already is." },
];

export default function LandingTerminal() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isLoggedIn = !authLoading && !!user;
  const go = () => navigate(isLoggedIn ? "/workspaces" : "/login");

  return (
    <div className="min-h-screen bg-[#08080a] text-[#e8e8ea] overflow-x-hidden selection:bg-primary/40">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #16161a 1px, transparent 1px), linear-gradient(to bottom, #16161a 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-primary/[0.12] blur-[170px]" />
      </div>

      <nav className="fixed top-0 w-full z-50">
        <SiteBanner placement="marketing" />
        <div className="bg-[#08080a]/80 backdrop-blur-xl border-b border-[#1c1c20]">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 font-mono text-[14px]">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="font-bold">fluxcore</span>
              <span className="text-[#5a5a60]">~/staff</span>
            </button>
            <div className="hidden md:flex items-center gap-6 font-mono text-[13px] text-[#8a8a92]">
              <a href="#features" className="hover:text-white transition-colors">/product</a>
              <button onClick={() => navigate("/pricing")} className="hover:text-white transition-colors">/pricing</button>
              <button onClick={() => navigate("/security")} className="hover:text-white transition-colors">/security</button>
              <button onClick={() => navigate("/support")} className="hover:text-white transition-colors">/support</button>
            </div>
            <Button size="sm" onClick={go} className="h-8 px-4 rounded-md font-mono text-[12px] font-semibold">
              {isLoggedIn ? "dashboard" : "sign in"} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-36 pb-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="font-mono text-[12px] text-primary mb-6">
            <span className="text-[#5a5a60]">$</span> fluxcore init --group "your-roblox-group"
          </div>
          <h1 className="text-[42px] sm:text-[62px] lg:text-[74px] font-black leading-[0.94] tracking-[-0.045em] mb-7">
            Staff operations,
            <br />
            <span className="text-primary">without the chaos.</span>
          </h1>
          <p className="font-mono text-[15px] text-[#9a9aa2] max-w-2xl leading-relaxed mb-9">
            One control surface for tracking, ranking, scheduling, quotas and policies.
            Built for Roblox groups that run like organisations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={go} className="h-11 px-6 rounded-md font-mono font-semibold text-[14px]">
              {isLoggedIn ? "open dashboard" : "get started --free"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/security")}
              className="h-11 px-6 rounded-md font-mono text-[14px] border-[#26262c] bg-transparent text-[#d8d8dc] hover:bg-[#141418] hover:text-white">
              <ShieldCheck className="w-4 h-4 mr-2 text-emerald-400" /> security.md
            </Button>
          </div>

          <div className="mt-14 rounded-lg border border-[#1c1c20] bg-[#0c0c0e] overflow-hidden shadow-[0_40px_120px_-40px_hsl(var(--primary)/0.55)]">
            <div className="flex items-center gap-2 px-4 h-9 border-b border-[#1c1c20] bg-[#0a0a0c]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2a2a30]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#2a2a30]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#2a2a30]" />
              <span className="ml-2 font-mono text-[11px] text-[#5a5a60]">fluxcore — activity stream</span>
            </div>
            <div className="p-5 font-mono text-[12.5px] leading-[1.9]">
              {[
                ["12:04", "synt", "joined server · tracking started", "text-emerald-400"],
                ["12:19", "kai", "signed document 'Staff Handbook'", "text-primary"],
                ["12:31", "mira", "hosted session 'Weekly Training'", "text-violet-400"],
                ["12:47", "synt", "promoted -> Supervisor (Open Cloud ok)", "text-emerald-400"],
                ["13:02", "quota", "8/10 members met weekly target", "text-amber-400"],
              ].map(([t, who, msg, color]) => (
                <div key={t as string} className="flex gap-3">
                  <span className="text-[#4a4a52]">{t}</span>
                  <span className="text-[#8a8a92] w-14 shrink-0">{who}</span>
                  <span className={color as string}>{msg}</span>
                </div>
              ))}
              <div className="flex gap-3 text-[#5a5a60]">
                <span>13:03</span>
                <span className="w-14 shrink-0">_</span>
                <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 relative">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#5a5a60] mb-6">
            // trusted by roblox communities
          </p>
          <WorkspaceMarquee />
        </div>
      </section>

      <section id="features" className="py-24 relative">
        <div className="max-w-6xl mx-auto px-6">
          <p className="font-mono text-[12px] text-primary mb-3">// features</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.035em] mb-12 max-w-xl leading-[1.03]">
            Twelve modules. One workspace.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-[#1c1c20]">
            {features.map((f) => (
              <div key={f.cmd} className="group border-r border-b border-[#1c1c20] p-6 hover:bg-[#101014] transition-colors">
                <f.icon className="w-[18px] h-[18px] text-primary mb-4" strokeWidth={2} />
                <div className="font-mono text-[13px] font-semibold mb-1.5">
                  <span className="text-[#4a4a52]">$ </span>{f.cmd}
                </div>
                <p className="text-[13px] text-[#8a8a92] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.035em] leading-[1.03] mb-4">
            $0. Every feature. Every group.
          </h2>
          <p className="font-mono text-[14px] text-[#8a8a92] mb-8">
            no credit card · no gamepass · no seat limits
          </p>
          <Button size="lg" onClick={go} className="h-11 px-7 rounded-md font-mono font-bold text-[14px]">
            {isLoggedIn ? "open dashboard" : "fluxcore init"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-[#1c1c20] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-mono text-[13px] font-bold">fluxcore</span>
          <div className="flex items-center gap-5 text-sm text-[#8a8a92] flex-wrap justify-center">
            <button onClick={() => navigate("/support")} className="hover:text-white transition-colors flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5" /> Support
            </button>
            <button onClick={() => navigate("/feedback")} className="hover:text-white transition-colors">Feedback</button>
            <button onClick={() => navigate("/terms")} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Privacy</button>
            <LanguageSelector />
          </div>
          <p className="text-xs text-[#5a5a60]">© 2026 Fluxcore · All Rights Reserved to RetailPro Technologies UIA</p>
        </div>
      </footer>
    </div>
  );
}
