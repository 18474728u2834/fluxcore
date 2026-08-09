import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
};

async function j(url: string) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = req.headers.get("x-api-key") ||
      (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return json({ error: "Missing API key" }, 401);

    const { data: wsId } = await supabase.rpc("internal_workspace_id_by_api_key", { _api_key: apiKey });
    if (!wsId) return json({ error: "Invalid API key" }, 401);

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, game_url, roblox_group_id")
      .eq("id", wsId as string)
      .single();
    if (!workspace) return json({ error: "Invalid API key" }, 401);

    const games: { placeId: number; universeId: number | null; name: string; playing: number }[] = [];
    const seen = new Set<number>();
    const push = (placeId: number | null, universeId: number | null, name: string, playing: number) => {
      if (!placeId || seen.has(placeId)) return;
      seen.add(placeId);
      games.push({ placeId, universeId, name, playing });
    };

    const groupId = (workspace as any).roblox_group_id;

    // 1) All games owned by the Roblox group
    if (groupId) {
      for (const host of ["games.roblox.com", "games.roproxy.com"]) {
        const d = await j(`https://${host}/v2/groups/${groupId}/gamesV2?accessFilter=Public&limit=50&sortOrder=Asc`);
        if (d?.data) {
          for (const g of d.data) push(g.rootPlace?.id ?? null, g.id ?? null, g.name ?? "Game", g.playing ?? 0);
          break;
        }
      }

      // 2) Games owned by the group owner (personal games)
      let ownerId: number | null = null;
      for (const host of ["groups.roblox.com", "groups.roproxy.com"]) {
        const g = await j(`https://${host}/v1/groups/${groupId}`);
        if (g?.owner?.userId) { ownerId = g.owner.userId; break; }
      }
      if (ownerId) {
        for (const host of ["games.roblox.com", "games.roproxy.com"]) {
          const d = await j(`https://${host}/v2/users/${ownerId}/games?accessFilter=Public&limit=50&sortOrder=Asc`);
          if (d?.data) {
            for (const g of d.data) push(g.rootPlace?.id ?? null, g.id ?? null, g.name ?? "Game", g.placeVisits ? 0 : 0);
            break;
          }
        }
      }
    }

    // 3) Always include the workspace's linked game
    const link: string | null = (workspace as any).game_url ?? null;
    if (link) {
      const pid = Number(link.match(/games\/(\d+)/)?.[1] ?? 0);
      if (pid) push(pid, null, workspace.name ?? "Game", 0);
    }

    // Live player counts per universe
    const universeIds = games.map((g) => g.universeId).filter(Boolean);
    if (universeIds.length) {
      for (const host of ["games.roblox.com", "games.roproxy.com"]) {
        const d = await j(`https://${host}/v1/games?universeIds=${universeIds.join(",")}`);
        if (d?.data) {
          const byU = new Map(d.data.map((g: any) => [g.id, g]));
          for (const g of games) {
            const info: any = g.universeId ? byU.get(g.universeId) : null;
            if (info) { g.playing = info.playing ?? g.playing; g.name = info.name ?? g.name; }
          }
          break;
        }
      }
    }

    return json({ games }, 200);
  } catch (e) {
    console.error("public-games error", e);
    return json({ error: "internal_error" }, 500);
  }
});
