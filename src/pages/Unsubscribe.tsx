import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, MailX, CheckCircle2, AlertTriangle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: SUPABASE_ANON_KEY },
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j.valid) setState("valid");
        else if (j.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) setState("success");
      else if (j.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card/40 backdrop-blur p-8 text-center space-y-4">
        {state === "loading" && (
          <><Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" /><p className="text-sm text-muted-foreground">Checking your link…</p></>
        )}
        {state === "valid" && (
          <>
            <MailX className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Unsubscribe from Fluxcore emails?</h1>
            <p className="text-sm text-muted-foreground">You'll stop receiving non-essential emails from Fluxcore. Critical account & security notices may still be sent.</p>
            <Button onClick={confirm} disabled={busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm unsubscribe
            </Button>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-green-500" />
            <h1 className="text-xl font-semibold">You're unsubscribed</h1>
            <p className="text-sm text-muted-foreground">We won't email you again from this address.</p>
          </>
        )}
        {state === "already" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold">Already unsubscribed</h1>
            <p className="text-sm text-muted-foreground">This address has already been removed from our email list.</p>
          </>
        )}
        {state === "invalid" && (
          <>
            <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Invalid link</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
          </>
        )}
        {state === "error" && (
          <>
            <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">Please try again later.</p>
          </>
        )}
      </div>
    </div>
  );
}
