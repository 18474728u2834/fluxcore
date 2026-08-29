import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Loader2 } from "lucide-react";

/**
 * Shown inside the workspace shell while `demo_mode` is active.
 * "Exit demo" restores the visitor's previous account session if they had
 * one, otherwise signs them out of the shared demo account.
 */
export function DemoBanner() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  let active = false;
  try { active = localStorage.getItem("demo_mode") === "1"; } catch { /* ignore */ }
  if (!active) return null;

  const exit = async () => {
    if (busy) return;
    setBusy(true);
    let restored = false;
    try {
      const raw = localStorage.getItem("demo_prev_session");
      if (raw) {
        const prev = JSON.parse(raw);
        if (prev?.access_token && prev?.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: prev.access_token,
            refresh_token: prev.refresh_token,
          });
          restored = !error;
        }
      }
    } catch { /* fall through to sign out */ }

    if (!restored) {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
    }
    try {
      localStorage.removeItem("demo_mode");
      localStorage.removeItem("demo_prev_session");
    } catch { /* ignore */ }
    navigate("/", { replace: true });
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 px-4 py-1.5 text-[12.5px] font-medium"
      style={{ background: "#2f74a8", color: "#fff" }}
    >
      <span className="truncate">You're exploring the live demo as FluxcoreDemo.</span>
      <button
        onClick={exit}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md bg-white/15 hover:bg-white/25 transition-colors px-2.5 py-1 text-[12px] font-semibold disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
        Exit demo
      </button>
    </div>
  );
}
