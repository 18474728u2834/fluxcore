import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumGateProps {
  feature: string;
  description?: string;
}

export function PremiumGate({ feature, description }: PremiumGateProps) {
  const navigate = useNavigate();
  return (
    <div className="relative max-w-xl mx-auto">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/40 via-violet-500/20 to-primary/40 opacity-60 blur-xl" />
      <div className="relative rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-xl p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/30">
          <Crown className="w-7 h-7 text-white" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold uppercase tracking-widest text-primary mb-3">
          <Sparkles className="w-3 h-3" />
          Premium
        </div>
        <h2 className="text-2xl font-black text-foreground mb-2">
          {feature} is a Premium feature
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
          {description ?? "Upgrade your workspace with a one-time Roblox gamepass to unlock this and the rest of Premium — no subscription, paid in Robux."}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => navigate("/pricing")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-6 shadow-lg shadow-primary/30">
            See Premium <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
