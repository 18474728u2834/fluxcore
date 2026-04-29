import { CheckCircle2, XCircle, Loader2, Copy, RefreshCw, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVerification } from "@/hooks/useVerification";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function VerificationFlow({ gamepassId }: { gamepassId?: string }) {
  const { state, setUsername, proceedToEmoji, regenerateEmojis, verify, reset } =
    useVerification(gamepassId ? { checkGamepass: true, gamepassId } : undefined);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const copyEmojis = () => {
    navigator.clipboard.writeText(state.emojiCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto">
      {state.step === "input" && (
        <div className="glass rounded-xl p-8 space-y-6 gradient-border animate-fade-in">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Link Your Roblox Account</h2>
            <p className="text-muted-foreground text-sm">Enter your Roblox username</p>
          </div>
          <div className="space-y-4">
            <Input
              placeholder="Roblox username"
              value={state.robloxUsername}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-muted border-border focus:border-primary"
            />
            {state.error && <p className="text-destructive text-sm">{state.error}</p>}
            <Button onClick={proceedToEmoji} className="w-full" variant="hero">
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {state.step === "emoji" && (
        <div className="glass rounded-xl p-8 space-y-6 gradient-border animate-scale-in">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">Verify Your Identity</h2>
            <p className="text-muted-foreground text-sm">
              Paste this code at the <strong className="text-foreground">start</strong> of your Roblox bio
            </p>
          </div>
          <div className="bg-muted rounded-xl p-4 space-y-3">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Verification Code</p>
            <div className="font-mono text-base sm:text-lg leading-relaxed break-all select-all tracking-tight text-foreground bg-background/40 rounded-lg px-3 py-2.5 border border-border/40">
              {state.emojiCode}
            </div>
            <div className="flex gap-2">
              <Button onClick={copyEmojis} variant="secondary" size="sm" className="flex-1 press-shrink">
                <Copy className="w-3 h-3 mr-1" /> {copied ? "Copied!" : "Copy"}
              </Button>
              <Button onClick={regenerateEmojis} variant="ghost" size="sm" className="press-shrink">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <Button onClick={verify} className="w-full press-shrink" variant="hero">Verify</Button>
        </div>
      )}

      {state.step === "checking" && (
        <div className="glass rounded-xl p-8 space-y-6 text-center animate-fade-in">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Verifying...</h2>
        </div>
      )}

      {state.step === "success" && (
        <div className="glass rounded-xl p-8 space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Verified!</h2>
          <Button onClick={() => navigate("/workspaces")} className="w-full" variant="hero">
            Go to Workspaces
          </Button>
        </div>
      )}

      {state.step === "failed" && (
        <div className="glass rounded-xl p-8 space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Verification Failed</h2>
          <p className="text-destructive text-sm">{state.error}</p>
          <Button onClick={reset} className="w-full" variant="outline">Try Again</Button>
        </div>
      )}
    </div>
  );
}
