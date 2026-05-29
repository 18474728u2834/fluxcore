import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Copy, RefreshCw, ArrowRight, CheckCircle2, XCircle, Gamepad2 } from "lucide-react";

const STORAGE_KEY = "fluxcore_pending_discord_link";

export default function LinkDiscord() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, setSessionFromToken } = useAuth();
  const { state, setUsername, proceedToEmoji, regenerateEmojis, verify, reset } = useVerification();
  const [copied, setCopied] = useState(false);
  const [settingSession, setSettingSession] = useState(false);
  const [method, setMethod] = useState<"choose" | "emoji">("choose");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [discordName, setDiscordName] = useState<string>("");
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Capture token from URL or restore from storage
  useEffect(() => {
    const urlToken = searchParams.get("link_token");
    const urlName = searchParams.get("discord_name");
    if (urlToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: urlToken, name: urlName || "" }));
      setLinkToken(urlToken);
      setDiscordName(urlName || "");
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setLinkToken(parsed.token);
          setDiscordName(parsed.name || "");
        }
      } catch {}
    }
  }, [searchParams]);

  // Emoji-flow session set
  useEffect(() => {
    if (state.step === "success" && state.tokenHash && state.email && !settingSession) {
      setSettingSession(true);
      setSessionFromToken(state.tokenHash, state.email).then(() => setSettingSession(false));
    }
  }, [state.step, state.tokenHash, state.email]);

  // Once authed, finalize the link
  useEffect(() => {
    if (authLoading || !user || !linkToken || finalizing || done) return;
    setFinalizing(true);
    (async () => {
      const { data, error } = await supabase.functions.invoke("discord-link-finalize", {
        body: { link_token: linkToken },
      });
      if (error || (data && (data as any).error)) {
        const code = (data as any)?.error || error?.message || "unknown";
        setFinalizeError(code);
        setFinalizing(false);
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
      setDone(true);
      setTimeout(() => navigate("/workspaces"), 1200);
    })();
  }, [authLoading, user, linkToken]);

  const handleRobloxOAuth = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${supabaseUrl}/functions/v1/roblox-oauth-callback?start=1&origin=${origin}`;
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>;
  }

  if (!linkToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-sm text-center space-y-3">
          <XCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-lg font-bold">Link request not found</h2>
          <p className="text-sm text-muted-foreground">Start over from the Discord sign-in button.</p>
          <Button onClick={() => navigate("/login")} variant="hero" className="w-full">Back to sign in</Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-sm text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <h2 className="text-lg font-bold">Discord linked!</h2>
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </div>
      </div>
    );
  }

  if (finalizing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Linking your Discord account…</p>
        </div>
      </div>
    );
  }

  if (finalizeError) {
    const messages: Record<string, string> = {
      discord_already_linked: "This Discord account is already linked to a different Fluxcore user.",
      user_has_other_discord: "Your Fluxcore account is already linked to a different Discord account.",
      expired: "This link request expired. Please start over.",
      invalid_token: "This link request is no longer valid.",
      not_verified: "Your Roblox verification did not save. Please try again.",
    };
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-sm text-center space-y-3">
          <XCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-lg font-bold">Couldn't link Discord</h2>
          <p className="text-sm text-muted-foreground">{messages[finalizeError] || finalizeError}</p>
          <Button onClick={() => { localStorage.removeItem(STORAGE_KEY); navigate("/login"); }} variant="hero" className="w-full">
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  // Not yet authed — show Roblox verification options
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-gradient">Link your Roblox account</h1>
          <p className="text-sm text-muted-foreground">
            Welcome{discordName ? `, ${discordName}` : ""}! To finish setting up Discord login, verify your Roblox account once.
          </p>
        </div>

        {method === "choose" && state.step === "input" && (
          <div className="space-y-3 animate-fade-in">
            <Button onClick={handleRobloxOAuth} variant="hero" className="w-full h-12 text-base">
              <Gamepad2 className="w-5 h-5 mr-2" /> Verify with Roblox
            </Button>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button onClick={() => setMethod("emoji")} variant="outline" className="w-full h-12">
              <User className="w-4 h-4 mr-2" /> Bio Code Verification
            </Button>
          </div>
        )}

        {method === "emoji" && state.step === "input" && (
          <div className="space-y-4 animate-scale-in">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Roblox username"
                value={state.robloxUsername}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12 bg-muted border-border"
                onKeyDown={(e) => e.key === "Enter" && proceedToEmoji()}
              />
            </div>
            {state.error && <p className="text-destructive text-sm">{state.error}</p>}
            <Button onClick={proceedToEmoji} variant="hero" className="w-full h-12">
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <button onClick={() => setMethod("choose")} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
              ← Back
            </button>
          </div>
        )}

        {state.step === "emoji" && (
          <div className="space-y-4 animate-scale-in">
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Verification Code</p>
              <div className="font-mono text-base break-all select-all bg-background/40 rounded-lg px-3 py-2.5 border border-border/40">
                {state.emojiCode}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { navigator.clipboard.writeText(state.emojiCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} size="sm" variant="secondary" className="flex-1">
                  <Copy className="w-3 h-3 mr-1" /> {copied ? "Copied!" : "Copy"}
                </Button>
                <Button onClick={regenerateEmojis} size="sm" variant="ghost">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Paste this at the start of your Roblox bio, then click verify.</p>
            <Button onClick={verify} variant="hero" className="w-full h-12">Verify & Link</Button>
          </div>
        )}

        {state.step === "checking" && (
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Checking your Roblox bio…</p>
          </div>
        )}

        {state.step === "failed" && (
          <div className="text-center space-y-3">
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-destructive text-sm">{state.error}</p>
            <Button onClick={() => { reset(); setMethod("choose"); }} variant="outline">Try Again</Button>
          </div>
        )}
      </div>
    </div>
  );
}
