import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  ArrowRight,
  ArrowUpRight,
  Sun,
  Moon,
  Activity,
  Calendar,
  Shield,
  FileSignature,
  Users,
  MessageSquare,
  Plane,
  Target,
  Megaphone,
  KeyRound,
  Zap,
  LayoutDashboard,
  Clock,
  CalendarDays,
  FileText,
  CalendarOff,
  UserX,
  ShieldCheck,
  Code,
  Settings,
  BadgeCheck,
} from "lucide-react";
import { WorkspaceMarquee } from "@/components/WorkspaceMarquee";
import { SiteBanner } from "@/components/SiteBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import bloxyBargainsBadge from "@/assets/bloxy-bargains-badge.png";
import redFunnelBadge from "@/assets/red-funnel-badge.png";

/* ---------------------------------------------------------------------------
   Fluxcore homepage — quiet, editorial, product-first.
   No hero glow, no floating orbs. Type, rules, and one honest screenshot.
--------------------------------------------------------------------------- */

const RULE = "border-border/50";

export default function LandingClassic() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLoggedIn = !authLoading && !!user;
  const isMobile = useIsMobile();

  const go = () => navigate(isLoggedIn ? "/workspaces" : "/login");

  const capabilities = [
    { icon: Activity, title: "Activity tracking", desc: "A heartbeat every 30 seconds, idle detection included. You always know who is in-game and for how long." },
    { icon: Shield, title: "Group ranking", desc: "Promote and demote from the dashboard. Writes straight back to your Roblox group over Open Cloud." },
    { icon: Calendar, title: "Sessions & shifts", desc: "Trainings, patrols, flights. Staff claim their own slots and Discord gets the reminder." },
    { icon: Target, title: "Per-role quotas", desc: "Weekly session and time targets per rank. Reset weekly, monthly, or never." },
    { icon: FileSignature, title: "Policies & signatures", desc: "Write the handbook once, require sign-off, auto-assign it to everyone who joins." },
    { icon: Users, title: "Roles & permissions", desc: "Import ranks from Roblox, then split permissions down to promote vs. demote." },
    { icon: MessageSquare, title: "Message logs", desc: "Every staff chat line in-game, searchable. Moderation stops being a guessing game." },
    { icon: Plane, title: "Leave of absence", desc: "Requests in, approvals in one click, quotas adjust themselves while people are away." },
    { icon: Megaphone, title: "Staff wall", desc: "Announcements that people actually read, instead of a seventh Discord channel." },
    { icon: BadgeCheck, title: "Warnings & history", desc: "Warnings, promotions and notes stay on the profile, so handovers take five minutes." },
    { icon: KeyRound, title: "Open Cloud API", desc: "Your group key, your ranking. No bot account sitting in the group doing the work." },
    { icon: Zap, title: "Discord webhooks", desc: "Reminders, rank changes and alerts routed to the channels your team already watches." },
  ];

  const rail = [
    { icon: LayoutDashboard, label: "Dashboard" },
    { icon: Users, label: "Members" },
    { icon: Clock, label: "Activity" },
    { icon: CalendarDays, label: "Sessions" },
    { icon: Megaphone, label: "Wall" },
    { icon: FileText, label: "Documents" },
    { icon: CalendarOff, label: "LOA" },
    { icon: UserX, label: "Staff" },
    { icon: Target, label: "Quotas" },
    { icon: MessageSquare, label: "Logs" },
    { icon: ShieldCheck, label: "Roles" },
    { icon: Code, label: "Tracking" },
  ];

  const Wordmark = ({ small }: { small?: boolean }) => (
    <button onClick={() => navigate("/")} className="flex items-center gap-2">
      <span className="w-[22px] h-[22px] rounded-[6px] bg-foreground flex items-center justify-center">
        <span className="text-background text-[12px] font-black leading-none">F</span>
      </span>
      <span className={`${small ? "text-[14px]" : "text-[15px]"} font-semibold tracking-[-0.01em]`}>Fluxcore</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ---------------------------------------------------------------- nav */}
      <nav className="sticky top-0 z-50 bg-background/85 backdrop-blur-md">
        <SiteBanner placement="marketing" />
        <div className={`border-b ${RULE}`}>
          <div className="max-w-[1080px] mx-auto px-6 h-[58px] flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Wordmark />
              <div className="hidden md:flex items-center gap-6">
                <a href="#product" className="text-[13.5px] text-muted-foreground hover:text-foreground transition-colors">Product</a>
                <button onClick={() => navigate("/pricing")} className="text-[13.5px] text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
                <button onClick={() => navigate("/security")} className="text-[13.5px] text-muted-foreground hover:text-foreground transition-colors">Security</button>
                <button onClick={() => navigate("/support")} className="text-[13.5px] text-muted-foreground hover:text-foreground transition-colors">Support</button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleTheme} aria-label="Toggle theme" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {!isLoggedIn && (
                <button onClick={() => navigate("/login")} className="hidden sm:block text-[13.5px] px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </button>
              )}
              <button
                onClick={go}
                className="text-[13.5px] font-medium h-8 px-3.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                {isLoggedIn ? "Dashboard" : "Get started"}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --------------------------------------------------------------- hero */}
      <section className={`border-b ${RULE}`}>
        <div className="max-w-[1080px] mx-auto px-6 pt-20 pb-16">
          <p className="text-[12px] text-muted-foreground mb-5">Staff management for Roblox groups</p>
          <h1 className="text-[40px] sm:text-[58px] font-semibold leading-[1.02] tracking-[-0.035em] max-w-[15ch]">
            Run your group like
            <br className="hidden sm:block" /> it&rsquo;s an actual company.
          </h1>
          <p className="mt-6 text-[16.5px] leading-[1.65] text-muted-foreground max-w-[54ch]">
            Fluxcore is one dashboard for activity, ranking, sessions, quotas and policies.
            The spreadsheet, the four Discord bots and the tab you keep losing — all replaced.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              onClick={go}
              className="group inline-flex items-center gap-2 h-10 px-4 rounded-md bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition-opacity"
            >
              {isLoggedIn ? "Open dashboard" : "Start free with Roblox"}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
            <a href="#product" className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-md border ${RULE} text-[14px] font-medium hover:bg-muted/50 transition-colors`}>
              See the dashboard
            </a>
            <span className="text-[12.5px] text-muted-foreground">Free, no card, sign in with Roblox.</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ product */}
      <section id="product" className={`border-b ${RULE} bg-muted/20`}>
        <div className="max-w-[1080px] mx-auto px-6 py-16">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
            <div>
              <p className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">Nexus UI</p>
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] mt-1">The dashboard your staff open every day</h2>
            </div>
            <span className="text-[12.5px] text-muted-foreground font-mono">fluxcore.works/w/…/dashboard</span>
          </div>

          {isMobile ? <NexusPhone rail={rail} /> : <NexusWindow rail={rail} />}
        </div>
      </section>

      {/* --------------------------------------------------------------- used */}
      <section className={`border-b ${RULE}`}>
        <div className="max-w-[1080px] mx-auto px-6 py-12">
          <p className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground mb-6">In use today</p>
          <div className="flex items-center gap-8 flex-wrap mb-8">
            <span className="flex items-center gap-2.5">
              <img src={bloxyBargainsBadge} alt="Bloxy Bargains" className="w-6 h-6 rounded object-cover" />
              <span className="text-[14px] font-medium">Bloxy Bargains</span>
            </span>
            <span className="flex items-center gap-2.5">
              <img src={redFunnelBadge} alt="Red Funnel Group" className="w-6 h-6 rounded object-cover" />
              <span className="text-[14px] font-medium">Red Funnel Group</span>
            </span>
            <span className="text-[14px] text-muted-foreground">and a steadily growing list of groups</span>
          </div>
          <WorkspaceMarquee />
        </div>
      </section>

      {/* ------------------------------------------------------- capabilities */}
      <section className={`border-b ${RULE}`}>
        <div className="max-w-[1080px] mx-auto px-6 py-16">
          <div className="max-w-[52ch] mb-10">
            <p className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground mb-3">What&rsquo;s inside</p>
            <h2 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.03em] leading-[1.1]">
              Twelve things you were doing by hand.
            </h2>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l ${RULE}`}>
            {capabilities.map((c) => (
              <div key={c.title} className={`border-r border-b ${RULE} p-6 hover:bg-muted/30 transition-colors`}>
                <c.icon className="w-[17px] h-[17px] text-muted-foreground mb-4" strokeWidth={1.8} />
                <h3 className="text-[14.5px] font-semibold mb-1.5 tracking-[-0.01em]">{c.title}</h3>
                <p className="text-[13.5px] text-muted-foreground leading-[1.6]">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- security */}
      <section className={`border-b ${RULE} bg-muted/20`}>
        <div className="max-w-[1080px] mx-auto px-6 py-16 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-12">
          <div>
            <p className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground mb-3">Security</p>
            <h2 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.03em] leading-[1.1] mb-4">
              Your data is encrypted and never leaves our database.
            </h2>
            <p className="text-[15px] text-muted-foreground leading-[1.65] mb-6">
              Isolation happens in Postgres, not just in the app. Even if someone got a query through,
              one workspace still cannot read another&rsquo;s rows.
            </p>
            <button onClick={() => navigate("/security")} className="inline-flex items-center gap-1.5 text-[14px] font-medium hover:underline">
              Full security overview <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className={`border-t ${RULE}`}>
            {[
              ["Encrypted in transit", "HTTPS/TLS 1.2+ with OCSP stapling on every request — browser, game server, Open Cloud."],
              ["Encrypted at rest", "Managed Postgres encrypts every disk page and every automated backup, uploads included."],
              ["Secrets double-encrypted", "API keys, Open Cloud keys and webhooks get a second pgcrypto layer. Owners only."],
              ["Row-Level Security", "Every table gated by RLS. Workspaces are isolated at the database level."],
              ["Roblox OAuth, no passwords", "OAuth 2.0 with PKCE. We never see or store a Roblox password."],
              ["Daily breach scans", "Automated checks for faults and exposure run every night, reviewed by staff."],
            ].map(([t, d]) => (
              <div key={t} className={`border-b ${RULE} py-4 flex gap-4`}>
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" strokeWidth={1.9} />
                <div>
                  <h3 className="text-[14px] font-semibold mb-1">{t}</h3>
                  <p className="text-[13.5px] text-muted-foreground leading-[1.6]">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ pricing */}
      <section className={`border-b ${RULE}`}>
        <div className="max-w-[1080px] mx-auto px-6 py-16">
          <div className={`border ${RULE} rounded-lg p-8 sm:p-10 flex flex-col md:flex-row md:items-center gap-8 justify-between`}>
            <div className="max-w-[46ch]">
              <p className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground mb-3">Pricing</p>
              <h2 className="text-[28px] font-semibold tracking-[-0.03em] leading-[1.1] mb-3">Free for everyone. Forever.</h2>
              <p className="text-[15px] text-muted-foreground leading-[1.65]">
                No card, no subscription, no gamepass gate. Every feature is unlocked for every group,
                whether you have nine staff or nine hundred.
              </p>
            </div>
            <div className="shrink-0">
              <button onClick={go} className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition-opacity">
                {isLoggedIn ? "Open dashboard" : "Create your workspace"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- footer */}
      <footer>
        <div className="max-w-[1080px] mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Wordmark small />
            <p className="mt-3 text-[13px] text-muted-foreground leading-[1.6] max-w-[28ch]">
              Staff management for Roblox groups that take it seriously.
            </p>
          </div>
          {[
            { h: "Product", l: [["Pricing", "/pricing"], ["Security", "/security"], ["Status", "/status"], ["Changelog", "/feedback"]] },
            { h: "Support", l: [["Help & tickets", "/support"], ["Feedback", "/feedback"], ["Workspaces", "/workspaces"]] },
            { h: "Legal", l: [["Terms", "/terms"], ["Privacy", "/privacy"]] },
          ].map((col) => (
            <div key={col.h}>
              <h4 className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground mb-3">{col.h}</h4>
              <ul className="space-y-2">
                {col.l.map(([label, href]) => (
                  <li key={label}>
                    <button onClick={() => navigate(href)} className="text-[13.5px] text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={`border-t ${RULE}`}>
          <div className="max-w-[1080px] mx-auto px-6 py-5 text-[12.5px] text-muted-foreground flex flex-wrap gap-2 justify-between">
            <span>&copy; {new Date().getFullYear()} Fluxcore. All rights reserved to RetailPro Technologies UIA.</span>
            <span>Not affiliated with or endorsed by Roblox Corporation.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Nexus UI render — mirrors the real BargainsShell chrome                     */
/* -------------------------------------------------------------------------- */

type RailItem = { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string };

function NexusWindow({ rail }: { rail: RailItem[] }) {
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)]" style={{ background: "#0f0f10" }}>
      {/* browser chrome */}
      <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b" style={{ borderColor: "#1a1a1c", background: "#0a0a0b" }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3a3a3e" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3a3a3e" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3a3a3e" }} />
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-1 rounded text-[11px] font-mono" style={{ background: "#161618", color: "rgba(255,255,255,0.45)" }}>
            fluxcore.works/w/staff-team/dashboard
          </div>
        </div>
      </div>

      <div className="flex min-h-[540px]" style={{ color: "#fafafa" }}>
        {/* icon rail */}
        <aside className="w-[54px] shrink-0 flex flex-col items-center py-3 border-r" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
          <div className="w-7 h-7 rounded-md mb-3 flex items-center justify-center" style={{ background: "#f55a4a" }}>
            <span className="text-white font-black text-[11px]">F</span>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            {rail.map((i, idx) => (
              <div key={i.label} className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ background: idx === 0 ? "#1f1f22" : "transparent", color: idx === 0 ? "#fff" : "#6f6f74" }}>
                <i.icon className="w-[15px] h-[15px]" strokeWidth={1.8} />
              </div>
            ))}
          </nav>
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ color: "#6f6f74" }}>
            <Settings className="w-[15px] h-[15px]" strokeWidth={1.8} />
          </div>
        </aside>

        {/* content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-11 flex items-center justify-between px-4 border-b" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-[4px]" style={{ background: "#f55a4a" }} />
              <span className="text-[12.5px] font-medium">Staff Team</span>
              <span className="text-[11px]" style={{ color: "#6f6f74" }}>/ Dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: "#161618", color: "#8a8a8e" }}>⌘K</span>
              <span className="w-6 h-6 rounded-md" style={{ background: "linear-gradient(135deg,#4d4d55,#2a2a30)" }} />
            </div>
          </header>

          <div className="p-5 space-y-5">
            {/* hero band */}
            <div className="rounded-md h-[132px] p-5 flex flex-col justify-end relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#6ea8ff 0%,#88b8ff 42%,#b6d2ff 100%)" }}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.42))" }} />
              <div className="relative">
                <div className="text-[10px] font-semibold uppercase tracking-[0.09em] text-white/75 mb-1">Hiya, Novavoff</div>
                <div className="text-white text-[24px] font-bold tracking-[-0.03em] leading-tight">Great to see you back</div>
              </div>
            </div>

            {/* stats */}
            <div className="grid grid-cols-4 gap-3">
              {[["Online now", "8", "live"], ["Hours today", "142h", "+12h"], ["Sessions this week", "17", "3 today"], ["Quota met", "78%", "of 46 staff"]].map(([l, v, s]) => (
                <div key={l} className="rounded-md border p-3" style={{ background: "#141416", borderColor: "#22222a" }}>
                  <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "#6f6f74" }}>{l}</div>
                  <div className="text-[22px] font-bold mt-1 leading-none">{v}</div>
                  <div className="text-[10px] font-mono mt-1.5 text-emerald-400">{s}</div>
                </div>
              ))}
            </div>

            {/* two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-4" style={{ background: "#141416", borderColor: "#22222a" }}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.09em] mb-3" style={{ color: "#6f6f74" }}>Upcoming sessions</div>
                <div className="space-y-2">
                  {[["Shift · 2:00 PM", "Host synt · 12 claimed"], ["Training · 5:30 PM", "Host kai · 6 claimed"], ["Event · 8:00 PM", "Host mira · 21 claimed"]].map(([t, m]) => (
                    <div key={t} className="flex items-center gap-2.5 rounded border px-2.5 py-2" style={{ background: "#0f0f11", borderColor: "#22222a" }}>
                      <span className="w-1.5 h-8 rounded-full" style={{ background: "#f55a4a" }} />
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold truncate">{t}</div>
                        <div className="text-[10.5px]" style={{ color: "#6f6f74" }}>{m}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border p-4" style={{ background: "#141416", borderColor: "#22222a" }}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.09em] mb-3" style={{ color: "#6f6f74" }}>Recent activity</div>
                <div className="space-y-2">
                  {[["synt", "Promoted to Supervisor"], ["kai", "Signed Staff Handbook"], ["mira", "Logged 6h 12m in-game"], ["noel", "LOA approved · 3 days"]].map(([n, a]) => (
                    <div key={n} className="flex items-center gap-2.5 rounded border px-2.5 py-2" style={{ background: "#0f0f11", borderColor: "#22222a" }}>
                      <span className="w-6 h-6 rounded-md shrink-0" style={{ background: "linear-gradient(135deg,#4d4d55,#2a2a30)" }} />
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold truncate">{n}</div>
                        <div className="text-[10.5px] truncate" style={{ color: "#6f6f74" }}>{a}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NexusPhone({ rail }: { rail: RailItem[] }) {
  return (
    <div className="mx-auto w-[272px] rounded-[2rem] border-[6px] border-[#1a1a1c] overflow-hidden shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)]" style={{ background: "#0f0f10" }}>
      <div className="h-6 flex items-center justify-center" style={{ background: "#0a0a0b" }}>
        <div className="w-16 h-3 rounded-full" style={{ background: "#0f0f10" }} />
      </div>
      <div style={{ color: "#fafafa" }}>
        <div className="h-11 px-3 flex items-center justify-between border-b" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-[5px]" style={{ background: "#f55a4a" }} />
            <span className="text-[12px] font-semibold">Staff Team</span>
          </div>
          <span className="text-[10px]" style={{ color: "#6f6f74" }}>Dashboard</span>
        </div>
        <div className="p-3 space-y-3">
          <div className="rounded-lg h-[88px] p-3 flex flex-col justify-end" style={{ background: "linear-gradient(135deg,#6ea8ff 0%,#88b8ff 42%,#b6d2ff 100%)" }}>
            <div className="text-[8px] font-semibold uppercase tracking-wider text-white/85">Hiya</div>
            <div className="text-white text-[15px] font-bold leading-tight">Novavoff</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[["Online now", "8"], ["Hours today", "142h"]].map(([l, v]) => (
              <div key={l} className="rounded-lg border p-2.5" style={{ background: "#141416", borderColor: "#22222a" }}>
                <div className="text-[8px] uppercase tracking-wider" style={{ color: "#6f6f74" }}>{l}</div>
                <div className="text-lg font-bold leading-tight">{v}</div>
              </div>
            ))}
          </div>
          {[["synt", "Promoted to Supervisor"], ["kai", "Signed Staff Handbook"], ["mira", "Logged 6h in-game"]].map(([n, a]) => (
            <div key={n} className="flex items-center gap-2 rounded-lg border px-2.5 py-2" style={{ background: "#141416", borderColor: "#22222a" }}>
              <span className="w-6 h-6 rounded-md shrink-0" style={{ background: "linear-gradient(135deg,#4d4d55,#2a2a30)" }} />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold">{n}</div>
                <div className="text-[9px] truncate" style={{ color: "#6f6f74" }}>{a}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-around border-t py-2" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
          {rail.slice(0, 5).map((i, idx) => (
            <i.icon key={i.label} className="w-[16px] h-[16px]" strokeWidth={1.8} />
          ))}
        </div>
      </div>
    </div>
  );
}
