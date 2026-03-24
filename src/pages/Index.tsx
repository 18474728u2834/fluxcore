import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, BarChart3, Users, Clock, FileText, ChevronRight } from "lucide-react";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

const features = [
  {
    icon: Users,
    label: "Core",
    title: "Staff Management",
    description: "Manage your entire team with custom roles, permissions, and automated rank syncing to your Roblox group.",
  },
  {
    icon: Clock,
    label: "Tracking",
    title: "Activity Tracking",
    description: "Monitor staff activity with detailed session logs, attendance tracking, and performance analytics.",
  },
  {
    icon: Shield,
    label: "Security",
    title: "Rank Management",
    description: "Promote, demote, warn, and manage members directly. Integrated with Roblox Open Cloud.",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    title: "Deep Insights",
    description: "Track growth trends, member engagement, and performance metrics with beautiful real-time dashboards.",
  },
  {
    icon: FileText,
    label: "Docs",
    title: "Hosted Documentation",
    description: "Host handbooks, training guides, and SOPs directly inside your workspace for easy team access.",
  },
  {
    icon: Zap,
    label: "Automation",
    title: "Smart Automations",
    description: "Automate repetitive tasks like inactivity notices, rank changes, and welcome messages.",
  },
];

const stats = [
  { value: "500+", label: "Active Groups" },
  { value: "25,000+", label: "Members Managed" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-extrabold text-gradient">Fluxcore</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Log in
            </Button>
            <Button variant="hero" size="sm" onClick={() => navigate("/login")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary/50 text-sm text-muted-foreground mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <Zap className="w-4 h-4 text-primary" />
            <span>Now with Roblox Open Cloud integration</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Manage your group<br />
            <span className="text-gradient-hero">Like never before.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 opacity-0 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            Sessions, activity tracking, rank management, and team tools — all in one place. Built for Roblox communities that mean business.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 opacity-0 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <Button variant="hero" size="lg" onClick={() => navigate("/login")} className="px-8">
              Start for free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="hero-outline" size="lg">
              Watch Demo
            </Button>
          </div>

          {/* Dashboard Preview */}
          <div className="relative opacity-0 animate-fade-up" style={{ animationDelay: "0.5s" }}>
            <div className="absolute -inset-4 bg-gradient-to-b from-primary/20 to-transparent rounded-2xl blur-3xl" />
            <div className="relative rounded-xl overflow-hidden border border-border/60 shadow-2xl">
              <img 
                src={dashboardPreview} 
                alt="Fluxcore Dashboard Preview" 
                className="w-full"
                width={1280}
                height={800}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold text-gradient">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Everything, one dashboard.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
              A sleek, powerful platform that gives you full control over your Roblox community management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="glass-hover rounded-xl p-6 group cursor-pointer">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">{f.label}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Flexible & Clear Pricing
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="glass rounded-xl p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground">Starter</h3>
                <p className="text-3xl font-extrabold text-foreground mt-2">Free</p>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-primary" /> Join unlimited workspaces</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-primary" /> Basic activity tracking</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-primary" /> Community support</li>
              </ul>
              <Button variant="hero-outline" className="w-full" onClick={() => navigate("/login")}>Get Started</Button>
            </div>

            {/* Pro */}
            <div className="glass rounded-xl p-8 space-y-6 gradient-border">
              <div>
                <h3 className="text-xl font-bold text-foreground">Pro</h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-3xl font-extrabold text-foreground">400</p>
                  <span className="text-sm text-muted-foreground">Robux</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Gamepass required to create workspaces</p>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-primary" /> Create your own workspaces</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-primary" /> Advanced analytics & graphs</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-primary" /> Auto-ranking & automations</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-primary" /> Priority support</li>
              </ul>
              <Button variant="hero" className="w-full" onClick={() => navigate("/login")}>Get Pro Access</Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Ready to level up your community?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join hundreds of Roblox groups already using Fluxcore to manage their communities.
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate("/login")} className="px-10">
            Get Started <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-extrabold text-gradient">Fluxcore</span>
          <p className="text-sm text-muted-foreground">© 2026 Fluxcore. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
