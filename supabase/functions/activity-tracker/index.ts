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

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, message_logger_enabled, roblox_api_key, roblox_group_id, auto_rank_enabled')
      .eq('api_key', apiKey)
      .single();

    if (wsError || !workspace) {
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
        const memRes = await fetch(
          `https://apis.roblox.com/cloud/v2/groups/${gid}/memberships?filter=user=='users/${robloxUserId}'&maxPageSize=1`,
          { headers: { 'x-api-key': apiKeyR } },
        );
        if (!memRes.ok) return null;
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
        JSON.stringify({ success: true, session_id: data.id, tracked: true }),
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
