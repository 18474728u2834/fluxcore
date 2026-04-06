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
      .select('id')
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

    // JOIN - Player joined game
    if (action === 'join') {
      const { roblox_user_id, roblox_username, server_id } = body;
      if (!roblox_user_id || !roblox_username) {
        return new Response(
          JSON.stringify({ error: 'Missing roblox_user_id or roblox_username' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Auto-create workspace member if not exists
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('roblox_user_id', String(roblox_user_id))
        .maybeSingle();

      if (!existingMember) {
        await supabase.from('workspace_members').insert({
          workspace_id: workspace.id,
          roblox_user_id: String(roblox_user_id),
          roblox_username,
        });
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

      return new Response(
        JSON.stringify({ success: true, session_id: data.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LEAVE - Player left game
    if (action === 'leave') {
      const { roblox_user_id, session_id, message_count, idle_seconds } = body;
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

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // HEARTBEAT - Keep alive with idle/message data
    if (action === 'heartbeat') {
      const { roblox_user_id, session_id, is_idle, message_count } = body;

      if (session_id) {
        // Update session counts
        const updates: any = {};
        if (is_idle) {
          // Add 30 seconds of idle time (heartbeat interval)
          await supabase.rpc('calculate_session_duration', { ws_id: workspace.id });
        }

        // Log heartbeat
        await supabase.from('activity_heartbeats').insert({
          session_id,
          workspace_id: workspace.id,
          roblox_user_id: String(roblox_user_id),
          is_idle: is_idle || false,
          message_count: message_count || 0,
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // EVENT - Custom event
    if (action === 'event') {
      const { roblox_user_id, roblox_username, event_type, event_data } = body;
      if (!roblox_user_id || !event_type) {
        return new Response(
          JSON.stringify({ error: 'Missing roblox_user_id or event_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('activity_events')
        .insert({
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
      JSON.stringify({ error: 'Unknown action. Use: join, leave, event, heartbeat' }),
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
