import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing x-api-key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the workspace id by hashed api key (secrets are encrypted)
    const { data: wsIdRow } = await supabase.rpc('internal_workspace_id_by_api_key', { _api_key: apiKey });
    const wsId = wsIdRow as string | null;
    if (!wsId) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: wsRow } = await supabase
      .from('workspaces')
      .select('id, message_logger_enabled, roblox_group_id, auto_rank_enabled, afk_confirm_seconds')
      .eq('id', wsId)
      .single();
    const { data: secretsRow } = await supabase.rpc('internal_get_workspace_secrets', { _workspace_id: wsId });
    const secrets = (Array.isArray(secretsRow) ? secretsRow[0] : secretsRow) || {};
    const workspace = { ...(wsRow as any), roblox_api_key: secrets.roblox_api_key as string | null } as any;
    if (!workspace?.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const action = body.action;

    // Helper: try to auto-add a Roblox user as a workspace member if their rank is mapped.
    async function tryAutoAddMember(robloxUserId: string, robloxUsername: string) {
      if (!workspace.auto_rank_enabled || !workspace.roblox_api_key || !workspace.roblox_group_id) return null;
      try {
        const apiKeyR = workspace.roblox_api_key as string;
        const gid = workspace.roblox_group_id as string;
        const filter = encodeURIComponent(`user == 'users/${robloxUserId}'`);
        const memRes = await fetch(
          `https://apis.roblox.com/cloud/v2/groups/${gid}/memberships?maxPageSize=1&filter=${filter}`,
          { headers: { 'x-api-key': apiKeyR } },
        );
        if (!memRes.ok) {
          const text = await memRes.text().catch(() => '');
          console.error('Roblox auto-add membership lookup failed:', memRes.status, text.slice(0, 200));
          return null;
        }
        const memJson = await memRes.json();
        const m = memJson.groupMemberships?.[0];
        if (!m) return null;
        const roleId = String(m.role || '').split('/').pop();
        if (!roleId) return null;
        const { data: wsRole } = await supabase.from('workspace_roles')
          .select('id, name')
          .eq('workspace_id', workspace.id)
          .eq('roblox_role_id', roleId)
          .maybeSingle();
        if (!wsRole) return null;
        const { data: inserted } = await supabase.from('workspace_members').insert({
          workspace_id: workspace.id,
          roblox_user_id: robloxUserId,
          roblox_username: robloxUsername,
          role: wsRole.name,
          role_id: wsRole.id,
          verified: false,
          user_id: null,
        }).select('id').single();
        return inserted;
      } catch (_) { return null; }
    }

    // Minimum in-server time (minutes) before a shift counts as attended.
    const ATTEND_MIN_MINUTES = 5;

    // Returns the currently running scheduled session (shift/training/event) for
    // this workspace, if any. Handles one-off sessions and weekly recurrence.
    async function findActiveShift() {
      const now = new Date();
      const lookback = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
      const { data: sessions } = await supabase
        .from('scheduled_sessions')
        .select('id, title, category, scheduled_at, duration_minutes, recurring, recurring_days, recurring_time, status')
        .eq('workspace_id', workspace.id)
        .neq('status', 'cancelled')
        .or(`scheduled_at.gte.${lookback},recurring.not.is.null`);

      for (const s of (sessions || []) as any[]) {
        const dur = (s.duration_minutes || 60) * 60_000;
        const candidates: Date[] = [];

        const base = new Date(s.scheduled_at);
        if (!isNaN(base.getTime())) candidates.push(base);

        const days: number[] | null = Array.isArray(s.recurring_days) ? s.recurring_days.map(Number) : null;
        if (s.recurring && days && days.length && s.recurring_time) {
          const [hh, mm] = String(s.recurring_time).split(':').map(Number);
          for (const offset of [0, -1]) {
            const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset, hh || 0, mm || 0, 0));
            if (days.includes(d.getUTCDay())) candidates.push(d);
          }
        }

        for (const c of candidates) {
          const start = c.getTime();
          if (now.getTime() >= start && now.getTime() < start + dur) {
            return { session: s, occurrence_at: c.toISOString() };
          }
        }
      }
      return null;
    }

    // If a shift is live and this player has been in-server long enough, mark attendance.
    async function verifyShiftAttendance(robloxUserId: string, robloxUsername: string | null, sessionRowId?: string | null) {
      try {
        let joinedAt: string | null = null;
        let query = supabase
          .from('activity_sessions')
          .select('id, joined_at')
          .eq('workspace_id', workspace.id)
          .eq('roblox_user_id', String(robloxUserId))
          .eq('discarded', false)
          .order('joined_at', { ascending: false })
          .limit(1);
        if (sessionRowId) query = supabase
          .from('activity_sessions')
          .select('id, joined_at')
          .eq('id', sessionRowId)
          .eq('workspace_id', workspace.id)
          .limit(1);
        const { data: rows } = await query;
        joinedAt = (rows || [])[0]?.joined_at || null;
        if (!joinedAt) return null;

        const minutes = Math.floor((Date.now() - new Date(joinedAt).getTime()) / 60_000);
        if (minutes < ATTEND_MIN_MINUTES) return null;

        const active = await findActiveShift();
        if (!active) return null;

        const { data: member } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspace.id)
          .eq('roblox_user_id', String(robloxUserId))
          .maybeSingle();

        const { data: existing } = await supabase
          .from('session_attendance')
          .select('id, minutes_present')
          .eq('session_id', active.session.id)
          .eq('occurrence_at', active.occurrence_at)
          .eq('roblox_user_id', String(robloxUserId))
          .maybeSingle();

        if (existing) {
          if (minutes > (existing.minutes_present || 0)) {
            await supabase.from('session_attendance')
              .update({ minutes_present: minutes })
              .eq('id', existing.id);
          }
          return { attended: true, session_id: active.session.id, minutes };
        }

        await supabase.from('session_attendance').insert({
          workspace_id: workspace.id,
          session_id: active.session.id,
          occurrence_at: active.occurrence_at,
          roblox_user_id: String(robloxUserId),
          roblox_username: robloxUsername || null,
          member_id: member?.id || null,
          minutes_present: minutes,
        });

        await supabase.from('activity_events').insert({
          workspace_id: workspace.id,
          roblox_user_id: String(robloxUserId),
          roblox_username: robloxUsername || null,
          event_type: 'shift_attended',
          event_data: {
            session_id: active.session.id,
            title: active.session.title,
            category: active.session.category,
            occurrence_at: active.occurrence_at,
            minutes_present: minutes,
          },
        });

        return { attended: true, session_id: active.session.id, minutes, first: true };
      } catch (e) {
        console.error('verifyShiftAttendance failed:', e);
        return null;
      }
    }



    // JOIN
    if (action === 'join') {
      const { roblox_user_id, roblox_username, server_id } = body;
      if (!roblox_user_id || !roblox_username) {
        return new Response(
          JSON.stringify({ error: 'Missing roblox_user_id or roblox_username' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if staff (workspace member)
      let { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('roblox_user_id', String(roblox_user_id))
        .maybeSingle();

      // Not yet a member? Try to auto-add based on Roblox rank mapping.
      if (!existingMember) {
        existingMember = await tryAutoAddMember(String(roblox_user_id), roblox_username);
      }

      if (!existingMember) {
        return new Response(
          JSON.stringify({ success: true, tracked: false, reason: 'not_staff' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Close any stale open rows for this player before starting a fresh tracked session.
      // Roblox servers can shut down without firing PlayerRemoving, which otherwise leaves someone "online" forever.
      const staleCutoff = new Date(Date.now() - 10 * 60_000).toISOString();
      await supabase
        .from('activity_sessions')
        .update({ left_at: new Date().toISOString() })
        .eq('workspace_id', workspace.id)
        .eq('roblox_user_id', String(roblox_user_id))
        .is('left_at', null)
        .lt('joined_at', staleCutoff);
      await supabase.rpc('calculate_session_duration', { ws_id: workspace.id });

      const { data, error } = await supabase
        .from('activity_sessions')
        .insert({
          workspace_id: workspace.id,
          roblox_user_id: String(roblox_user_id),
          roblox_username,
          server_id: server_id || null,
          message_count: 0,
          idle_seconds: 0,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log join event
      await supabase.from('activity_events').insert({
        workspace_id: workspace.id,
        roblox_user_id: String(roblox_user_id),
        roblox_username,
        event_type: 'join',
        event_data: { server_id: server_id || null },
      });

      return new Response(
        JSON.stringify({
          success: true,
          session_id: data.id,
          tracked: true,
          afk_confirm_seconds: workspace.afk_confirm_seconds || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AFK_PROMPT - record that the AFK prompt was shown to the player
    if (action === 'afk_prompt') {
      const { session_id } = body;
      if (session_id) {
        await supabase.from('activity_sessions')
          .update({ afk_prompt_at: new Date().toISOString() })
          .eq('id', session_id)
          .eq('workspace_id', workspace.id);
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AFK_CONFIRM - player clicked the "I'm not AFK" button in time
    if (action === 'afk_confirm') {
      const { session_id } = body;
      if (session_id) {
        await supabase.from('activity_sessions')
          .update({ afk_confirmed_at: new Date().toISOString(), afk_prompt_at: null })
          .eq('id', session_id)
          .eq('workspace_id', workspace.id);
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AFK_TIMEOUT - player did not respond; discard their session time
    if (action === 'afk_timeout') {
      const { session_id, roblox_user_id, roblox_username } = body;
      if (session_id) {
        await supabase.from('activity_sessions')
          .update({
            left_at: new Date().toISOString(),
            discarded: true,
            discard_reason: 'afk_timeout',
            duration_seconds: 0,
          })
          .eq('id', session_id)
          .eq('workspace_id', workspace.id);

        await supabase.from('activity_events').insert({
          workspace_id: workspace.id,
          roblox_user_id: String(roblox_user_id || ''),
          roblox_username: roblox_username || null,
          event_type: 'afk_discarded',
          event_data: { session_id },
        });
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LEAVE
    if (action === 'leave') {
      const { roblox_user_id, roblox_username, session_id, message_count, idle_seconds } = body;
      if (!roblox_user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing roblox_user_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let query = supabase
        .from('activity_sessions')
        .update({
          left_at: new Date().toISOString(),
          message_count: message_count || 0,
          idle_seconds: idle_seconds || 0,
        })
        .eq('workspace_id', workspace.id)
        .eq('roblox_user_id', String(roblox_user_id))
        .is('left_at', null);

      if (session_id) query = query.eq('id', session_id);

      const { error } = await query;
      if (error) {
        console.error('Error closing session:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to close session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase.rpc('calculate_session_duration', { ws_id: workspace.id });

      // Log leave event
      await supabase.from('activity_events').insert({
        workspace_id: workspace.id,
        roblox_user_id: String(roblox_user_id),
        roblox_username: roblox_username || null,
        event_type: 'leave',
        event_data: { message_count: message_count || 0, idle_seconds: idle_seconds || 0 },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // HEARTBEAT
    if (action === 'heartbeat') {
      const { roblox_user_id, session_id, is_idle, message_count, idle_seconds } = body;

      if (session_id) {
        // Update session with latest counts
        const updates: Record<string, any> = {};
        if (typeof message_count === 'number') updates.message_count = message_count;
        if (typeof idle_seconds === 'number') updates.idle_seconds = idle_seconds;

        if (Object.keys(updates).length > 0) {
          await supabase.from('activity_sessions')
            .update(updates)
            .eq('id', session_id)
            .eq('workspace_id', workspace.id);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MESSAGE - Log staff chat message
    if (action === 'message') {
      if (!workspace.message_logger_enabled) {
        return new Response(
          JSON.stringify({ success: true, logged: false, reason: 'logger_disabled' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { roblox_user_id, roblox_username, message_content, message } = body;
      const text = String(message_content ?? message ?? '').trim();
      if (!text) {
        return new Response(
          JSON.stringify({ success: true, logged: false, reason: 'empty' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase.from('activity_events').insert({
        workspace_id: workspace.id,
        roblox_user_id: String(roblox_user_id),
        roblox_username: roblox_username || null,
        event_type: 'chat_message',
        event_data: { content: text },
      });

      return new Response(
        JSON.stringify({ success: true, logged: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // EVENT
    if (action === 'event') {
      const { roblox_user_id, roblox_username, event_type, event_data } = body;
      if (!roblox_user_id || !event_type) {
        return new Response(
          JSON.stringify({ error: 'Missing roblox_user_id or event_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Special handling for chat_message events from the Lua tracker:
      // normalize payload to { content }, gate on message_logger_enabled, skip empty.
      if (event_type === 'chat_message') {
        if (!workspace.message_logger_enabled) {
          return new Response(
            JSON.stringify({ success: true, logged: false, reason: 'logger_disabled' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const raw = event_data || {};
        const text = String(raw.content ?? raw.message ?? '').trim();
        if (!text) {
          return new Response(
            JSON.stringify({ success: true, logged: false, reason: 'empty' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: ceErr } = await supabase.from('activity_events').insert({
          workspace_id: workspace.id,
          roblox_user_id: String(roblox_user_id),
          roblox_username: roblox_username || null,
          event_type: 'chat_message',
          event_data: { content: text, server_id: raw.server_id || null },
        });
        if (ceErr) {
          return new Response(
            JSON.stringify({ error: 'Failed to log message' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ success: true, logged: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase.from('activity_events').insert({
        workspace_id: workspace.id,
        roblox_user_id: String(roblox_user_id),
        roblox_username: roblox_username || null,
        event_type,
        event_data: event_data || {},
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to create event' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action. Use: join, leave, event, heartbeat, message' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
