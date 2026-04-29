import { useEffect, useState } from "react";

// Cache: username/userId -> resolved CDN URL
const urlCache = new Map<string, string>();
const idCache = new Map<string, number>();
const inflightUrl = new Map<string, Promise<string | null>>();
const inflightId = new Map<string, Promise<number | null>>();

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

async function resolveUserId(username: string): Promise<number | null> {
  const key = username.toLowerCase();
  if (idCache.has(key)) return idCache.get(key)!;
  if (inflightId.has(key)) return inflightId.get(key)!;

  const p = (async () => {
    const hosts = ["users.roproxy.com", "users.roblox.com"];
    for (const host of hosts) {
      try {
        const r = await fetch(`https://${host}/v1/usernames/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
        });
        if (!r.ok) continue;
        const d = await r.json();
        const id = d?.data?.[0]?.id;
        if (id) {
          idCache.set(key, id);
          return id as number;
        }
      } catch {
        // try next
      }
    }
    return null;
  })();

  inflightId.set(key, p);
  const result = await p;
  inflightId.delete(key);
  return result;
}

async function fetchHeadshotCdn(id: number): Promise<string | null> {
  const hosts = ["thumbnails.roproxy.com", "thumbnails.roblox.com"];
  for (const host of hosts) {
    try {
      const t = await fetch(
        `https://${host}/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=false`
      );
      if (!t.ok) continue;
      const td = await t.json();
      const url: string | undefined = td?.data?.[0]?.imageUrl;
      if (url) return url;
    } catch {
      // try next
    }
  }
  return null;
}

async function resolveAvatarUrl(cacheKey: string, idPromise: Promise<number | null>): Promise<string | null> {
  if (urlCache.has(cacheKey)) return urlCache.get(cacheKey)!;
  if (inflightUrl.has(cacheKey)) return inflightUrl.get(cacheKey)!;

  const p = (async () => {
    const id = await idPromise;
    if (!id) return null;
    const url = await fetchHeadshotCdn(id);
    if (url) {
      urlCache.set(cacheKey, url);
      return url;
    }
    return null;
  })();

  inflightUrl.set(cacheKey, p);
  const result = await p;
  inflightUrl.delete(cacheKey);
  return result;
}

interface Props {
  username: string;
  userId?: string | number;
  className?: string;
}

export function RobloxAvatar({ username, userId, className }: Props) {
  const cacheKey = (userId ? `id:${userId}` : `name:${username.toLowerCase()}`);

  const [src, setSrc] = useState<string | null>(() => urlCache.get(cacheKey) || null);
  const [stage, setStage] = useState<"primary" | "rolimons" | "failed">("primary");

  useEffect(() => {
    let alive = true;

    const idPromise: Promise<number | null> = userId
      ? Promise.resolve(Number(userId))
      : resolveUserId(username);

    // Stage 1: try to get the official Roblox CDN URL.
    resolveAvatarUrl(cacheKey, idPromise).then(async (u) => {
      if (!alive) return;
      if (u) {
        setSrc(u);
        return;
      }
      // Primary failed before we even rendered an <img>. Jump to Rolimons.
      const id = await idPromise;
      if (!alive) return;
      if (id) {
        setStage("rolimons");
        setSrc(`https://www.rolimons.com/playerassets/thumbs/${id}.png`);
      }
    });

    return () => { alive = false; };
  }, [username, userId, cacheKey]);

  // When the primary image errors, fall back to Rolimons by user id.
  const handleError = async () => {
    if (stage === "primary") {
      const id = userId ? Number(userId) : await resolveUserId(username);
      if (id) {
        setStage("rolimons");
        setSrc(`https://www.rolimons.com/playerassets/thumbs/${id}.png`);
        return;
      }
      setStage("failed");
      setSrc(null);
    } else if (stage === "rolimons") {
      setStage("failed");
      setSrc(null);
    }
  };

  if (!src) {
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
      onError={handleError}
      className={`${className ?? ""} object-cover animate-in fade-in zoom-in-95 duration-300`}
    />
  );
}
