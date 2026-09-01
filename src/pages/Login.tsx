import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { Loader2, User, Copy, RefreshCw, ArrowRight, CheckCircle2, XCircle, Gamepad2, Shield, Sparkles, Lock } from "lucide-react";
import { RobloxLogo } from "@/components/RobloxLogo";
import { Wordmark } from "@/components/Wordmark";
import { redirectToMainLogin } from "@/lib/sso";


export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading, setSessionFromToken } = useAuth();
  const { state, setUsername, proceedToEmoji, regenerateEmojis, verify, reset } = useVerification();
  const [copied, setCopied] = useState(false);
  const [settingSession, setSettingSession] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"choose" | "emoji">("choose");

  // Persist any ?grant=TOKEN through the OAuth round-trip via localStorage
  useEffect(() => {
    try {
      const hash = window.location.hash || "";
      const qIdx = hash.indexOf("?");
      const qs = qIdx >= 0 ? hash.slice(qIdx + 1) : window.location.search.slice(1);
      const params = new URLSearchParams(qs);
      const grant = params.get("grant");
      if (grant) localStorage.setItem("fluxcore_pending_grant", grant);
      // Leaving the demo: real logins should get the normal owner flow again
      localStorage.removeItem("demo_mode");
    } catch {}
  }, []);

  useEffect(() => {
    if (!authLoading && user) navigate("/workspaces");
  }, [user, authLoading]);

  // Subdomains have no login page of their own — go straight to fluxcore.works.
  useEffect(() => {
    if (authLoading || user) return;
    redirectToMainLogin("/dashboard");
  }, [authLoading, user]);


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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${supabaseUrl}/functions/v1/roblox-oauth-callback?start=1&origin=${origin}`;
  };

  const handleDiscordOAuth = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${supabaseUrl}/functions/v1/discord-oauth-callback?start=1&origin=${origin}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="public-accent min-h-screen flex bg-[#08090c] text-foreground">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden border-r border-white/5">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 15% 0%, rgba(47,116,168,0.32) 0%, rgba(47,116,168,0.08) 38%, transparent 70%), linear-gradient(160deg, #0a0c10 0%, #08090c 55%, #06070a 100%)",
          }}
        />
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <div className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-[#2f74a8]/20 blur-[120px]" />
        <div className="relative z-10 flex flex-col justify-between p-14 w-full">
          <Wordmark />
          <div className="space-y-8 max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[#54a0d6]" />
              Nexus UI 3.0 — now in open beta
            </div>
            <h2 className="landing-head text-[2.75rem] font-bold leading-[1.05] tracking-tight">
              Run your group
              <br />
              like an operation,
              <br />
              <span className="bg-gradient-to-r from-[#54a0d6] to-[#2f74a8] bg-clip-text text-transparent">
                not a group chat.
              </span>
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Activity tracking, shift scheduling, role management, applications and analytics — one dashboard for your entire staff team.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, label: "Roblox OAuth" },
                { icon: Gamepad2, label: "Live group sync" },
                { icon: Lock, label: "Encrypted data" },
                { icon: Sparkles, label: "Free forever" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm text-muted-foreground"
                >
                  <Icon className="h-4 w-4 text-[#54a0d6]" />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            © 2026 Fluxcore. All rights reserved to RetailPro Technologies UIA.
          </p>
        </div>
      </div>

      {/* Right panel - Login */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-grid opacity-[0.04] lg:hidden" />
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#2f74a8]/15 blur-[110px] lg:hidden" />
        <div className="relative w-full max-w-[400px] rounded-2xl border border-white/[0.07] bg-white/[0.025] p-7 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
          {/* Mobile logo */}
          <div className="lg:hidden mb-7 flex justify-center">
            <Wordmark />
          </div>

          {/* Choose Method */}
          {loginMethod === "choose" && state.step === "input" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1.5">
                <h1 className="landing-head text-2xl font-bold tracking-tight">Welcome back</h1>
                <p className="text-sm text-muted-foreground">Sign in to continue to your workspace</p>
              </div>


              <div className="space-y-2.5">
                <Button
                  onClick={handleRobloxOAuth}
                  className="w-full h-12 text-[15px] font-semibold rounded-xl border-0 text-white bg-[#2f74a8] hover:bg-[#3a86bf] shadow-[0_10px_30px_-12px_rgba(47,116,168,0.9)] transition-colors"
                >
                  <RobloxLogo className="w-5 h-5 mr-2" />
                  Continue with Roblox
                </Button>


                <Button
                  onClick={handleDiscordOAuth}
                  className="w-full h-12 text-base bg-[#5865F2] hover:bg-[#4752C4] text-white border-0"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a.074.074 0 0 0-.079.037 13.83 13.83 0 0 0-.61 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 5.683 4.369a.07.07 0 0 0-.032.027C2.533 9.046 1.68 13.58 2.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.029.078.078 0 0 0 .084-.028 14.23 14.23 0 0 0 1.226-1.994.076.076 0 0 0-.042-.106 13.11 13.11 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.075.075 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.077.077 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.673-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.182 0-2.157-1.086-2.157-2.42 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.956 2.419-2.157 2.419zm7.974 0c-1.182 0-2.157-1.086-2.157-2.42 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.946 2.419-2.157 2.419z"/>
                  </svg>
                  Sign in with Discord
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button onClick={() => setLoginMethod("emoji")} variant="outline" className="w-full h-12 press-shrink">
                  <User className="w-4 h-4 mr-2" />
                  Bio Code Verification
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By signing in, you agree to our{" "}
                <button onClick={() => navigate("/terms")} className="text-primary hover:underline">Terms</button>{" "}
                and{" "}
                <button onClick={() => navigate("/privacy")} className="text-primary hover:underline">Privacy Policy</button>
              </p>
            </div>
          )}

          {/* Bio Code Login - Username */}
          {loginMethod === "emoji" && state.step === "input" && (
            <div className="space-y-6 animate-scale-in">
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-foreground">Bio Code Verification</h1>
                <p className="text-sm text-muted-foreground">Verify your Roblox account with a one-time bio code</p>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Roblox username"
                    value={state.robloxUsername}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 bg-muted border-border focus:border-primary"
                    onKeyDown={(e) => e.key === "Enter" && proceedToEmoji()}
                  />
                </div>
                {state.error && <p className="text-destructive text-sm">{state.error}</p>}
                <Button onClick={proceedToEmoji} variant="hero" className="w-full h-12 press-shrink">
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <button onClick={() => setLoginMethod("choose")} className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center">
                  ← Back to sign in options
                </button>
              </div>
            </div>
          )}

          {/* Code Step */}
          {state.step === "emoji" && (
            <div className="space-y-6 animate-scale-in">
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-foreground">Verify Identity</h1>
                <p className="text-sm text-muted-foreground">
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
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Copy the code above</li>
                <li>Open your Roblox profile settings</li>
                <li>Paste it at the start of your bio</li>
                <li>Click "Verify" below</li>
              </ol>
              <Button onClick={verify} className="w-full h-12 press-shrink" variant="hero">Verify & Sign In</Button>
            </div>
          )}

          {/* Checking */}
          {state.step === "checking" && (
            <div className="space-y-6 text-center animate-fade-in">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Verifying...</h2>
                <p className="text-muted-foreground text-sm">Checking your Roblox bio</p>
              </div>
            </div>
          )}

          {/* Success */}
          {state.step === "success" && (
            <div className="space-y-6 text-center animate-fade-in">
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

          {/* Failed */}
          {state.step === "failed" && (
            <div className="space-y-6 text-center animate-fade-in">
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

          <div className="text-center mt-8">
            <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
