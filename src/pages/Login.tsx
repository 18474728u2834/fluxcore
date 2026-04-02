import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { Loader2, User, Copy, RefreshCw, ArrowRight, CheckCircle2, XCircle, Gamepad2 } from "lucide-react";

const ROBLOX_CLIENT_ID = "4787810466204050897";

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading, setSessionFromToken } = useAuth();
  const { state, setUsername, proceedToEmoji, regenerateEmojis, verify, reset } = useVerification();
  const [copied, setCopied] = useState(false);
  const [settingSession, setSettingSession] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"choose" | "emoji">("choose");

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/workspaces");
    }
  }, [user, authLoading]);

  // When verification succeeds, set the session
  useEffect(() => {
    if (state.step === "success" && state.tokenHash && state.email && !settingSession) {
      setSettingSession(true);
      setSessionFromToken(state.tokenHash, state.email).then(({ error }) => {
        if (error) console.error("Session error:", error);
        else navigate("/workspaces");
        setSettingSession(false);
      });
    }
  }, [state.step, state.tokenHash, state.email]);

  const copyEmojis = () => {
    navigator.clipboard.writeText(state.emojiCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRobloxOAuth = () => {
    // Encode origin in state so the edge function can redirect back
    const statePayload = btoa(JSON.stringify({
      nonce: crypto.randomUUID(),
      origin: window.location.origin + window.location.pathname.replace(/\/$/, ""),
    }));

    // Redirect URI is the edge function - it handles the code exchange server-side
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const redirectUri = `${supabaseUrl}/functions/v1/roblox-oauth-callback`;

    const params = new URLSearchParams({
      client_id: ROBLOX_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "openid profile",
      state: statePayload,
    });

    window.location.href = `https://apis.roblox.com/oauth/v1/authorize?${params}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid opacity-10" />

      <div className="relative w-full max-w-md mx-4">
        {/* Choose Method */}
        {loginMethod === "choose" && state.step === "input" && (
          <div className="glass rounded-2xl p-8 space-y-6 gradient-border animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-extrabold text-gradient">Welcome to Fluxcore</h1>
              <p className="text-sm text-muted-foreground">
                Sign in to manage your Roblox group
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleRobloxOAuth}
                variant="hero"
                className="w-full h-12 text-base"
              >
                <Gamepad2 className="w-5 h-5 mr-2" />
                Sign in with Roblox
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                onClick={() => setLoginMethod("emoji")}
                variant="outline"
                className="w-full h-12"
              >
                <User className="w-4 h-4 mr-2" />
                Emoji Verification Login
              </Button>
            </div>
          </div>
        )}

        {/* Emoji Login - Step 1: Username */}
        {loginMethod === "emoji" && state.step === "input" && (
          <div className="glass rounded-2xl p-8 space-y-6 gradient-border animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-extrabold text-gradient">Fluxcore</h1>
              <p className="text-sm text-muted-foreground">
                Verify your Roblox account via emoji bio
              </p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Roblox username"
                  value={state.robloxUsername}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-muted border-border focus:border-primary"
                  onKeyDown={(e) => e.key === "Enter" && proceedToEmoji()}
                />
              </div>
              {state.error && <p className="text-destructive text-sm">{state.error}</p>}
              <Button onClick={proceedToEmoji} variant="hero" className="w-full h-12">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <button
                onClick={() => setLoginMethod("choose")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
              >
                ← Back to sign in options
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Emoji */}
        {state.step === "emoji" && (
          <div className="glass rounded-2xl p-8 space-y-6 gradient-border animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-extrabold text-gradient">Fluxcore</h1>
              <p className="text-sm text-muted-foreground">
                Paste these emojis at the <strong className="text-foreground">start</strong> of your Roblox bio
              </p>
            </div>
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Verification Code</p>
              <div className="text-2xl leading-relaxed break-all select-all tracking-wide">{state.emojiCode}</div>
              <div className="flex gap-2">
                <Button onClick={copyEmojis} variant="secondary" size="sm" className="flex-1">
                  <Copy className="w-3 h-3 mr-1" /> {copied ? "Copied!" : "Copy"}
                </Button>
                <Button onClick={regenerateEmojis} variant="ghost" size="sm">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Copy the emojis above</li>
              <li>Go to your Roblox profile settings</li>
              <li>Paste them at the start of your bio</li>
              <li>Click "Verify" below</li>
            </ol>
            <Button onClick={verify} className="w-full h-12" variant="hero">Verify & Sign In</Button>
          </div>
        )}

        {/* Step 3: Checking */}
        {state.step === "checking" && (
          <div className="glass rounded-2xl p-8 space-y-6 text-center animate-fade-in">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Verifying...</h2>
              <p className="text-muted-foreground text-sm">Checking your Roblox bio</p>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {state.step === "success" && (
          <div className="glass rounded-2xl p-8 space-y-6 text-center animate-fade-in">
            {settingSession ? (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                <p className="text-foreground font-semibold">Signing you in...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Verified!</h2>
              </>
            )}
          </div>
        )}

        {/* Step 5: Failed */}
        {state.step === "failed" && (
          <div className="glass rounded-2xl p-8 space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Verification Failed</h2>
              <p className="text-destructive text-sm">{state.error}</p>
            </div>
            <Button onClick={() => { reset(); setLoginMethod("choose"); }} className="w-full" variant="outline">Try Again</Button>
          </div>
        )}

        <div className="text-center mt-6">
          <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
