import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VERCEL_API = 'https://api.vercel.com';
const ROOT_DOMAIN = 'fluxcore.works';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const subdomainRaw = String(body.subdomain || '').toLowerCase().trim();
    const subdomain = subdomainRaw.replace(/[^a-z0-9-]/g, '');
    if (!subdomain || subdomain.length > 63) return json({ error: 'Invalid subdomain' }, 400);

    // Authorization: either Fluxcore staff, OR a workspace owner attaching
    // their own subdomain (must match a partner_portals row they own).
    const { data: isStaff } = await supabase.rpc('is_fluxcore_staff');
    if (!isStaff) {
      const { data: portal } = await supabase
        .from('partner_portals')
        .select('workspace_id, subdomain, workspaces!inner(owner_id)')
        .eq('subdomain', subdomain)
        .maybeSingle();
      const userId = (claims.claims as any).sub;
      const ownerId = (portal as any)?.workspaces?.owner_id;
      if (!portal || !ownerId || ownerId !== userId) {
        return json({ error: 'Forbidden — not the owner of this subdomain' }, 403);
      }
      // Owners can add/verify their own subdomain, but never remove.
      if (action === 'remove') {
        return json({ error: 'Forbidden — owners cannot remove subdomains' }, 403);
      }
    }

    const vercelToken = Deno.env.get('VERCEL_API_TOKEN');
    const projectId = Deno.env.get('VERCEL_PROJECT_ID');
    const teamId = Deno.env.get('VERCEL_TEAM_ID');
    if (!vercelToken || !projectId) return json({ error: 'Vercel not configured' }, 500);

    const fullDomain = `${subdomain}.${ROOT_DOMAIN}`;
    const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';

    if (action === 'add') {
      const res = await fetch(`${VERCEL_API}/v10/projects/${projectId}/domains${teamQuery}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: fullDomain }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Already attached is fine
        if (data?.error?.code === 'domain_already_in_use' || data?.error?.code === 'domain_already_exists') {
          return json({ ok: true, domain: fullDomain, alreadyExists: true });
        }
        return json({ error: data?.error?.message || 'Vercel error', code: data?.error?.code }, 400);
      }
      return json({ ok: true, domain: fullDomain, data });
    }

    if (action === 'remove') {
      const res = await fetch(
        `${VERCEL_API}/v9/projects/${projectId}/domains/${encodeURIComponent(fullDomain)}${teamQuery}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${vercelToken}` },
        }
      );
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        return json({ error: data?.error?.message || 'Vercel delete failed' }, 400);
      }
      return json({ ok: true, domain: fullDomain, removed: true });
    }

    if (action === 'verify') {
      const res = await fetch(
        `${VERCEL_API}/v9/projects/${projectId}/domains/${encodeURIComponent(fullDomain)}${teamQuery}`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      );
      const data = await res.json();
      if (!res.ok) return json({ error: data?.error?.message || 'Not found' }, 404);
      return json({ ok: true, domain: fullDomain, verified: data?.verified, data });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
