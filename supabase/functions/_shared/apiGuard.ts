// Shared hardening for public (verify_jwt = false) edge functions.
// Blocks oversized payloads, unexpected methods and abusive request rates
// before any database work happens.

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return (fwd.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim();
}

/** Sliding-window rate limit. Returns true when the caller is over budget. */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    }
    return false;
  }
  b.count += 1;
  return b.count > limit;
}

export interface GuardOptions {
  name: string;
  /** Allowed HTTP methods (OPTIONS is always allowed by the caller). */
  methods?: string[];
  /** Max requests per window per caller. */
  limit?: number;
  windowMs?: number;
  /** Max accepted request body size in bytes. */
  maxBodyBytes?: number;
  cors: Record<string, string>;
}

/**
 * Runs the standard checks. Returns a Response to send back when the request
 * must be rejected, or null when it is allowed to continue.
 */
export function guard(req: Request, opts: GuardOptions): Response | null {
  const cors = opts.cors;
  const reply = (status: number, error: string, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify({ error }), {
      status,
      headers: { ...cors, ...extra, "Content-Type": "application/json" },
    });

  const methods = opts.methods ?? ["GET", "POST"];
  if (!methods.includes(req.method)) return reply(405, "Method not allowed");

  const maxBody = opts.maxBodyBytes ?? 32 * 1024;
  const len = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(len) && len > maxBody) return reply(413, "Payload too large");

  const url = new URL(req.url);
  if (url.search.length > 2048) return reply(414, "Query string too long");

  const apiKey = req.headers.get("x-api-key") || "";
  const caller = apiKey ? `k:${apiKey.slice(0, 24)}` : `i:${clientIp(req)}`;
  const limit = opts.limit ?? 120;
  const windowMs = opts.windowMs ?? 60_000;
  if (isRateLimited(`${opts.name}:${caller}`, limit, windowMs)) {
    return reply(429, "Too many requests", { "Retry-After": String(Math.ceil(windowMs / 1000)) });
  }

  return null;
}

/** Reads a JSON body safely: enforces size and rejects malformed input. */
export async function readJson<T = Record<string, unknown>>(
  req: Request,
  maxBodyBytes = 32 * 1024,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, error: "Unreadable body" };
  }
  if (raw.length > maxBodyBytes) return { ok: false, error: "Payload too large" };
  if (!raw.trim()) return { ok: true, data: {} as T };
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Body must be a JSON object" };
    }
    return { ok: true, data: parsed as T };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

/** Trimmed, length-capped string or null. */
export function str(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > max) return null;
  return s;
}

/** Bounded integer or null. */
export function int(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) return null;
  return n;
}
