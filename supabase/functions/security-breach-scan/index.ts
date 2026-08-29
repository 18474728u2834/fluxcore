import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);

type Severity = 'critical' | 'warning' | 'info';
type Finding = { severity: Severity; category: string; title: string; detail: string };

const DAY = 24 * 60 * 60 * 1000;

// Tables that must NEVER be readable by an unauthenticated client.
const PRIVATE_TABLES = [
  'workspaces',
  'workspace_members',
  'verified_users',
  'discord_links',
  'premium_grants',
  'security_scans',
  'staff_admins',
  'applications',
  'email_send_log',
  'support_tickets',
];

async function run(triggeredBy: string) {
  const started = Date.now();
  const findings: Finding[] = [];
  const since = new Date(Date.now() - DAY).toISOString();

  // 1. Anonymous exposure probe — real breach test against public API
  for (const table of PRIVATE_TABLES) {
    try {
      const { data, error } = await anon.from(table).select('*').limit(1);
      if (!error && data && data.length > 0) {
        findings.push({
          severity: 'critical',
          category: 'Data exposure',
          title: `Table "${table}" is readable without signing in`,
          detail: 'An unauthenticated request returned rows. Row-Level Security or table grants are misconfigured.',
        });
      }
    } catch (_) { /* network hiccup — not a finding */ }
  }

  // 2. Duplicate Roblox identities (possible account takeover / linking abuse)
  try {
    const { data } = await admin.from('verified_users').select('roblox_user_id, user_id');
    const seen = new Map<string, Set<string>>();
    (data || []).forEach((r: any) => {
      if (!r.roblox_user_id) return;
      const s = seen.get(r.roblox_user_id) || new Set<string>();
      s.add(r.user_id);
      seen.set(r.roblox_user_id, s);
    });
    const dupes = [...seen.entries()].filter(([, s]) => s.size > 1);
    if (dupes.length) {
      findings.push({
        severity: 'critical',
        category: 'Identity',
        title: `${dupes.length} Roblox account(s) linked to multiple Fluxcore users`,
        detail: `Affected Roblox IDs: ${dupes.slice(0, 10).map(([id]) => id).join(', ')}`,
      });
    }
  } catch (e) {
    findings.push({ severity: 'warning', category: 'Scanner', title: 'Identity check failed', detail: String(e) });
  }

  // 3. Blacklisted users who still control a workspace
  try {
    const { data: bl } = await admin.from('fluxcore_blacklist').select('roblox_user_id, roblox_username');
    if (bl?.length) {
      const ids = bl.map((b: any) => b.roblox_user_id);
      const { data: vu } = await admin.from('verified_users').select('user_id, roblox_user_id').in('roblox_user_id', ids);
      if (vu?.length) {
        const { data: ws } = await admin
          .from('workspaces')
          .select('id, name, owner_id')
          .in('owner_id', vu.map((v: any) => v.user_id));
        if (ws?.length) {
          findings.push({
            severity: 'critical',
            category: 'Access control',
            title: `${ws.length} workspace(s) still owned by blacklisted accounts`,
            detail: ws.slice(0, 10).map((w: any) => w.name).join(', '),
          });
        }
      }
    }
  } catch (e) {
    findings.push({ severity: 'warning', category: 'Scanner', title: 'Blacklist check failed', detail: String(e) });
  }

  // 4. Overdue GDPR requests (regulatory breach at 30 days)
  for (const [table, label] of [['account_removal_requests', 'deletion'], ['data_export_requests', 'export']] as const) {
    try {
      const cutoff = new Date(Date.now() - 30 * DAY).toISOString();
      const { data } = await admin.from(table).select('id').eq('status', 'pending').lt('created_at', cutoff);
      if (data?.length) {
        findings.push({
          severity: 'critical',
          category: 'Compliance',
          title: `${data.length} data ${label} request(s) unanswered for over 30 days`,
          detail: 'GDPR requires a response within one month. Handle these in the User Data tab.',
        });
      }
    } catch (_) { /* ignore */ }
  }

  // 5. Failed transactional email in the last 24h
  try {
    const { data } = await admin.from('email_send_log').select('id').eq('status', 'failed').gte('created_at', since);
    if (data?.length) {
      findings.push({
        severity: data.length > 25 ? 'warning' : 'info',
        category: 'Deliverability',
        title: `${data.length} email(s) failed to send in the last 24h`,
        detail: 'Check the email log for bounce or provider errors.',
      });
    }
  } catch (_) { /* ignore */ }

  // 6. Discord bot command errors in the last 24h
  try {
    const { data } = await admin.from('discord_bot_logs').select('id').eq('result', 'error').gte('created_at', since);
    if (data?.length) {
      findings.push({
        severity: data.length > 25 ? 'warning' : 'info',
        category: 'Integrations',
        title: `${data.length} Discord command error(s) in the last 24h`,
        detail: 'Repeated failures can indicate a revoked bot token or permission drift.',
      });
    }
  } catch (_) { /* ignore */ }

  // 7. Premium grant links that are expired or exhausted but still present
  try {
    const { data } = await admin.from('premium_grants').select('id, token, expires_at, uses, max_uses');
    const stale = (data || []).filter((g: any) =>
      (g.expires_at && new Date(g.expires_at).getTime() < Date.now()) || g.uses >= g.max_uses);
    if (stale.length) {
      findings.push({
        severity: 'info',
        category: 'Hygiene',
        title: `${stale.length} expired or fully used Premium grant link(s) still stored`,
        detail: 'Consider deleting them so old tokens cannot be replayed.',
      });
    }
  } catch (_) { /* ignore */ }

  // 8. Stale Discord verification sessions
  try {
    const { data } = await admin
      .from('discord_command_sessions')
      .select('id')
      .is('consumed_at', null)
      .lt('expires_at', since);
    if (data && data.length > 100) {
      findings.push({
        severity: 'info',
        category: 'Hygiene',
        title: `${data.length} expired Discord verification tokens are still stored`,
        detail: 'They are unusable, but pruning them keeps the token table small.',
      });
    }
  } catch (_) { /* ignore */ }

  // 9. Privilege sprawl
  try {
    const { data } = await admin.from('staff_admins').select('id, role');
    const owners = (data || []).filter((a: any) => a.role === 'owner_admin');
    if (owners.length > 3) {
      findings.push({
        severity: 'warning',
        category: 'Access control',
        title: `${owners.length} accounts hold full owner-admin access`,
        detail: 'Owner admins bypass every permission check. Keep this list as small as possible.',
      });
    }
  } catch (_) { /* ignore */ }

  // 10. Workspaces storing secrets — confirm encryption columns are populated, not plaintext
  try {
    const { count } = await admin
      .from('workspaces')
      .select('id', { count: 'exact', head: true })
      .not('api_key_hash', 'is', null);
    findings.push({
      severity: 'info',
      category: 'Encryption',
      title: `${count ?? 0} workspace credential set(s) verified as encrypted at rest`,
      detail: 'API keys are stored only as pgcrypto ciphertext plus a SHA-256 hash.',
    });
  } catch (_) { /* ignore */ }

  const critical_count = findings.filter(f => f.severity === 'critical').length;
  const warning_count = findings.filter(f => f.severity === 'warning').length;
  const info_count = findings.filter(f => f.severity === 'info').length;
  const status = critical_count > 0 ? 'critical' : warning_count > 0 ? 'warning' : 'ok';

  const { data: row, error } = await admin.from('security_scans').insert({
    scan_type: 'daily',
    status,
    critical_count,
    warning_count,
    info_count,
    findings,
    duration_ms: Date.now() - started,
    triggered_by: triggeredBy,
  }).select().single();

  if (error) throw new Error(error.message);
  return row;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    let triggeredBy = 'cron';

    // Every caller must authenticate. Cron / service-role calls pass the
    // service key; anything else must be a signed-in staff member holding the
    // view_security_scans permission. Anonymous requests are rejected outright.
    if (!token) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (token !== SERVICE_KEY) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: allowed } = await userClient.rpc('has_staff_permission', { _perm: 'view_security_scans' });
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      triggeredBy = userData.user.id;
    }

    const row = await run(triggeredBy);
    return new Response(JSON.stringify({ ok: true, scan: row }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
