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

type RankOutcome = {
  ranked: boolean;
  verified_rank?: number | null;
  verified_role_id?: string | null;
  error?: string;
  detail?: string;
};

function shortRoleId(value: unknown): string {
  return String(value || "").split("/").filter(Boolean).pop() || "";
}

async function robloxJson(url: string, apiKey: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { ok: res.ok, status: res.status, text, data };
}

async function listGroupRoles(apiKey: string, groupId: string): Promise<any[]> {
  const roles: any[] = [];
  let pageToken: string | null = null;
  for (let i = 0; i < 50; i++) {
    let url = `https://apis.roblox.com/cloud/v2/groups/${groupId}/roles?maxPageSize=20`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const res = await robloxJson(url, apiKey);
    if (!res.ok) throw new Error(`roles_fetch_failed:${res.status}:${res.text}`);
    roles.push(...(res.data?.groupRoles || []));
    if (!res.data?.nextPageToken) break;
    pageToken = res.data.nextPageToken;
  }
  return roles;
}

async function getGroupMembership(apiKey: string, groupId: string, robloxUserId: string) {
  const filter = encodeURIComponent(`user == 'users/${robloxUserId}'`);
  const url = `https://apis.roblox.com/cloud/v2/groups/${groupId}/memberships?filter=${filter}&maxPageSize=1`;
  const res = await robloxJson(url, apiKey);
  if (!res.ok) throw new Error(`membership_lookup_failed:${res.status}:${res.text}`);
  return res.data?.groupMemberships?.[0] || null;
}

async function rankRobloxUser(apiKey: string, groupId: string, robloxUserId: string, rankNumber: number): Promise<RankOutcome> {
  const roles = await listGroupRoles(apiKey, groupId);
  const role = roles.find((r: any) => Number(r.rank) === Number(rankNumber));
  if (!role) return { ranked: false, error: "role_not_found", detail: `No Roblox role exists at rank ${rankNumber}` };

  const targetRoleId = shortRoleId(role.id || role.path);
  if (!targetRoleId) return { ranked: false, error: "role_id_missing" };
  const targetRolePath = `groups/${groupId}/roles/${targetRoleId}`;

  const membership = await getGroupMembership(apiKey, groupId, robloxUserId);
  if (!membership?.path) return { ranked: false, error: "not_in_group", detail: `Roblox user ${robloxUserId} is not in group ${groupId}` };
  const existingRoleIds = [membership.role, ...(Array.isArray(membership.roles) ? membership.roles : [])]
    .map(shortRoleId)
    .filter((id: string) => id && id !== targetRoleId);

  // Roblox deprecated PATCH for membership rank changes; assignRole is now the
  // supported endpoint. Roblox also documents that missing group:write can still
  // return success without changing the rank, so we always verify afterwards.
  const assignRes = await robloxJson(`https://apis.roblox.com/cloud/v2/${membership.path}:assignRole`, apiKey, {
    method: "POST",
    body: JSON.stringify({ role: targetRolePath }),
  });
  if (!assignRes.ok) {
    return { ranked: false, error: "assign_role_failed", detail: `${assignRes.status}: ${assignRes.text}` };
  }

  for (const oldRoleId of Array.from(new Set(existingRoleIds))) {
    const unassignRes = await robloxJson(`https://apis.roblox.com/cloud/v2/${membership.path}:unassignRole`, apiKey, {
      method: "POST",
      body: JSON.stringify({ role: `groups/${groupId}/roles/${oldRoleId}` }),
    });
    if (!unassignRes.ok) {
      console.error("app-center old role unassign failed:", unassignRes.status, unassignRes.text);
    }
  }

  const verified = await getGroupMembership(apiKey, groupId, robloxUserId);
  const verifiedRoleIds = [verified?.role, ...(Array.isArray(verified?.roles) ? verified.roles : [])].map(shortRoleId).filter(Boolean);
  const verifiedRoleId = verifiedRoleIds.find((id: string) => id === targetRoleId) || verifiedRoleIds[0] || "";
  const verifiedRole = roles.find((r: any) => shortRoleId(r.id || r.path) === verifiedRoleId);
  const verifiedRank = verifiedRole?.rank ?? null;
  const ranked = verifiedRoleIds.includes(targetRoleId) || Number(verifiedRank) === Number(rankNumber);
  if (!ranked) {
    return {
      ranked: false,
      verified_rank: verifiedRank,
      verified_role_id: verifiedRoleId || null,
      error: "rank_verification_failed",
      detail: "Roblox accepted the request but the member's rank did not change. Check the Open Cloud key has group:write and the key owner can manage that target rank.",
    };
  }
  return { ranked: true, verified_rank: verifiedRank, verified_role_id: verifiedRoleId };
}

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
      let rankError: string | null = null;
      let rankDetail: string | null = null;
      let verifiedRank: number | null = null;
      const rankRequired = !!(passed && result.auto_rank_on_accept && result.pass_rank_number);
      if (rankRequired) {
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
            const groupId = String(wsRow.roblox_group_id).trim();
            const outcome = await rankRobloxUser(robloxKey, groupId, String(roblox_user_id), Number(result.pass_rank_number));
            ranked = outcome.ranked;
            verifiedRank = outcome.verified_rank ?? null;
            rankError = outcome.error || null;
            rankDetail = outcome.detail || null;
            if (!ranked) console.error("app-center rank failed:", rankError, rankDetail || "");
          } else {
            rankError = "missing_roblox_config";
            rankDetail = "Missing Roblox Open Cloud API key or group ID for workspace.";
            console.error("app-center: missing roblox_api_key or roblox_group_id for workspace", ws.workspace_id);
          }
        } catch (e) {
          rankError = "rank_exception";
          rankDetail = e instanceof Error ? e.message : String(e);
          console.error("app-center rank error:", e);
        }
      }

      const finalPassed = passed && (!rankRequired || ranked);

      return json({
        ok: true,
        passed: finalPassed,
        answers_passed: passed,
        ranked,
        rank_required: rankRequired,
        rank_error: rankError,
        rank_detail: rankDetail,
        verified_rank: verifiedRank,
        application_id: result.application_id,
        correct: result.correct,
        gradeable_total: result.gradeable_total,
        ratio_pct: result.ratio_pct,
        pass_threshold: result.pass_threshold,
        message: finalPassed ? (result.pass_message || "Passed & Ranked") : (result.fail_kick_message || "Failed. Try again later."),
      });
    }

    return json({ error: "not_found", route }, 404);
  } catch (e) {
    return json({ error: "internal", detail: String(e) }, 500);
  }
});
