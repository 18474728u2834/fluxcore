import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  ArrowRight,
  Sun,
  Moon,
  Headphones,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import bloxyBargainsBadge from "@/assets/bloxy-bargains-badge.png";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;

  // Stuff people actually care about, written like a person wrote it
  const pillars = [
    {
      kicker: "01",
      title: "See who's actually around.",
      body:
        "Live heartbeats every 30 seconds. Idle? We notice. No more taking screenshots of in-game lists at 2am to prove someone wasn't there.",
    },
    {
      kicker: "02",
      title: "Run shifts without the spreadsheet.",
      body:
        "Schedule trainings, raids, patrols — whatever your group does. Discord pings before they start. Staff claim their own slots.",
    },
    {
      kicker: "03",
      title: "Promote straight from the dashboard.",
      body:
        "Connected to your Roblox group through Open Cloud. One click and they're ranked. No tab juggling, no copy-pasting usernames.",
    },
    {
      kicker: "04",
      title: "Policies that don't get ignored.",
      body:
        "Write the rules once. Require digital signatures. Auto-assign to anyone new. Deadlines remind themselves.",
    },
  ];

  // Quiet feature list — read like a manifesto bullet, not a marketing card
  const everythingElse = [
    "Per-role weekly quotas",
    "Leave-of-absence flow",
    "In-game message logs (Premium)",
    "Auto-rank sync over Open Cloud",
    "Custom roles & granular perms",
    "Discord webhook reminders",
    "Workspace-wide blacklist",
    "Document deadlines",
    "Built-in support tickets",
    "AI assistant for common questions",
    "Staff wall for announcements",
    "Verified workspace badge",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-foreground">
      {/* Soft ambient — kept subtle */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[700px] h-[700px] rounded-full bg-primary/[0.06] blur-[140px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-violet-500/[0.04] blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/10 bg-background/70 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-[15px] font-black tracking-tight">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span><span className="text-primary">flux</span>core</span>
          </button>

          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <a href="#why" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">Why</a>
            <a href="#everything" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <button onClick={() => navigate("/pricing")} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => navigate("/feedback")} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">Feedback</button>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate("/support")} className="p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors" title="Support">
              <Headphones className="w-4 h-4" />
            </button>
            <button onClick={toggleTheme} className="p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isLoggedIn ? (
              <Button size="sm" onClick={() => navigate("/workspaces")} className="bg-foreground text-background hover:bg-foreground/90 font-semibold h-8 px-3 ml-1">
                Dashboard <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate("/login")} className="bg-foreground text-background hover:bg-foreground/90 font-semibold h-8 px-3 ml-1">
                Sign in
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* HERO — asymmetric, editorial */}
      <section className="relative pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-7">
              <span className="w-6 h-px bg-primary" />
              For people who run Roblox groups
            </div>

            <h1 className="text-[44px] sm:text-6xl lg:text-[80px] font-black leading-[0.95] tracking-[-0.02em] mb-7">
              Run your group{" "}
              <span className="italic font-light text-muted-foreground">like</span>{" "}
              you mean it.
              <br />
              <span className="text-gradient">Stop running it</span>{" "}
              <span className="italic font-light text-muted-foreground">like</span>{" "}
              homework.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed mb-8">
              Fluxcore is the dashboard a few of us wished existed when we were
              co-owning groups at 1am. Activity, ranks, shifts, policies — one
              place, fast, doesn't feel like a spreadsheet pretending to be software.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}
                className="group bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 text-[15px] rounded-full shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5"
              >
                {isLoggedIn ? "Open dashboard" : "Start — it's free"}
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <a
                href="#why"
                className="text-sm font-semibold text-foreground/80 hover:text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary px-3 py-2"
              >
                or scroll, see what's inside ↓
              </a>
            </div>

            <div className="mt-10 flex items-center gap-5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Free forever for the basics
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                One-time Robux unlock for Premium
              </div>
            </div>
          </div>

          {/* Right side: a quiet "card" that feels handwritten */}
          <div className="lg:col-span-4">
            <div className="relative rounded-2xl border border-border/30 bg-card/40 backdrop-blur-md p-6 shadow-2xl shadow-primary/5 -rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-rose-400/70" />
                <div className="w-2 h-2 rounded-full bg-amber-400/70" />
                <div className="w-2 h-2 rounded-full bg-emerald-400/70" />
                <span className="ml-2 text-[10px] font-mono text-muted-foreground">~/groups/fluxcore</span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mb-3">
                <span className="text-primary">$</span> staff active right now
              </p>
              <div className="text-5xl font-black tracking-tight mb-1">24<span className="text-muted-foreground/40">/31</span></div>
              <p className="text-[11px] text-emerald-400 font-mono mb-5">▲ 3 since last hour</p>

              <div className="space-y-1.5">
                {[
                  ["synt", "in-game · 2h 14m"],
                  ["kai", "in-game · 47m"],
                  ["devs", "idle · 3m"],
                  ["mira", "in-game · 1h 02m"],
                ].map(([name, status], i) => (
                  <div key={name} className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-foreground">@{name}</span>
                    <span className={i === 2 ? "text-amber-400/80" : "text-muted-foreground"}>{status}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-border/20 flex items-end gap-1 h-12">
                {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95, 70, 88].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-primary/30 to-primary/80" style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-2 font-mono">last 14 days</p>

              <div className="absolute -bottom-3 -right-3 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest rotate-3">
                live
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted strip — small, honest */}
      <section className="border-y border-border/10 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Already running on
          </span>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-opacity">
              <img src={bloxyBargainsBadge} alt="Bloxy Bargains" className="w-7 h-7 rounded-md object-cover" />
              <span className="text-sm font-bold">Bloxy Bargains</span>
            </div>
            <span className="text-xs text-muted-foreground/60 italic">+ a handful of groups we owe shoutouts to</span>
          </div>
        </div>
      </section>

      {/* WHY — numbered, magazine-style */}
      <section id="why" className="py-28 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-primary mb-3">— What it actually does</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
              Four things you stop doing manually{" "}
              <span className="italic font-light text-muted-foreground">the day you switch.</span>
            </h2>
          </div>

          <div className="space-y-px">
            {pillars.map((p, i) => (
              <div
                key={p.kicker}
                className="group grid grid-cols-12 gap-6 py-8 border-t border-border/15 hover:bg-primary/[0.02] transition-colors"
              >
                <div className="col-span-12 md:col-span-2">
                  <div className="text-5xl font-black text-primary/40 group-hover:text-primary transition-colors font-mono">
                    {p.kicker}
                  </div>
                </div>
                <h3 className="col-span-12 md:col-span-4 text-2xl font-bold tracking-tight leading-tight">
                  {p.title}
                </h3>
                <p className="col-span-12 md:col-span-6 text-base text-muted-foreground leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
            <div className="border-t border-border/15" />
          </div>
        </div>
      </section>

      {/* Quote block — gives it a person */}
      <section className="py-20 relative">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-2xl sm:text-3xl font-medium leading-snug text-foreground/90">
            <span className="text-primary text-4xl leading-none align-top mr-1">“</span>
            We built this because every group manager I knew had four tabs open,
            two Discord bots, and a Google Sheet they hated. So we made the thing.
            <span className="text-primary text-4xl leading-none align-top ml-1">”</span>
          </p>
          <div className="mt-6 inline-flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-xs font-black text-primary-foreground">
              N
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">Novavoff</p>
              <p className="text-xs text-muted-foreground">Built Fluxcore · Roblox group owner</p>
            </div>
          </div>
        </div>
      </section>

      {/* EVERYTHING ELSE — quiet text list, not 12 sparkly cards */}
      <section id="everything" className="py-28 relative">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-primary mb-3">— Everything else</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-4">
              The boring list{" "}
              <span className="italic font-light text-muted-foreground">that took two years to get right.</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Most of these are the kind of thing you don't think about until you
              don't have it. Then you can't go back.
            </p>
          </div>

          <div className="lg:col-span-8">
            <ul className="grid sm:grid-cols-2 gap-x-8">
              {everythingElse.map((item, i) => (
                <li
                  key={item}
                  className="group flex items-center gap-3 py-4 border-b border-border/15 text-[15px] hover:text-primary transition-colors"
                >
                  <span className="text-[10px] font-mono text-muted-foreground/50 w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium">{item}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* PRICING — kept, but quieter */}
      <section className="py-28 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-xl mb-14">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-primary mb-3">— Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
              Free until you outgrow it.{" "}
              <span className="italic font-light text-muted-foreground">No card. Ever.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Free */}
            <div className="rounded-2xl border border-border/20 bg-card/30 p-7 flex flex-col">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Free</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-6xl font-black tracking-tight">$0</span>
                <span className="text-muted-foreground text-sm">forever</span>
              </div>
              <p className="text-sm text-muted-foreground mb-7">Everything most groups will ever need.</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "Unlimited workspaces & members",
                  "Real-time activity tracking",
                  "Group ranking & role sync",
                  "Shift & event scheduling",
                  "Discord webhook reminders",
                  "Policies with digital signatures",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-11 font-semibold border-border/40 rounded-full" onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}>
                {isLoggedIn ? "Open dashboard" : "Get started"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Premium */}
            <div className="relative rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/[0.10] via-card/40 to-violet-500/[0.06] p-7 flex flex-col">
              <div className="absolute -top-2.5 left-6 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                Premium
              </div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-primary mb-3">One-time</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-6xl font-black tracking-tight">400</span>
                <span className="text-muted-foreground text-sm">Robux</span>
              </div>
              <p className="text-sm text-muted-foreground mb-7">For groups that want the full toolkit.</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "Everything in Free",
                  "In-game message logging",
                  "Auto-rank sync with Roblox",
                  "Verified workspace badge",
                  "Full custom branding",
                  "Per-role quotas & analytics",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full shadow-lg shadow-primary/30" onClick={() => navigate("/pricing")}>
                See Premium <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-24 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.02] mb-6">
            Stop spreadsheet-managing your group.{" "}
            <span className="text-gradient">Start running it.</span>
          </h2>
          <Button
            size="lg"
            onClick={() => navigate(isLoggedIn ? "/workspaces" : "/login")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-13 px-8 rounded-full shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5"
          >
            {isLoggedIn ? "Open dashboard" : "Get started — free"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Sign in with Roblox · takes about 30 seconds
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/10 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-base font-black tracking-tight">
              <span className="text-primary">flux</span>core
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground flex-wrap justify-center">
            <button onClick={() => navigate("/support")} className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5" /> Support
            </button>
            <button onClick={() => navigate("/feedback")} className="hover:text-foreground transition-colors">Feedback</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
            <LanguageSelector />
          </div>
          <p className="text-xs text-muted-foreground font-mono">© 2026 · made by humans</p>
        </div>
      </footer>
    </div>
  );
}
