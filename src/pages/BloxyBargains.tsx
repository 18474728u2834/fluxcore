import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import bloxyLogo from "@/assets/bloxy-bargains-logo.png";

const WORKSPACE_ID = "b0b7ad15-e962-479e-8cf1-747f61e66147";

export default function BloxyBargains() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate(`/w/${WORKSPACE_ID}/dashboard`);
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <nav className="fixed top-0 w-full z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={bloxyLogo} alt="Bloxy Bargains" className="w-8 h-8 rounded-full" />
            <span className="text-lg font-extrabold text-foreground tracking-tight">Bloxy Bargains</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground">Sign in</Button>
            <Button variant="hero" size="sm" onClick={() => navigate("/login")}>Get Started</Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 40% at 50% -10%, hsl(32 95% 55% / 0.12), transparent)" }} />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-warning/30 bg-warning/5 text-xs text-warning mb-6">
            <Zap className="w-3 h-3" /> Human Resources Portal
          </div>
          <img src={bloxyLogo} alt="Bloxy Bargains" className="w-20 h-20 rounded-2xl mx-auto mb-6 shadow-lg" />
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

      <section className="relative py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass rounded-xl p-8 text-center gradient-border">
            <img src={bloxyLogo} alt="Bloxy Bargains" className="w-16 h-16 rounded-full mx-auto mb-4" />
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
          </div>
        </div>
      </section>

      <footer className="relative border-t border-border/30 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Powered by <button onClick={() => navigate("/")} className="text-primary hover:underline">Fluxcore</button></span>
          <p className="text-xs text-muted-foreground">© 2026 Bloxy Bargains</p>
        </div>
      </footer>
    </div>
  );
}
