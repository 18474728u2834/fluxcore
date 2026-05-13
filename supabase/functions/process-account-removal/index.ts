// User-side endpoint to APPROVE their own pending account removal request.
// On approve: cascades cleanup and deletes the auth user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);

    const sb = admin();
    const uid = u.user.id;

    // Verify a pending request exists for THIS user
    const { data: reqRow } = await sb
      .from("account_removal_requests")
      .select("id, status")
      .eq("target_user_id", uid)
      .eq("status", "pending")
      .maybeSingle();

    if (!reqRow) return json({ error: "no_pending_request" }, 404);

    // Mark approved
    await sb
      .from("account_removal_requests")
      .update({ status: "approved", responded_at: new Date().toISOString() })
      .eq("id", reqRow.id);

    // Cascade cleanup
    await sb.from("workspaces").delete().eq("owner_id", uid);
    await sb.from("workspace_members").delete().eq("user_id", uid);
    await sb.from("support_messages").delete().eq("user_id", uid);
    await sb.from("support_tickets").delete().eq("user_id", uid);
    await sb.from("feedback_messages").delete().eq("user_id", uid);
    await sb.from("feedback_tickets").delete().eq("user_id", uid);
    await sb.from("user_preferences").delete().eq("user_id", uid);
    await sb.from("verified_users").delete().eq("user_id", uid);

    const { error } = await sb.auth.admin.deleteUser(uid);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
