import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache: cacheKey -> resolved image URL (CDN or rolimons)
const urlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

// Deterministic colorful gradient background per username, used while loading
// or when every avatar source fails. Gives the "random red/yellow/blue" feel.
const PALETTES: Array<[string, string]> = [
  ["#ef4444", "#f97316"], // red -> orange
  ["#f59e0b", "#eab308"], // amber -> yellow
  ["#10b981", "#06b6d4"], // emerald -> cyan
  ["#3b82f6", "#6366f1"], // blue -> indigo
  ["#8b5cf6", "#ec4899"], // violet -> pink
  ["#14b8a6", "#22c55e"], // teal -> green
  ["#f43f5e", "#a855f7"], // rose -> purple
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
  if (inflight.has(cacheKey)) return inflight.get(cacheKey)!;

  const p = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("roblox-avatar", {
        method: "GET",
        // The supabase client encodes query string via headers; we use POST-like body with method GET
        // Workaround: build URL through fetch directly using the function URL.
      } as any);
      // Some supabase-js versions don't pass query for GET — fallback to direct fetch
      let url: string | null = null;
      if (data && (data as any).url) {
        url = (data as any).url;
      } else {
        const projectRef = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
        const base = projectRef
          ? `https://${projectRef}.supabase.co/functions/v1/roblox-avatar`
          : `/api/v1/roblox-avatar`;
        const r = await fetch(`${base}?${search.toString()}`, {
          headers: {
            apikey: (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
          },
        });
        if (r.ok) {
          const j = await r.json();
          url = j?.url ?? null;
        }
      }
      if (url) urlCache.set(cacheKey, url);
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

  const [src, setSrc] = useState<string | null>(() => urlCache.get(cacheKey) || null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let alive = true;
    if (urlCache.has(cacheKey)) {
      setSrc(urlCache.get(cacheKey)!);
      return;
    }
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
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={`${className ?? ""} object-cover animate-in fade-in zoom-in-95 duration-300`}
    />
  );
}
