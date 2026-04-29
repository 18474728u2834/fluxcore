import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * After every route change, wait up to ~6s for the page to actually render
 * meaningful text content. If it never does (blank screen, stuck loader,
 * silent chunk hiccup), trigger a one-shot reload. Rate-limited via
 * sessionStorage so it can't loop.
 */
const RELOAD_FLAG = "fluxcore_watchdog_reload_at";
const COOLDOWN_MS = 15_000;
const TIMEOUT_MS = 6_000;
const POLL_MS = 400;
const MIN_TEXT_LEN = 40; // chars of visible text we expect from any real page

function visibleTextLength(): number {
  const main = document.querySelector("main, [data-app-root], #root");
  const root = (main as HTMLElement) || document.body;
  if (!root) return 0;
  // innerText respects visibility; trim whitespace
  const txt = (root.innerText || "").replace(/\s+/g, " ").trim();
  return txt.length;
}

function hasOnlySpinner(): boolean {
  // A page that's just a <Loader2 className="animate-spin" /> shouldn't count
  // as "loaded". If the only non-trivial element is a spinner, treat as empty.
  const spinners = document.querySelectorAll(".animate-spin").length;
  const len = visibleTextLength();
  return spinners > 0 && len < MIN_TEXT_LEN;
}

export function LoadWatchdog() {
  const location = useLocation();
  const tickRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    // Skip if we just reloaded — give the app room to actually mount
    const last = parseInt(sessionStorage.getItem(RELOAD_FLAG) || "0", 10);
    if (Date.now() - last < COOLDOWN_MS) return;

    startRef.current = Date.now();

    const check = () => {
      const elapsed = Date.now() - startRef.current;
      const len = visibleTextLength();
      const stuck = hasOnlySpinner();

      if (len >= MIN_TEXT_LEN && !stuck) {
        // Page loaded something real — done.
        return;
      }

      if (elapsed >= TIMEOUT_MS) {
        const lastReload = parseInt(sessionStorage.getItem(RELOAD_FLAG) || "0", 10);
        if (Date.now() - lastReload > COOLDOWN_MS) {
          sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
          // eslint-disable-next-line no-console
          console.warn("[LoadWatchdog] page never rendered text — reloading");
          window.location.reload();
        }
        return;
      }

      tickRef.current = window.setTimeout(check, POLL_MS);
    };

    tickRef.current = window.setTimeout(check, POLL_MS);
    return () => {
      if (tickRef.current) window.clearTimeout(tickRef.current);
    };
  }, [location.pathname]);

  return null;
}
