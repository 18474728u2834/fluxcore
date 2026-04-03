import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Shield, Clock, Zap } from "lucide-react";

export default function BloxyBargains() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center text-sm font-bold text-warning">BB</div>
            <span className="text-lg font-extrabold text-foreground tracking-tight">Bloxy Bargains</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground">Sign in</Button>
            <Button variant="hero" size="sm" onClick={() => navigate("/login")}>Get Started</Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 40% at 50% -10%, hsl(32 95% 55% / 0.12), transparent)" }} />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-warning/30 bg-warning/5 text-xs text-warning mb-6">
            <Zap className="w-3 h-3" /> Human Resources Portal
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight mb-5">
            Bloxy Bargains<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, hsl(32 95% 60%), hsl(25 90% 50%))" }}>
              HR Portal
            </span>
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-8">
            Manage your team, track activity, and run operations — powered by Fluxcore.
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate("/login")} className="px-8">
            Enter Portal <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass rounded-xl p-8 text-center gradient-border">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center text-2xl font-bold text-warning mx-auto mb-4">BB</div>
            <h2 className="text-xl font-bold text-foreground mb-2">About Bloxy Bargains</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">500+</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Archie</p>
                <p className="text-xs text-muted-foreground">Executive Officer</p>
              </div>
              <div>
                <p className="text-lg font-bold text-primary">Fluxcore</p>
                <p className="text-xs text-muted-foreground">Powered By</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Fluxcore thanks Bloxy Bargains for choosing us as their HR management platform!
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/30 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Powered by <button onClick={() => navigate("/")} className="text-primary hover:underline">Fluxcore</button></span>
          <p className="text-xs text-muted-foreground">© 2026 Bloxy Bargains</p>
        </div>
      </footer>
    </div>
  );
}
