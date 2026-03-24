import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gamepad2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const handleRobloxLogin = () => {
    // In production, this would redirect to Roblox OAuth 2.0
    // For now, simulate login and go to workspaces
    navigate("/workspaces");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid opacity-20" />

      <div className="relative w-full max-w-md mx-4">
        <div className="glass rounded-2xl p-8 space-y-8 gradient-border">
          {/* Logo */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-extrabold text-gradient">Fluxcore</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your Roblox community
            </p>
          </div>

          {/* Roblox Login */}
          <div className="space-y-4">
            <Button
              onClick={handleRobloxLogin}
              className="w-full h-12 bg-secondary hover:bg-secondary/80 text-foreground font-semibold gap-3 border border-border hover:border-primary/30 transition-all"
              size="lg"
            >
              <Gamepad2 className="w-5 h-5" />
              Continue with Roblox
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">Powered by Roblox OAuth 2.0</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            By continuing, you agree to Fluxcore's Terms of Service and Privacy Policy. We'll only access your public Roblox profile.
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
