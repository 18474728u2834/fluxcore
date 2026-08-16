import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import {
  Loader2, User, Copy, RefreshCw, ArrowRight, CheckCircle2, XCircle,
  Sparkles, Users,
} from "lucide-react";
import { RobloxLogo } from "@/components/RobloxLogo";
import { DiscordSignInButton } from "@/components/DiscordSignInButton";
import { canUseSso, startSso, trySilentSso } from "@/lib/sso";
import type { PartnerConfig } from "./PartnerPortal";


const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;

function hexToRgb(hex: string) {
  const c = hex.replace("#", "");
  const n = c.length === 3 ? c.split("").map(x => x + x).join("") : c;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export default function PartnerLogin({ config }: { config: PartnerConfig }) {
  const navigate = useNavigate();
  const { user, loading: authLoading, setSessionFromToken } = useAuth();
  const { state, setUsername, proceedToEmoji, regenerateEmojis, verify, reset } = useVerification();
  const [copied, setCopied] = useState(false);
  const [settingSession, setSettingSession] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"choose" | "emoji">("choose");
  const accent = config.accent_color || "#38bdf8";
  const accentRgb = useMemo(() => hexToRgb(accent), [accent]);
  const bg = "#04101c";

  useEffect(() => {
    document.title = `Sign In · ${config.name}`;
  }, [config.name]);

  useEffect(() => {
    if (!authLoading && user) navigate(`/w/${config.workspace_id}/dashboard`);
  }, [user, authLoading]);

  useEffect(() => {
    if (state.step === "success" && state.tokenHash && state.email && !settingSession) {
      setSettingSession(true);
      setSessionFromToken(state.tokenHash, state.email).then(({ error }) => {
        if (!error) navigate(`/w/${config.workspace_id}/dashboard`);
        setSettingSession(false);
      });
    }
  }, [state.step, state.tokenHash, state.email]);

  useEffect(() => {
    if (authLoading || user) return;
    trySilentSso(`/w/${config.workspace_id}/dashboard`);
  }, [authLoading, user]);

  const handleRobloxOAuth = () => {
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${SUPABASE_URL}/functions/v1/roblox-oauth-callback?start=1&origin=${origin}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  const initial = (config.name || "?").trim()[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen flex text-white" style={{ background: bg }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, rgba(${accentRgb},0.22), ${bg} 60%, rgba(${accentRgb},0.10))` }}
        />
        <div className="absolute inset-0 bg-grid opacity-[0.05]" />
        <div
          className="absolute -top-32 -left-20 w-[500px] h-[500px] rounded-full blur-[140px] animate-pulse"
          style={{ background: `rgba(${accentRgb},0.25)`, animationDuration: "6s" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[450px] h-[450px] rounded-full blur-[130px] animate-pulse"
          style={{ background: `rgba(${accentRgb},0.15)`, animationDuration: "8s" }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3 animate-fade-in">
            {config.logo_url ? (
              <img src={config.logo_url} alt="" className="w-11 h-11 rounded-xl ring-1 ring-white/15" />
            ) : (
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center ring-1 ring-white/15 font-bold"
                style={{ background: accent, color: bg }}
              >
                {initial}
              </div>
            )}
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-wide uppercase">{config.name}</span>
              {config.tagline && (
                <span className="text-[10px] text-white/50 tracking-[0.25em] mt-0.5 uppercase">{config.tagline}</span>
              )}
            </div>
          </div>

          <div className="space-y-6 stagger-fade">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.18em] font-medium"
              style={{
                background: `rgba(${accentRgb},0.10)`,
                border: `1px solid rgba(${accentRgb},0.25)`,
                color: accent,
              }}
            >
              <Sparkles className="w-3 h-3" /> Staff Portal
            </div>
            <h2 className="text-5xl font-bold leading-[1.05]">
              Welcome back to{" "}
              <span className="bg-gradient-to-br from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                {config.name}.
              </span>
            </h2>
            <p className="text-white/65 text-base max-w-md leading-relaxed">
              Sign in to manage shifts, run trainings, track your activity, and keep your community running smooth.
            </p>
          </div>

          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} {config.name} · Powered by Fluxcore
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-grid opacity-[0.04] lg:hidden" />
        <div className="relative w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8 space-y-3 animate-fade-in">
            {config.logo_url ? (
              <img src={config.logo_url} alt="" className="w-16 h-16 mx-auto rounded-2xl ring-1 ring-white/10" />
            ) : (
              <div
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-2xl font-bold ring-1 ring-white/10"
                style={{ background: accent, color: bg }}
              >
                {initial}
              </div>
            )}
            <span className="block text-xl font-bold tracking-wide uppercase">{config.name}</span>
          </div>

          {loginMethod === "choose" && state.step === "input" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">Sign in</h1>
                <p className="text-sm text-white/55">
                  Use your Roblox account to enter the {config.name} staff portal.
                </p>
              </div>

              <div className="space-y-3">
                {canUseSso() && (
                  <Button
                    onClick={() => startSso({ next: `/w/${config.workspace_id}/dashboard` })}
                    variant="outline"
                    className="w-full h-12 bg-transparent border-white/15 text-white hover:bg-white/5 hover:text-white"
                  >
                    Continue with Fluxcore account
                  </Button>
                )}

                <Button
                  onClick={handleRobloxOAuth}
                  className="w-full h-12 text-base font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={{
                    background: accent,
                    color: bg,
                    boxShadow: `0 15px 50px -10px rgba(${accentRgb},0.7)`,
                  }}
                >
                  <RobloxLogo className="w-5 h-5 mr-2" /> Sign in with Roblox
                </Button>

                <DiscordSignInButton />

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
                    <span className="px-3 text-white/40" style={{ background: bg }}>Or</span>
                  </div>
                </div>

                <Button
                  onClick={() => setLoginMethod("emoji")}
                  variant="outline"
                  className="w-full h-12 bg-transparent border-white/15 text-white hover:bg-white/5 hover:text-white"
                >
                  <User className="w-4 h-4 mr-2" /> Bio Code Verification
                </Button>
              </div>

              <p className="text-xs text-center text-white/40">
                By signing in, you agree to the{" "}
                <button onClick={() => navigate("/terms")} className="hover:underline" style={{ color: accent }}>Terms</button>{" "}
                and{" "}
                <button onClick={() => navigate("/privacy")} className="hover:underline" style={{ color: accent }}>Privacy Policy</button>.
              </p>
            </div>
          )}

          {loginMethod === "emoji" && state.step === "input" && (
            <div className="space-y-6 animate-scale-in">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Bio Code Verification</h1>
                <p className="text-sm text-white/55">Verify your Roblox account with a one-time bio code.</p>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Roblox username"
                    value={state.robloxUsername}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    onKeyDown={(e) => e.key === "Enter" && proceedToEmoji()}
                  />
                </div>
                {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
                <Button onClick={proceedToEmoji} className="w-full h-12 font-semibold" style={{ background: accent, color: bg }}>
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <button onClick={() => setLoginMethod("choose")} className="text-xs text-white/50 hover:text-white w-full text-center">
                  ← Back to sign in options
                </button>
              </div>
            </div>
          )}

          {state.step === "emoji" && (
            <div className="space-y-6 animate-scale-in">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Verify Identity</h1>
                <p className="text-sm text-white/55">Paste this code at the <strong className="text-white">start</strong> of your Roblox bio.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em]">Verification Code</p>
                <div className="font-mono text-base sm:text-lg leading-relaxed break-all select-all tracking-tight bg-black/40 rounded-lg px-3 py-2.5 border border-white/10">
                  {state.emojiCode}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => { navigator.clipboard.writeText(state.emojiCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    size="sm"
                    className="flex-1 bg-white/10 hover:bg-white/15 text-white"
                  >
                    <Copy className="w-3 h-3 mr-1" /> {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button onClick={regenerateEmojis} size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ol className="text-sm text-white/55 space-y-1 list-decimal list-inside">
                <li>Copy the code above</li>
                <li>Open your Roblox profile settings</li>
                <li>Paste it at the start of your bio</li>
                <li>Click "Verify" below</li>
              </ol>
              <Button onClick={verify} className="w-full h-12 font-semibold" style={{ background: accent, color: bg }}>
                Verify & Sign In
              </Button>
            </div>
          )}

          {state.step === "checking" && (
            <div className="space-y-6 text-center animate-fade-in">
              <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: accent }} />
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Verifying...</h2>
                <p className="text-white/55 text-sm">Checking your Roblox bio</p>
              </div>
            </div>
          )}

          {state.step === "success" && (
            <div className="space-y-6 text-center animate-fade-in">
              {settingSession ? (
                <>
                  <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: accent }} />
                  <p className="font-semibold">Signing you in...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto animate-scale-in" style={{ background: `rgba(${accentRgb},0.12)` }}>
                    <CheckCircle2 className="w-8 h-8" style={{ color: accent }} />
                  </div>
                  <h2 className="text-xl font-bold">Verified!</h2>
                </>
              )}
            </div>
          )}

          {state.step === "failed" && (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Verification Failed</h2>
                <p className="text-red-400 text-sm">{state.error}</p>
              </div>
              <Button
                onClick={() => { reset(); setLoginMethod("choose"); }}
                variant="outline"
                className="w-full bg-transparent border-white/15 text-white hover:bg-white/5 hover:text-white"
              >
                Try Again
              </Button>
            </div>
          )}

          <div className="text-center mt-8">
            <button onClick={() => navigate("/")} className="text-sm text-white/40 hover:text-white transition-colors">
              ← Back to {config.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
