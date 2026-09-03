// Remembers where the user was heading before they had to sign in
// (e.g. an invite link), so the OAuth round-trip can return them there.

const KEY = "fluxcore_post_login_redirect";

/** Only allow in-app paths — never an absolute URL from a query string. */
function isSafePath(path: string | null | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//");
}

export function setPostLoginRedirect(path: string | null | undefined) {
  if (!isSafePath(path)) return;
  try {
    localStorage.setItem(KEY, path);
  } catch {}
}

/** Reads and clears the stored destination. */
export function takePostLoginRedirect(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    return isSafePath(v) ? v : null;
  } catch {
    return null;
  }
}

export function peekPostLoginRedirect(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return isSafePath(v) ? v : null;
  } catch {
    return null;
  }
}

/** Pulls ?redirect=... out of the current hash/search (HashRouter safe). */
export function readRedirectParam(): string | null {
  try {
    const hash = window.location.hash || "";
    const qIdx = hash.indexOf("?");
    const qs = qIdx >= 0 ? hash.slice(qIdx + 1) : window.location.search.slice(1);
    return new URLSearchParams(qs).get("redirect");
  } catch {
    return null;
  }
}
