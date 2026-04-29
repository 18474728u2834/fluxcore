import { useEffect, useState } from "react";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

async function resolveUserId(username: string): Promise<number | null> {
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
      if (id) return id;
    } catch {
      // try next host
    }
  }
  return null;
}

async function fetchHeadshot(id: number): Promise<string | null> {
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
      // try next host
    }
  }
  return null;
}

async function fetchAvatar(username: string): Promise<string | null> {
  const key = username.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    const id = await resolveUserId(username);
    if (!id) return null;

    const url = await fetchHeadshot(id);
    if (url) {
      cache.set(key, url);
      return url;
    }

    // Last-resort fallback: Roblox redirect endpoint that always returns an image
    const fallback = `https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=150&height=150&format=png`;
    cache.set(key, fallback);
    return fallback;
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
      onError={() => setSrc(null)}
      className={`${className ?? ""} object-cover animate-in fade-in zoom-in-95 duration-300`}
    />
  );
}
