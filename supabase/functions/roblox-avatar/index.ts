// Roblox avatar resolver — bypasses browser CORS by proxying through the edge.
// GET /roblox-avatar?username=Builderman    -> { url, userId }
// GET /roblox-avatar?userId=156             -> { url, userId }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function tryFetch(urls: string[], init?: RequestInit): Promise<any | null> {
  for (const u of urls) {
    try {
      const r = await fetch(u, init);
      if (!r.ok) continue;
      return await r.json();
    } catch {
      // try next
    }
  }
  return null;
}

async function resolveUserId(username: string): Promise<number | null> {
  const hosts = ["users.roblox.com", "users.roproxy.com"];
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
      if (id) return id as number;
    } catch {
      // try next
    }
  }
  return null;
}

async function fetchHeadshot(id: number): Promise<string | null> {
  const data = await tryFetch([
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=false`,
    `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=false`,
  ]);
  return data?.data?.[0]?.imageUrl ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const usernameParam = url.searchParams.get("username");
  const userIdParam = url.searchParams.get("userId");

  let id: number | null = userIdParam ? Number(userIdParam) : null;
  if (!id && usernameParam) {
    id = await resolveUserId(usernameParam);
  }
  if (!id) {
    return new Response(
      JSON.stringify({ error: "not_found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let headshot = await fetchHeadshot(id);
  if (!headshot) {
    // Final fallback: Rolimons player thumb
    headshot = `https://www.rolimons.com/playerassets/thumbs/${id}.png`;
  }

  return new Response(
    JSON.stringify({ userId: id, url: headshot }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // Cache aggressively at the edge / browser
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    }
  );
});
