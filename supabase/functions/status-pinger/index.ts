import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { data: components } = await supabase
      .from('status_components')
      .select('id, slug, check_url')
      .not('check_url', 'is', null);

    const results: any[] = [];
    for (const c of (components || [])) {
      if (!c.check_url) continue;
      const start = Date.now();
      let status = 'operational';
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(c.check_url, { method: 'GET', signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) status = r.status >= 500 ? 'major_outage' : 'degraded_performance';
      } catch {
        status = 'major_outage';
      }
      const latency = Date.now() - start;
      await supabase.from('status_checks').insert({
        component_id: c.id, status, latency_ms: latency, source: 'auto',
      });
      results.push({ slug: c.slug, status, latency });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
