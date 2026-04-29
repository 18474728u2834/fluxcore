import { useEffect, useState } from "react";

// In-memory cache of resolved CDN URLs (e.g. https://tr.rbxcdn.com/...)
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
      // Returns a real CDN url like https://tr.rbxcdn.com/.../AvatarHeadshot/Png/noFilter
      if (url) return url;
    } catch {
      // try next host
    }
  }
  return null;
}

async function resolveAvatar(username: string): Promise<string | null> {
  const key = username.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    const id = await resolveUserId(username);
    if (!id) return null;
    const url = await fetchHeadshotCdn(id);
    if (url) {
      cache.set(key, url);
      return url;
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
  const key = username.toLowerCase();
  // Always start with a working image src so the user sees an avatar immediately.
  // operatic.dev resolves username -> Roblox CDN headshot in a single redirect.
  const initial =
    cache.get(key) ||
    `https://avatar.operatic.dev/headshot/${encodeURIComponent(username)}?size=150`;

  const [src, setSrc] = useState<string>(initial);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let alive = true;
    // In the background, upgrade to the official tr.rbxcdn.com CDN URL.
    resolveAvatar(username).then((u) => {
      if (alive && u) setSrc(u);
    });
    return () => { alive = false; };
  }, [username]);

  if (errored) {
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
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={`${className ?? ""} object-cover animate-in fade-in zoom-in-95 duration-300`}
    />
  );
}
