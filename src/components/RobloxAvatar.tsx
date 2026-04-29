import { useEffect, useState } from "react";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

async function fetchAvatar(username: string): Promise<string | null> {
  const key = username.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    try {
      // 1. Resolve username -> userId
      const r = await fetch("https://users.roproxy.com/v1/usernames/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
      });
      const d = await r.json();
      const id = d?.data?.[0]?.id;
      if (!id) return null;

      // 2. Fetch headshot
      const t = await fetch(
        `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png`
      );
      const td = await t.json();
      const url: string | undefined = td?.data?.[0]?.imageUrl;
      if (url) {
        cache.set(key, url);
        return url;
      }
    } catch {
      // ignore
    }
    return null;
  })();

  inflight.set(key, p);
  const result = await p;
  inflight.delete(key);
  return result;
}

interface Props {
  username: string;
  className?: string;
}

export function RobloxAvatar({ username, className }: Props) {
  const [src, setSrc] = useState<string | null>(() => cache.get(username.toLowerCase()) || null);

  useEffect(() => {
    let alive = true;
    fetchAvatar(username).then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [username]);

  if (!src) {
    return (
      <div className={`${className ?? ""} bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground`}>
        {username.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={username}
      loading="lazy"
      className={`${className ?? ""} object-cover animate-in fade-in zoom-in-95 duration-300`}
    />
  );
}
