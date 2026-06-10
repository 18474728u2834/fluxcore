import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * After every route change, wait briefly for the page to render meaningful
 * text content. This used to force a page reload when content was slow, but
 * that made Nexus feel glitchy on heavier workspace pages. Chunk failures are
 * still handled by ChunkErrorBoundary/App-level handlers.
 */
const TIMEOUT_MS = 12_000;
const POLL_MS = 400;
const MIN_TEXT_LEN = 8; // enough to distinguish a rendered page from a blank root

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
        // eslint-disable-next-line no-console
        console.warn("[LoadWatchdog] page is still waiting for content");
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
