import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import downtownLogo from "@/assets/bargains-downtown-logo.png";

const WORKSPACE_ID = "abc43fd3-734d-48fc-8461-0f3f92b24cb2";

export default function BloxyBargainsDowntown() {
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
            <img src={downtownLogo} alt="Bargains Downtown" className="w-8 h-8 rounded-full" />
            <span className="text-lg font-extrabold text-foreground tracking-tight">Bargains Downtown</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground">Sign in</Button>
            <Button variant="hero" size="sm" onClick={() => navigate("/login")}>Get Started</Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 40% at 50% -10%, hsl(0 0% 40% / 0.12), transparent)" }} />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-muted-foreground/30 bg-muted/20 text-xs text-muted-foreground mb-6">
            <Zap className="w-3 h-3" /> Human Resources Portal
          </div>
          <img src={downtownLogo} alt="Bargains Downtown" className="w-20 h-20 rounded-2xl mx-auto mb-6 shadow-lg" />
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight mb-5">
            Bargains Downtown<br />
            <span className="text-gradient-hero">HR Portal</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-4">
            Staff management and operations — powered by Fluxcore.
          </p>
          <p className="text-xs text-muted-foreground mb-8">Owned by withss • ~100 members</p>
          <Button variant="hero" size="lg" onClick={() => navigate("/login")} className="px-8">
            Enter Portal <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </section>

      <footer className="relative border-t border-border/30 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Powered by <button onClick={() => navigate("/")} className="text-primary hover:underline">Fluxcore</button></span>
          <p className="text-xs text-muted-foreground">© 2026 Bargains Downtown</p>
        </div>
      </footer>
    </div>
  );
}
