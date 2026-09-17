/**
 * Tracks whether the Fluxcore backend is reachable.
 *
 * Patches window.fetch once and watches requests going to the backend host.
 * Network-level failures (and 5xx / 522-style gateway answers) flip the state
 * to "down"; once down we probe the backend health endpoint on a short loop
 * with backoff until it answers again, then flip back to "up".
 *
 * Nothing here retries the app's own queries — TanStack Query and the page
 * code handle that; this module just provides one shared truth for the UI.
 */

export type BackendState = "up" | "down";

const BACKEND_URL: string = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const ANON_KEY: string = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || "";

let state: BackendState = "up";
let downSince = 0;
let probing = false;
let consecutiveFailures = 0;
let installed = false;

const listeners = new Set<(s: BackendState, downSince: number) => void>();

function emit() {
  for (const fn of listeners) {
    try {
      fn(state, downSince);
    } catch {
      /* listener errors must never break the app */
    }
  }
}

export function getBackendState(): BackendState {
  return state;
}

export function onBackendStateChange(fn: (s: BackendState, downSince: number) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function markDown() {
  consecutiveFailures += 1;
  // Two strikes: a single aborted request (navigating away, sleep/wake) is
  // not an outage.
  if (consecutiveFailures < 2 || state === "down") return;
  state = "down";
  downSince = Date.now();
  emit();
  startProbing();
}

function markUp() {
  consecutiveFailures = 0;
  if (state === "up") return;
  state = "up";
  downSince = 0;
  emit();
}

async function probeOnce(signal?: AbortSignal): Promise<boolean> {
  if (!BACKEND_URL) return true;
  try {
    const res = await originalFetch(`${BACKEND_URL}/auth/v1/health`, {
      method: "GET",
      headers: ANON_KEY ? { apikey: ANON_KEY } : undefined,
      cache: "no-store",
      signal,
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

/** Probe with backoff: 3s, 5s, 8s, 12s, then every 15s. */
const BACKOFF = [3000, 5000, 8000, 12000, 15000];

async function startProbing() {
  if (probing) return;
  probing = true;
  let attempt = 0;
  while (state === "down") {
    const wait = BACKOFF[Math.min(attempt, BACKOFF.length - 1)];
    await new Promise((r) => setTimeout(r, wait));
    attempt += 1;
    if (typeof document !== "undefined" && document.hidden) continue;
    const ok = await probeOnce();
    if (ok) {
      markUp();
      break;
    }
  }
  probing = false;
}

/** Force an immediate check (used by the "Try again" button). */
export async function retryBackendNow(): Promise<boolean> {
  const ok = await probeOnce();
  if (ok) markUp();
  return ok;
}

const originalFetch: typeof fetch =
  typeof window !== "undefined" ? window.fetch.bind(window) : (undefined as any);

export function installBackendHealthMonitor() {
  if (installed || typeof window === "undefined" || !BACKEND_URL) return;
  installed = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const isBackend = typeof url === "string" && url.startsWith(BACKEND_URL);

    if (!isBackend) return originalFetch(input as any, init);

    try {
      const res = await originalFetch(input as any, init);
      // 5xx from the gateway means the backend is not answering properly.
      if (res.status >= 500) markDown();
      else markUp();
      return res;
    } catch (err) {
      if ((err as any)?.name !== "AbortError") markDown();
      throw err;
    }
  };

  window.addEventListener("online", () => {
    if (state === "down") void retryBackendNow();
  });
}
