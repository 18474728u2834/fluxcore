import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { Loader2, User, Copy, RefreshCw, ArrowRight, CheckCircle2, XCircle, Gamepad2 } from "lucide-react";
import type { PartnerConfig } from "./PartnerPortal";

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;

export default function PartnerLogin({ config }: { config: PartnerConfig }) {
  const navigate = useNavigate();
  const { user, loading: authLoading, setSessionFromToken } = useAuth();
  const { state, setUsername, proceedToEmoji, regenerateEmojis, verify, reset } = useVerification();
  const [copied, setCopied] = useState(false);
  const [settingSession, setSettingSession] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"choose" | "emoji">("choose");
  const accent = config.accent_color || "#10b981";

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

  const handleRobloxOAuth = () => {
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${SUPABASE_URL}/functions/v1/roblox-oauth-callback?start=1&origin=${origin}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#04101c] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04101c] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          {config.logo_url ? (
            <img src={config.logo_url} alt={config.name} className="w-16 h-16 rounded-2xl mx-auto ring-1 ring-white/10" />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold"
              style={{ background: accent, color: "#04101c" }}
            >
              {config.name[0]}
            </div>
          )}
          <h1 className="text-xl font-bold">{config.name}</h1>
        </div>

        {loginMethod === "choose" && state.step === "input" && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-bold">Sign in</h2>
              <p className="text-sm text-white/55">Use your Roblox account to enter the staff portal.</p>
            </div>
            <Button
              onClick={handleRobloxOAuth}
              className="w-full h-12 font-semibold hover:scale-[1.02] transition-transform"
              style={{ background: accent, color: "#04101c" }}
            >
              <Gamepad2 className="w-5 h-5 mr-2" /> Sign in with Roblox
            </Button>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
                <span className="bg-[#04101c] px-3 text-white/40">Or</span>
              </div>
            </div>
            <Button
              onClick={() => setLoginMethod("emoji")}
              variant="outline"
              className="w-full h-12 bg-transparent border-white/15 text-white hover:bg-white/5 hover:text-white"
            >
              <User className="w-4 h-4 mr-2" /> Bio Code Verification
            </Button>
            <p className="text-xs text-center text-white/40">
              By signing in, you agree to the{" "}
              <button onClick={() => navigate("/terms")} className="hover:underline" style={{ color: accent }}>Terms</button>{" "}
              and{" "}
              <button onClick={() => navigate("/privacy")} className="hover:underline" style={{ color: accent }}>Privacy Policy</button>.
            </p>
          </div>
        )}

        {loginMethod === "emoji" && state.step === "input" && (
          <div className="space-y-4 animate-scale-in">
            <h2 className="text-xl font-bold text-center">Bio Code Verification</h2>
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
            <Button onClick={proceedToEmoji} className="w-full h-12 font-semibold" style={{ background: accent, color: "#04101c" }}>
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <button onClick={() => setLoginMethod("choose")} className="text-xs text-white/50 hover:text-white w-full text-center">
              ← Back
            </button>
          </div>
        )}

        {state.step === "emoji" && (
          <div className="space-y-4 animate-scale-in">
            <h2 className="text-xl font-bold text-center">Verify Identity</h2>
            <p className="text-sm text-white/55 text-center">Paste this code at the start of your Roblox bio.</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="font-mono text-base break-all select-all bg-black/40 rounded-lg px-3 py-2.5 border border-white/10">
                {state.emojiCode}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { navigator.clipboard.writeText(state.emojiCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} size="sm" className="flex-1 bg-white/10 hover:bg-white/15 text-white">
                  <Copy className="w-3 h-3 mr-1" /> {copied ? "Copied!" : "Copy"}
                </Button>
                <Button onClick={regenerateEmojis} size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Button onClick={verify} className="w-full h-12 font-semibold" style={{ background: accent, color: "#04101c" }}>
              Verify & Sign In
            </Button>
          </div>
        )}

        {state.step === "checking" && (
          <div className="text-center space-y-3">
            <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: accent }} />
            <p className="text-white/55 text-sm">Checking your Roblox bio...</p>
          </div>
        )}

        {state.step === "success" && settingSession && (
          <div className="text-center space-y-3">
            <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: accent }} />
            <p>Signing you in...</p>
          </div>
        )}

        {state.step === "failed" && (
          <div className="text-center space-y-3">
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-red-400 text-sm">{state.error}</p>
            <Button onClick={() => { reset(); setLoginMethod("choose"); }} variant="outline" className="bg-transparent border-white/15 text-white hover:bg-white/5">
              Try Again
            </Button>
          </div>
        )}

        <button onClick={() => navigate("/")} className="block mx-auto text-xs text-white/40 hover:text-white">
          ← Back to {config.name}
        </button>
      </div>
    </div>
  );
}
