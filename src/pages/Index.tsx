import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, CheckCircle2, Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 h-14 flex items-center justify-between">
        <span className="text-lg font-bold text-gradient">RoManage</span>
        <Button variant="glow" size="sm" onClick={() => navigate("/verify")}>
          Get Started
        </Button>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center space-y-8 animate-slide-in">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto glow-primary">
            <Gamepad2 className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight">
              Manage Your Roblox Group<br />
              <span className="text-gradient">Like a Pro</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              The all-in-one management panel for Roblox groups. Verify members, manage ranks, and track activity — all in one place.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="glow" size="lg" onClick={() => navigate("/verify")}>
              Verify & Get Access <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
              View Dashboard
            </Button>
          </div>

          <div className="flex flex-wrap gap-6 justify-center text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" /> Emoji Verification
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" /> Gamepass Gating
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" /> Rank Management
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
