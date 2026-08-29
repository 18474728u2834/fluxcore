import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * /demo — signs the visitor into a real, seeded demo workspace and drops them
 * into the actual Nexus workspace UI (no mockups, no replicas).
 */
export default function Demo() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("demo-session", { body: {} });
        if (error || !data?.access_token || !data?.workspace_id) {
          throw new Error(error?.message ?? data?.error ?? "Could not start the demo");
        }

        const { error: sessErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessErr) throw sessErr;

        try {
          localStorage.setItem("ui_version", "nexus");
          // Always start the demo with the sidebar collapsed (state persists via cookie otherwise)
          document.cookie = "sidebar:state=false; path=/; max-age=604800";
        } catch { /* ignore */ }

        navigate(`/w/${data.workspace_id}/dashboard`, { replace: true });
      } catch (e: any) {
        setError(e?.message ?? "Could not start the demo");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0d10] text-white px-6">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Demo unavailable</h1>
            <p className="text-sm text-white/60 max-w-md">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 rounded-md px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: "#2f74a8" }}
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-white/70" />
            <h1 className="text-lg font-semibold">Opening the live demo workspace…</h1>
            <p className="text-sm text-white/50">Signing you into a real Fluxcore workspace with sample staff.</p>
          </>
        )}
      </div>
    </div>
  );
}
