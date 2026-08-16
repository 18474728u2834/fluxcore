// Cross-subdomain single sign-on helpers.
// A session created on fluxcore.works can be handed to <workspace>.fluxcore.works
// through a short-lived one-time token, so users never re-link Roblox/Discord.

export const SSO_ATTEMPT_KEY = "fluxcore_sso_attempted";

/** The canonical host that owns the primary session (apex domain). */
export function getMainOrigin(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (!host.endsWith("fluxcore.works")) return null;
  if (host === "fluxcore.works" || host === "www.fluxcore.works") return null;
  return "https://fluxcore.works";
}

/** True when the current host is a subdomain that can pull a session from the apex. */
export function canUseSso(): boolean {
  return getMainOrigin() !== null;
}

/** Send the browser to the apex to mint a handoff token and come back. */
export function startSso(opts: { silent?: boolean; next?: string } = {}) {
  const main = getMainOrigin();
  if (!main) return;
  const params = new URLSearchParams({
    return: window.location.origin,
    next: opts.next || window.location.hash.replace(/^#/, "") || "/",
  });
  if (opts.silent) params.set("silent", "1");
  window.location.href = `${main}/#/sso?${params.toString()}`;
}

/** Attempt a silent handoff at most once per browser tab. */
export function trySilentSso(next?: string): boolean {
  if (!canUseSso()) return false;
  try {
    if (sessionStorage.getItem(SSO_ATTEMPT_KEY)) return false;
    sessionStorage.setItem(SSO_ATTEMPT_KEY, "1");
  } catch {
    return false;
  }
  startSso({ silent: true, next });
  return true;
}
