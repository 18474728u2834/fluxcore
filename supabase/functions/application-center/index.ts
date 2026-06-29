// Application Center proxy. Authenticates Roblox servers with a per-workspace
// API key (X-API-Key header) and exposes a tiny JSON API used by the in-game
// script. Deployed publicly with verify_jwt = false; we authenticate via the
// workspace's app_center_api_key_hash, not Supabase auth.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

async function resolveWorkspace(req: Request) {
  const key = req.headers.get("x-api-key") || "";
  if (!key.startsWith("fxac_")) return null;
  const { data, error } = await admin.rpc("internal_workspace_by_app_center_key", { _api_key: key });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.workspace_id) return null;
  return { workspace_id: row.workspace_id as string, workspace_name: row.workspace_name as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Strip the function name + any Vercel rewrite prefix so /list, /submit work in both shapes.
  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/+/, "")
    .replace(/^functions\/v1\//, "")
    .replace(/^application-center\/?/, "")
    .replace(/^https\/application\/supabase\/?/, "");
  const route = path.split("/")[0] || "";

  const ws = await resolveWorkspace(req);
  if (!ws) return json({ error: "invalid_api_key" }, 401);

  try {
    if (route === "list" && req.method === "GET") {
      const { data, error } = await admin.rpc("internal_app_center_list_forms", { _workspace_id: ws.workspace_id });
      if (error) return json({ error: "list_failed" }, 500);
      return json({ workspace: ws.workspace_name, forms: data ?? [] });
    }

    if (route === "submit" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const form_id = body?.form_id;
      const roblox_user_id = body?.roblox_user_id;
      const roblox_username = body?.roblox_username;
      const answers = body?.answers;
      if (typeof form_id !== "string" || !form_id) return json({ error: "missing_form_id" }, 400);
      if (typeof roblox_user_id !== "string" || !roblox_user_id) return json({ error: "missing_identity" }, 400);
      if (typeof roblox_username !== "string") return json({ error: "missing_username" }, 400);
      if (typeof answers !== "object" || answers === null) return json({ error: "bad_answers" }, 400);

      // Confirm the form belongs to this workspace (defence in depth)
      const { data: form } = await admin
        .from("application_forms")
        .select("workspace_id, is_open")
        .eq("id", form_id)
        .maybeSingle();
      if (!form || form.workspace_id !== ws.workspace_id) return json({ error: "form_not_found" }, 404);
      if (!form.is_open) return json({ error: "form_closed" }, 409);

      const { data: appId, error } = await admin.rpc("submit_application", {
        _form_id: form_id,
        _roblox_user_id: roblox_user_id,
        _roblox_username: roblox_username,
        _answers: answers,
      });
      if (error) return json({ error: "submit_failed", detail: error.message }, 500);
      return json({ ok: true, application_id: appId });
    }

    return json({ error: "not_found", route }, 404);
  } catch (e) {
    return json({ error: "internal", detail: String(e) }, 500);
  }
});
