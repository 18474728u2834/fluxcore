import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// In-memory + localStorage cache: cacheKey -> resolved image URL (CDN or rolimons)
const urlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

const LS_PREFIX = "rbx_av_v1:";

function lsGet(key: string): string | null {
  try { return localStorage.getItem(LS_PREFIX + key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(LS_PREFIX + key, value); } catch { /* ignore */ }
}

// Direct Roblox redirect endpoint -> 302s straight to the CDN image.
// Browser treats it as an image so it bypasses the JSON edge-call entirely.
function directHeadshotUrl(userId: string | number): string {
  return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;
}

// Deterministic colorful gradient background per username
const PALETTES: Array<[string, string]> = [
  ["#ef4444", "#f97316"],
  ["#f59e0b", "#eab308"],
  ["#10b981", "#06b6d4"],
  ["#3b82f6", "#6366f1"],
  ["#8b5cf6", "#ec4899"],
  ["#14b8a6", "#22c55e"],
  ["#f43f5e", "#a855f7"],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarGradient(seed: string): string {
  const [a, b] = PALETTES[hashString(seed) % PALETTES.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

async function resolveViaEdge(params: { username?: string; userId?: string | number }): Promise<string | null> {
  const search = new URLSearchParams();
  if (params.userId) search.set("userId", String(params.userId));
  else if (params.username) search.set("username", params.username);
  else return null;

  const cacheKey = params.userId ? `id:${params.userId}` : `name:${(params.username || "").toLowerCase()}`;
  if (urlCache.has(cacheKey)) return urlCache.get(cacheKey)!;
  const cached = lsGet(cacheKey);
  if (cached) { urlCache.set(cacheKey, cached); return cached; }
  if (inflight.has(cacheKey)) return inflight.get(cacheKey)!;

  const p = (async () => {
    try {
      const projectRef = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
      const base = projectRef
        ? `https://${projectRef}.supabase.co/functions/v1/roblox-avatar`
        : `/api/v1/roblox-avatar`;
      const r = await fetch(`${base}?${search.toString()}`, {
        headers: { apikey: (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? "" },
      });
      if (!r.ok) return null;
      const j = await r.json();
      const url: string | null = j?.url ?? null;
      if (url) {
        urlCache.set(cacheKey, url);
        lsSet(cacheKey, url);
      }
      return url;
    } catch {
      return null;
    }
  })();

  inflight.set(cacheKey, p);
  const result = await p;
  inflight.delete(cacheKey);
  return result;
}

interface Props {
  username: string;
  userId?: string | number;
  className?: string;
}

export function RobloxAvatar({ username, userId, className }: Props) {
  const cacheKey = userId ? `id:${userId}` : `name:${username.toLowerCase()}`;

  // Compute initial src synchronously so first paint shows the image.
  const initialSrc = (() => {
    if (urlCache.has(cacheKey)) return urlCache.get(cacheKey)!;
    const ls = lsGet(cacheKey);
    if (ls) { urlCache.set(cacheKey, ls); return ls; }
    if (userId) return directHeadshotUrl(userId); // instant, no roundtrip
    return null;
  })();

  const [src, setSrc] = useState<string | null>(initialSrc);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let alive = true;
    if (urlCache.has(cacheKey)) { setSrc(urlCache.get(cacheKey)!); return; }
    const ls = lsGet(cacheKey);
    if (ls) { urlCache.set(cacheKey, ls); setSrc(ls); return; }
    // For username-only, resolve via edge to get a userId/CDN url.
    // For userId we already render the direct URL, but still resolve in
    // background to upgrade to a stable CDN URL we can cache.
    resolveViaEdge({ username, userId }).then((u) => {
      if (alive && u) setSrc(u);
    });
    return () => { alive = false; };
  }, [cacheKey, username, userId]);

  if (!src || errored) {
    return (
      <div
        className={`${className ?? ""} flex items-center justify-center text-[10px] font-bold text-white`}
        style={{ background: avatarGradient(username) }}
      >
        {username.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={username}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={`${className ?? ""} object-cover`}
    />
  );
}
