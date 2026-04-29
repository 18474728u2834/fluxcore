import { Component, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface Props { children: ReactNode; fallback: ReactNode }
interface State { hasError: boolean; reloaded: boolean }

const RELOAD_FLAG = "fluxcore_chunk_reload_at";

function isChunkError(err: unknown): boolean {
  const msg = (err as Error)?.message || String(err);
  const name = (err as Error)?.name || "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

/**
 * Catches lazy/dynamic-import failures and auto-reloads the page once.
 * Common after deploys when old chunk hashes are no longer on the CDN.
 * Reload is rate-limited so we don't loop on a real outage.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, reloaded: false };

  static getDerivedStateFromError(error: unknown): State {
    if (isChunkError(error)) {
      return { hasError: true, reloaded: false };
    }
    // Non-chunk error: let it bubble to a higher boundary by re-throwing later
    throw error;
  }

  componentDidCatch(error: unknown) {
    if (!isChunkError(error)) return;
    try {
      const last = parseInt(sessionStorage.getItem(RELOAD_FLAG) || "0", 10);
      const now = Date.now();
      // Only auto-reload if we haven't reloaded in the last 10s (loop guard)
      if (now - last > 10_000) {
        sessionStorage.setItem(RELOAD_FLAG, String(now));
        // Bypass cache — try fresh assets
        window.location.reload();
        this.setState({ reloaded: true });
      }
    } catch {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      // While the reload happens, show a friendly loader
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-center px-6">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Refreshing to load the latest version…</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-primary hover:underline"
          >
            Tap here if this takes too long
          </button>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}
