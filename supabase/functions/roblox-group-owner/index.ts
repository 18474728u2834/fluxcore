import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const groupId = url.searchParams.get('group_id')?.trim();
    if (!groupId || !/^\d+$/.test(groupId)) {
      return new Response(JSON.stringify({ error: 'invalid_group_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(`https://groups.roblox.com/v1/groups/${groupId}`);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'group_not_found', status: res.status }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await res.json();
    const ownerUserId = data?.owner?.userId ? String(data.owner.userId) : null;
    const ownerUsername = data?.owner?.username ?? null;
    const name = data?.name ?? null;

    return new Response(
      JSON.stringify({ group_id: groupId, name, owner_user_id: ownerUserId, owner_username: ownerUsername }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('roblox-group-owner error:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
