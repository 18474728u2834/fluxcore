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
    const token = authHeader.replace('Bearer ', '');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const isServiceCall = token === serviceKey;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    // Diagnostics — service-role only. Never returns secret values.
    if (action === 'diag') {
      if (!isServiceCall) return json({ error: 'Forbidden' }, 403);


      const vt = Deno.env.get('VERCEL_API_TOKEN');
      const pid = Deno.env.get('VERCEL_PROJECT_ID');
      const tid = Deno.env.get('VERCEL_TEAM_ID');
      const q = tid ? `?teamId=${encodeURIComponent(tid)}` : '';
      const r = await fetch(`${VERCEL_API}/v9/projects/${pid}${q}`, {
        headers: { Authorization: `Bearer ${vt}` },
      });
      const d = await r.json().catch(() => ({}));
      // List domains already attached to the project + their DNS config state
      const dl = await fetch(`${VERCEL_API}/v9/projects/${pid}/domains${q}&limit=100`.replace('?&', '?'), {
        headers: { Authorization: `Bearer ${vt}` },
      });
      const dld = await dl.json().catch(() => ({}));
      const domains = (dld?.domains || []).map((x: any) => ({
        name: x.name, verified: x.verified,
      }));
      // Check wildcard/DNS health for one sample subdomain
      const sample = String(body.subdomain || 'diagtest').toLowerCase().replace(/[^a-z0-9-]/g, '');
      const cfg = await fetch(
        `${VERCEL_API}/v6/domains/${encodeURIComponent(`${sample}.${ROOT_DOMAIN}`)}/config${q}`,
        { headers: { Authorization: `Bearer ${vt}` } },
      );
      const cfgd = await cfg.json().catch(() => ({}));
      return json({
        hasToken: !!vt, hasProject: !!pid, hasTeam: !!tid,
        projectLookupStatus: r.status,
        projectName: d?.name ?? null,
        errorCode: d?.error?.code ?? null,
        errorMessage: d?.error?.message ?? null,
        domainCount: domains.length,
        domains,
        sampleDomain: `${sample}.${ROOT_DOMAIN}`,
        sampleConfig: { misconfigured: cfgd?.misconfigured, cnames: cfgd?.cnames, aValues: cfgd?.aValues, error: cfgd?.error?.code },
      });

    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const subdomainRaw = String(body.subdomain || '').toLowerCase().trim();
    const subdomain = subdomainRaw.replace(/[^a-z0-9-]/g, '');
    if (!subdomain || subdomain.length > 63) return json({ error: 'Invalid subdomain' }, 400);

    const userId0 = (claims.claims as any).sub as string;
    const admin0 = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Full claim flow, done server-side so RLS quirks can't block owners.
    if (action === 'claim') {
      const workspaceId = String(body.workspaceId || '');
      if (!workspaceId) return json({ error: 'Missing workspaceId' }, 400);

      const { data: ws0 } = await admin0
        .from('workspaces').select('id, name, owner_id').eq('id', workspaceId).maybeSingle();
      if (!ws0) return json({ error: 'Workspace not found' }, 404);

      const { data: staffCheck } = await supabase.rpc('is_fluxcore_staff');
      if (!staffCheck && (ws0 as any).owner_id !== userId0) {
        return json({ error: 'Only the workspace owner can claim a subdomain' }, 403);
      }

      const { data: taken } = await admin0
        .from('partner_portals').select('id, workspace_id').eq('subdomain', subdomain).maybeSingle();
      if (taken && (taken as any).workspace_id !== workspaceId) {
        return json({ error: `${subdomain}.${ROOT_DOMAIN} is already taken` }, 409);
      }

      const { data: mine } = await admin0
        .from('partner_portals').select('id, subdomain').eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true }).limit(1).maybeSingle();

      const oldSub = (mine as any)?.subdomain as string | undefined;
      if (mine) {
        const { error: upErr } = await admin0.from('partner_portals')
          .update({ subdomain, status: 'active', closed_reason: null })
          .eq('id', (mine as any).id);
        if (upErr) return json({ error: upErr.message }, 400);
      } else {
        const { error: insErr } = await admin0.from('partner_portals').insert({
          workspace_id: workspaceId,
          subdomain,
          name: (ws0 as any).name,
          auto_created: true,
          use_hyra_ui: false,
          status: 'active',
          created_by: userId0,
          links: [],
        });
        if (insErr) return json({ error: insErr.message }, 400);
      }

      const vt = Deno.env.get('VERCEL_API_TOKEN');
      const pid = Deno.env.get('VERCEL_PROJECT_ID');
      const tid = Deno.env.get('VERCEL_TEAM_ID');
      if (!vt || !pid) return json({ error: 'Vercel not configured' }, 500);
      const tq = tid ? `?teamId=${encodeURIComponent(tid)}` : '';

      // Detach the previous domain (best effort)
      if (oldSub && oldSub !== subdomain) {
        await fetch(
          `${VERCEL_API}/v9/projects/${pid}/domains/${encodeURIComponent(`${oldSub}.${ROOT_DOMAIN}`)}${tq}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${vt}` } },
        ).catch(() => {});
      }

      const addRes = await fetch(`${VERCEL_API}/v10/projects/${pid}/domains${tq}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${vt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${subdomain}.${ROOT_DOMAIN}` }),
      });
      const addData = await addRes.json().catch(() => ({}));
      const code = addData?.error?.code;
      const attached = addRes.ok || code === 'domain_already_in_use' || code === 'domain_already_exists';
      if (!attached) {
        console.error('claim attach failed', subdomain, addRes.status, code, addData?.error?.message);
      }
      return json({
        ok: true, domain: `${subdomain}.${ROOT_DOMAIN}`, attached,
        vercelError: attached ? null : (addData?.error?.message || 'Vercel attach failed'),
      });
    }




    // Authorization: either Fluxcore staff, OR a workspace owner attaching
    // their own subdomain (must match a partner_portals row they own).
    const userId = (claims.claims as any).sub as string;
    const { data: isStaff } = await supabase.rpc('is_fluxcore_staff');
    if (!isStaff) {
      // Use the service role to avoid RLS pitfalls on the workspaces join.
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: portal } = await admin
        .from('partner_portals')
        .select('workspace_id')
        .eq('subdomain', subdomain)
        .maybeSingle();
      if (!portal) {
        return json({ error: 'Forbidden — subdomain not found' }, 403);
      }
      const { data: ws } = await admin
        .from('workspaces')
        .select('owner_id')
        .eq('id', (portal as any).workspace_id)
        .maybeSingle();
      if (!ws || (ws as any).owner_id !== userId) {
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
