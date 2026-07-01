// One-shot: seeds vault.secrets.service_role_key from this function's own
// SUPABASE_SERVICE_ROLE_KEY env so pg_cron's cron_invoke_edge() helper can
// call other edge functions with the correct Authorization header.
// Idempotent: upserts the vault row.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!srk) return new Response("no key", { status: 500 });

    const admin = createClient(url, srk, { auth: { persistSession: false } });

    // Try update first, then insert if missing. Use raw SQL via RPC.
    const { error } = await admin.rpc("bootstrap_service_role_key", {
      _key: srk,
    });
    if (error) return new Response(error.message, { status: 500 });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
