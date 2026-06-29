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

    // /submit and /ranking both grade + record. /ranking is the documented
    // route in the Roblox server script ("fluxcore.works/application/ranking").
    if ((route === "submit" || route === "ranking") && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const form_id = body?.form_id;
      const roblox_user_id = body?.roblox_user_id;
      const roblox_username = body?.roblox_username;
      const answers = body?.answers;
      if (typeof form_id !== "string" || !form_id) return json({ error: "missing_form_id" }, 400);
      if (typeof roblox_user_id !== "string" || !roblox_user_id) return json({ error: "missing_identity" }, 400);
      if (typeof roblox_username !== "string") return json({ error: "missing_username" }, 400);
      if (typeof answers !== "object" || answers === null) return json({ error: "bad_answers" }, 400);

      const { data: graded, error } = await admin.rpc("internal_app_center_grade", {
        _workspace_id: ws.workspace_id,
        _form_id: form_id,
        _roblox_user_id: roblox_user_id,
        _roblox_username: roblox_username,
        _answers: answers,
      });
      if (error) return json({ error: "submit_failed", detail: error.message }, 500);

      const result: any = graded ?? {};
      const passed = !!result.passed;

      // Optional auto-rank on pass: requires owner-configured pass_rank_number
      // and the form's auto_rank_on_accept flag. Best-effort; failures don't
      // break the response so the Roblox server still kicks/congratulates.
      let ranked = false;
      if (passed && result.auto_rank_on_accept && result.pass_rank_number) {
        try {
          const { data: wsRow } = await admin
            .from("workspaces")
            .select("owner_id, roblox_group_id")
            .eq("id", ws.workspace_id)
            .single();
          const { data: secretsRow } = await admin.rpc("internal_get_workspace_secrets", {
            _workspace_id: ws.workspace_id,
          });
          const secrets: any = Array.isArray(secretsRow) ? secretsRow[0] : secretsRow;
          const robloxKey = secrets?.roblox_api_key && String(secrets.roblox_api_key).trim();
          if (robloxKey && wsRow?.roblox_group_id) {
            // Find role id for the configured rank number
            const rolesRes = await fetch(
              `https://apis.roblox.com/cloud/v2/groups/${String(wsRow.roblox_group_id).trim()}/roles?maxPageSize=50`,
              { headers: { "x-api-key": robloxKey } },
            );
            if (rolesRes.ok) {
              const rolesData = await rolesRes.json();
              const role = (rolesData.groupRoles || []).find((r: any) => r.rank === result.pass_rank_number);
              if (role?.id) {
                const roleId = String(role.id).split("/").pop();
                const memUrl = `https://apis.roblox.com/cloud/v2/groups/${String(wsRow.roblox_group_id).trim()}/memberships/${roblox_user_id}`;
                const rankRes = await fetch(memUrl, {
                  method: "PATCH",
                  headers: { "x-api-key": robloxKey, "Content-Type": "application/json" },
                  body: JSON.stringify({ role: `groups/${String(wsRow.roblox_group_id).trim()}/roles/${roleId}` }),
                });
                ranked = rankRes.ok;
              }
            }
          }
        } catch (_e) { /* swallow */ }
      }

      return json({
        ok: true,
        passed,
        ranked,
        application_id: result.application_id,
        correct: result.correct,
        gradeable_total: result.gradeable_total,
        ratio_pct: result.ratio_pct,
        pass_threshold: result.pass_threshold,
        message: passed ? (result.pass_message || "Passed & Ranked") : (result.fail_kick_message || "You did not pass."),
      });
    }

    return json({ error: "not_found", route }, 404);
  } catch (e) {
    return json({ error: "internal", detail: String(e) }, 500);
  }
});
