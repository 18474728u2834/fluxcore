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

/** True when the current host is a workspace subdomain locked to one workspace. */
export function isPortalHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (!host.endsWith("fluxcore.works")) return false;
  return host !== "fluxcore.works" && host !== "www.fluxcore.works" && host !== "status.fluxcore.works";
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

/**
 * On a workspace subdomain there is no local login page — send the browser to
 * the single login at fluxcore.works right away. Returns true when redirecting.
 * If the apex already bounced us back (sso=none / sso=error) we stay put so the
 * local fallback UI can render instead of looping.
 */
export function redirectToMainLogin(next?: string): boolean {
  if (!canUseSso()) return false;
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const search = typeof window !== "undefined" ? window.location.search : "";
  if (/[?&]sso=(none|error)/.test(hash) || /[?&]sso=(none|error)/.test(search)) return false;
  startSso({ next });
  return true;
}

