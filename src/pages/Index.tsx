import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, BarChart3, Users, Clock, FileText, ChevronRight } from "lucide-react";

const features = [
  {
    icon: Users,
    label: "Core",
    title: "Staff Management",
    description: "Custom roles, permissions, and seamless rank syncing to your Roblox group.",
  },
  {
    icon: Clock,
    label: "Tracking",
    title: "Activity Tracking",
    description: "Detailed session logs, attendance metrics, and real-time activity monitoring.",
  },
  {
    icon: Shield,
    label: "Security",
    title: "Adonis Integration",
    description: "Automatic logging of kicks, bans, warns from Adonis admin commands.",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    title: "Leaderboards",
    description: "Activity leaderboards, engagement trends, and performance tracking.",
  },
  {
    icon: FileText,
    label: "Sessions",
    title: "Event Scheduling",
    description: "Schedule shifts, trainings, and interviews with Host/Co-Host/Trainer roles.",
  },
  {
    icon: Zap,
    label: "Wall",
    title: "Announcements",
    description: "Post updates, notices, and pinned announcements visible to your entire team.",
  },
];

const stats = [
  { value: "500+", label: "Active Groups" },
  { value: "25K+", label: "Members Managed" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-extrabold text-gradient tracking-tight">Fluxcore</span>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground">
              Log in
            </Button>
            <Button variant="hero" size="sm" onClick={() => navigate("/login")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-secondary/40 text-xs text-muted-foreground mb-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <Zap className="w-3 h-3 text-primary" />
            Now with Adonis admin integration
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-5 opacity-0 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Manage your group<br />
            <span className="text-gradient-hero">like never before.</span>
          </h1>

          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            Activity tracking, sessions, admin logs, and team management. Built for serious Roblox communities.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center opacity-0 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <Button variant="hero" size="lg" onClick={() => navigate("/login")} className="px-8">
              Start for free <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-extrabold text-gradient">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Features</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Everything in one place
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
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Simple & Free</h2>
          </div>

          <div className="glass rounded-xl p-8 text-center gradient-border max-w-md mx-auto">
            <h3 className="text-xl font-bold text-foreground">Free</h3>
            <p className="text-3xl font-extrabold text-foreground mt-2">$0</p>
            <p className="text-xs text-muted-foreground mt-1">Everything included, no limits</p>
            <ul className="space-y-2 text-sm text-muted-foreground mt-6 text-left max-w-xs mx-auto">
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Unlimited workspaces</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Activity tracking & leaderboards</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Adonis admin logging</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Session scheduling</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Announcement wall</li>
            </ul>
            <Button variant="hero" className="w-full mt-6" onClick={() => navigate("/login")}>Get Started</Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-lg font-extrabold text-gradient tracking-tight">Fluxcore</span>
          <p className="text-xs text-muted-foreground">© 2026 Fluxcore. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
