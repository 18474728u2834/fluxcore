import { CheckCircle2, XCircle, Loader2, Copy, RefreshCw, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVerification } from "@/hooks/useVerification";
import { useState } from "react";

const DEFAULT_GAMEPASS_ID = "000000000";

export function VerificationFlow() {
  const { state, setUsername, proceedToEmoji, regenerateEmojis, verify, reset } =
    useVerification(DEFAULT_GAMEPASS_ID);
  const [copied, setCopied] = useState(false);

  const copyEmojis = () => {
    navigator.clipboard.writeText(state.emojiCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto animate-slide-in">
      {/* Step 1: Username Input */}
      {state.step === "input" && (
        <div className="glass rounded-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Link Your Roblox Account</h2>
            <p className="text-muted-foreground text-sm">
              Enter your Roblox username or profile link to get started
            </p>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Username or roblox.com/users/..."
              value={state.robloxUsername}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-muted border-border focus:border-primary"
            />
            {state.error && (
              <p className="text-destructive text-sm">{state.error}</p>
            )}
            <Button onClick={proceedToEmoji} className="w-full" variant="glow">
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Emoji Verification */}
      {state.step === "emoji" && (
        <div className="glass rounded-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">Verify Your Identity</h2>
            <p className="text-muted-foreground text-sm">
              Copy the emojis below and paste them at the <strong className="text-foreground">beginning</strong> of your Roblox bio
            </p>
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-3">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Your Verification Code</p>
            <div className="text-2xl leading-relaxed break-all select-all tracking-wide">
              {state.emojiCode}
            </div>
            <div className="flex gap-2">
              <Button onClick={copyEmojis} variant="secondary" size="sm" className="flex-1">
                <Copy className="w-3 h-3 mr-1" />
                {copied ? "Copied!" : "Copy Emojis"}
              </Button>
              <Button onClick={regenerateEmojis} variant="ghost" size="sm">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Steps:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Copy the emojis above</li>
              <li>Go to your Roblox profile settings</li>
              <li>Paste them at the start of your bio</li>
              <li>Click "Verify" below</li>
            </ol>
          </div>

          <Button onClick={verify} className="w-full" variant="glow">
            Verify My Account
          </Button>
        </div>
      )}

      {/* Step 3: Checking */}
      {state.step === "checking" && (
        <div className="glass rounded-lg p-8 space-y-6 text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Verifying...</h2>
            <p className="text-muted-foreground text-sm">
              Checking your bio and gamepass ownership
            </p>
          </div>
          <div className="space-y-3">
            <VerifyStep label="Checking bio emojis..." status="loading" />
            <VerifyStep label="Checking gamepass ownership..." status="pending" />
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {state.step === "success" && (
        <div className="glass rounded-lg p-8 space-y-6 text-center border-success/30">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto glow-success">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Verification Complete!</h2>
            <p className="text-muted-foreground text-sm">
              Your account has been verified successfully
            </p>
          </div>
          <div className="space-y-2">
            <VerifyStep label="Bio emoji match" status="success" />
            <VerifyStep label="Gamepass ownership" status="success" />
          </div>
          <Button onClick={() => window.location.href = "/dashboard"} className="w-full" variant="glow">
            Go to Dashboard
          </Button>
        </div>
      )}

      {/* Step 5: Failed */}
      {state.step === "failed" && (
        <div className="glass rounded-lg p-8 space-y-6 text-center border-destructive/30">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Verification Failed</h2>
            <p className="text-destructive text-sm">{state.error}</p>
          </div>
          <div className="space-y-2">
            <VerifyStep label="Bio emoji match" status={state.bioMatch ? "success" : "failed"} />
            <VerifyStep label="Gamepass ownership" status={state.hasGamepass ? "success" : "failed"} />
          </div>
          <Button onClick={reset} className="w-full" variant="outline">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

function VerifyStep({ label, status }: { label: string; status: "pending" | "loading" | "success" | "failed" }) {
  return (
    <div className="flex items-center gap-3 bg-muted/50 rounded-md px-4 py-3">
      {status === "pending" && <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />}
      {status === "loading" && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
      {status === "success" && <CheckCircle2 className="w-5 h-5 text-success" />}
      {status === "failed" && <XCircle className="w-5 h-5 text-destructive" />}
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}
