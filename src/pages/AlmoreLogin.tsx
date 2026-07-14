import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { DiscordSignInButton } from "@/components/DiscordSignInButton";
import { RobloxLogo } from "@/components/RobloxLogo";
import {
  Loader2,
  User,
  Copy,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Leaf,
  Sparkles,
} from "lucide-react";


const ROBLOX_GROUP_ID = "16109128";
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;

export default function AlmoreLogin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, setSessionFromToken } = useAuth();
  const { state, setUsername, proceedToEmoji, regenerateEmojis, verify, reset } = useVerification();
  const [copied, setCopied] = useState(false);
  const [settingSession, setSettingSession] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"choose" | "emoji">("choose");
  const [groupIcon, setGroupIcon] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Sign In · Almore Shopping LTD";
    (async () => {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/functions/v1/roblox-group-icon?groupIds=${ROBLOX_GROUP_ID}`,
        );
        const j = await r.json();
        const img = j?.data?.[0]?.imageUrl;
        if (img) setGroupIcon(img);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!authLoading && user) navigate("/workspaces");
  }, [user, authLoading]);

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
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${SUPABASE_URL}/functions/v1/roblox-oauth-callback?start=1&origin=${origin}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07100c] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#07100c] text-white">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-[#07100c] to-[#07100c]" />
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <div className="absolute -top-32 -left-20 w-[500px] h-[500px] rounded-full bg-emerald-500/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-amber-400/10 blur-[120px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            {groupIcon ? (
              <img src={groupIcon} alt="" className="w-10 h-10 rounded-xl ring-1 ring-white/15" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 ring-1 ring-white/15" />
            )}
            <span className="text-lg font-bold tracking-wide">ALMORE</span>
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-[11px] uppercase tracking-[0.18em] text-emerald-300 font-medium">
              <Sparkles className="w-3 h-3" /> Staff Portal
            </div>
            <h2 className="text-5xl font-bold leading-[1.05]">
              Welcome back to{" "}
              <span className="bg-gradient-to-br from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">
                Almore.
              </span>
            </h2>
            <p className="text-white/60 text-base max-w-md leading-relaxed">
              Sign in to manage shifts, track your activity, and keep one of Roblox's biggest
              shopping communities running smooth.
            </p>
            <div className="flex items-center gap-6 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>68K+ members</span>
              </div>
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-400" />
                <span>Quality foods</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Almore Shopping LTD · Powered by Fluxcore
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-grid opacity-[0.04] lg:hidden" />
        <div className="relative w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8 space-y-3">
            {groupIcon && (
              <img
                src={groupIcon}
                alt=""
                className="w-16 h-16 mx-auto rounded-2xl ring-1 ring-white/10"
              />
            )}
            <span className="block text-xl font-bold tracking-wide">ALMORE</span>
          </div>

          {/* Choose method */}
          {loginMethod === "choose" && state.step === "input" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">Sign in</h1>
                <p className="text-sm text-white/50">
                  Use your Roblox account to enter the staff portal.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleRobloxOAuth}
                  className="w-full h-12 text-base bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold shadow-[0_10px_40px_-10px_rgba(16,185,129,0.6)]"
                >
                  <Gamepad2 className="w-5 h-5 mr-2" />
                  Sign in with Roblox
                </Button>
                <DiscordSignInButton />

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
                    <span className="bg-[#07100c] px-3 text-white/40">Or</span>
                  </div>
                </div>

                <Button
                  onClick={() => setLoginMethod("emoji")}
                  variant="outline"
                  className="w-full h-12 bg-transparent border-white/15 text-white hover:bg-white/5 hover:text-white"
                >
                  <User className="w-4 h-4 mr-2" />
                  Bio Code Verification
                </Button>
              </div>

              <p className="text-xs text-center text-white/40">
                By signing in, you agree to the{" "}
                <button
                  onClick={() => navigate("/terms")}
                  className="text-emerald-300 hover:underline"
                >
                  Terms
                </button>{" "}
                and{" "}
                <button
                  onClick={() => navigate("/privacy")}
                  className="text-emerald-300 hover:underline"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </div>
          )}

          {/* Bio code username */}
          {loginMethod === "emoji" && state.step === "input" && (
            <div className="space-y-6 animate-scale-in">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Bio Code Verification</h1>
                <p className="text-sm text-white/50">
                  Verify your Roblox account with a one-time bio code.
                </p>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Roblox username"
                    value={state.robloxUsername}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 bg-white/5 border-white/10 text-white focus:border-emerald-400 placeholder:text-white/30"
                    onKeyDown={(e) => e.key === "Enter" && proceedToEmoji()}
                  />
                </div>
                {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
                <Button
                  onClick={proceedToEmoji}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <button
                  onClick={() => setLoginMethod("choose")}
                  className="text-xs text-white/50 hover:text-white transition-colors w-full text-center"
                >
                  ← Back to sign in options
                </button>
              </div>
            </div>
          )}

          {/* Code */}
          {state.step === "emoji" && (
            <div className="space-y-6 animate-scale-in">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Verify Identity</h1>
                <p className="text-sm text-white/50">
                  Paste this code at the <strong className="text-white">start</strong> of your
                  Roblox bio.
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em]">
                  Verification Code
                </p>
                <div className="font-mono text-base sm:text-lg leading-relaxed break-all select-all tracking-tight bg-black/40 rounded-lg px-3 py-2.5 border border-white/10">
                  {state.emojiCode}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={copyEmojis}
                    size="sm"
                    className="flex-1 bg-white/10 hover:bg-white/15 text-white"
                  >
                    <Copy className="w-3 h-3 mr-1" /> {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    onClick={regenerateEmojis}
                    size="sm"
                    variant="ghost"
                    className="text-white/60 hover:text-white hover:bg-white/5"
                  >
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
              <Button
                onClick={verify}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold"
              >
                Verify & Sign In
              </Button>
            </div>
          )}

          {/* Checking */}
          {state.step === "checking" && (
            <div className="space-y-6 text-center animate-fade-in">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Verifying...</h2>
                <p className="text-white/50 text-sm">Checking your Roblox bio</p>
              </div>
            </div>
          )}

          {/* Success */}
          {state.step === "success" && (
            <div className="space-y-6 text-center animate-fade-in">
              {settingSession ? (
                <>
                  <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
                  <p className="font-semibold">Signing you in...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold">Verified!</h2>
                </>
              )}
            </div>
          )}

          {/* Failed */}
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
                onClick={() => {
                  reset();
                  setLoginMethod("choose");
                }}
                variant="outline"
                className="w-full bg-transparent border-white/15 text-white hover:bg-white/5 hover:text-white"
              >
                Try Again
              </Button>
            </div>
          )}

          <div className="text-center mt-8">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-white/40 hover:text-white transition-colors"
            >
              ← Back to Almore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
