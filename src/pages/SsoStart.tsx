import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Runs on fluxcore.works. If the visitor already has a session here, it mints a
 * one-time handoff token and bounces back to the requesting subdomain.
 * Otherwise it either sends them to login (and resumes afterwards) or, in
 * silent mode, returns quietly so the subdomain can show its own login.
 */
export default function SsoStart() {
  const [params] = useSearchParams();
  const { user, session, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  const returnOrigin = params.get("return") || "";
  const next = params.get("next") || "/";
  const silent = params.get("silent") === "1";

  useEffect(() => {
    if (loading || ran.current) return;

    const valid = (() => {
      try {
        const u = new URL(returnOrigin);
        return u.protocol === "https:" && (u.hostname === "fluxcore.works" || u.hostname.endsWith(".fluxcore.works"));
      } catch {
        return false;
      }
    })();

    if (!valid) {
      setError("Invalid return address.");
      return;
    }

    ran.current = true;

    if (!user || !session) {
      if (silent) {
        window.location.href = `${returnOrigin}/#${next}?sso=none`;
      } else {
        // Sign in here first, then resume the handoff.
        try {
          sessionStorage.setItem("fluxcore_sso_resume", JSON.stringify({ returnOrigin, next }));
        } catch {}
        window.location.hash = `#/login?sso=1`;
      }
      return;
    }

    (async () => {
      const { data, error: fnErr } = await supabase.functions.invoke("sso-handoff", {
        body: { action: "create", return_origin: returnOrigin },
      });
      if (fnErr || !data?.token) {
        console.error("[SSO] create failed", fnErr);
        window.location.href = `${returnOrigin}/#${next}?sso=error`;
        return;
      }
      window.location.href = `${returnOrigin}/#/sso/callback?token=${encodeURIComponent(data.token)}&next=${encodeURIComponent(next)}`;
    })();
  }, [loading, user, session]);

  // Resume a handoff that was interrupted by a login.
  useEffect(() => {
    if (loading || !user || returnOrigin) return;
    try {
      const raw = sessionStorage.getItem("fluxcore_sso_resume");
      if (!raw) return;
      sessionStorage.removeItem("fluxcore_sso_resume");
      const parsed = JSON.parse(raw);
      window.location.hash = `#/sso?return=${encodeURIComponent(parsed.returnOrigin)}&next=${encodeURIComponent(parsed.next || "/")}`;
    } catch {}
  }, [loading, user]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Continuing with your Fluxcore account…</p>
          </>
        )}
      </div>
    </div>
  );
}
