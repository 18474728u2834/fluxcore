import { useEffect, useState } from "react";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";
import {
  getBackendState,
  installBackendHealthMonitor,
  onBackendStateChange,
  retryBackendNow,
  type BackendState,
} from "@/lib/backendHealth";

/**
 * Slim bar pinned to the bottom of the screen while the backend is
 * unreachable. It keeps retrying by itself and disappears the moment the
 * connection is back, so pages never just hang silently.
 */
export function BackendStatusBanner() {
  const [state, setState] = useState<BackendState>(getBackendState());
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    installBackendHealthMonitor();
    return onBackendStateChange((s) => setState(s));
  }, []);

  if (state === "up") return null;

  const onRetry = async () => {
    setRetrying(true);
    const ok = await retryBackendNow();
    setRetrying(false);
    if (ok) window.location.reload();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
        <WifiOff className="h-4 w-4 text-destructive shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Reconnecting to Fluxcore</p>
          <p className="text-muted-foreground text-xs">
            The connection dropped. We keep trying automatically — your work is safe.
          </p>
        </div>
        <button
          onClick={onRetry}
          disabled={retrying}
          className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
        >
          {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Try again
        </button>
      </div>
    </div>
  );
}
