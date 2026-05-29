// Staff Dashboard backend — handles all privileged staff actions.
// Verifies caller is a staff_admin and has the required permission for the action.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getCaller(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return null;

  const sb = admin();
  const { data: staff } = await sb
    .from("staff_admins")
    .select("id, role, roblox_username, user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();

  // Fall-through: legacy Novavoff via verified_users
  let isOwnerAdmin = staff?.role === "owner_admin";
  let resolved = staff;
  if (!resolved) {
    const { data: vu } = await sb
      .from("verified_users")
      .select("user_id, roblox_username")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (vu && vu.roblox_username?.toLowerCase() === "novavoff") {
      isOwnerAdmin = true;
      resolved = { id: "", role: "owner_admin", user_id: u.user.id, roblox_username: vu.roblox_username } as any;
    }
  }

  if (!resolved) return null;

  // Load permissions
  let perms: string[] = [];
  if (resolved.id) {
    const { data: pRows } = await sb
      .from("staff_permissions")
      .select("permission")
      .eq("admin_id", resolved.id);
    perms = (pRows || []).map((p) => p.permission);
  }

  return {
    user: u.user,
    staff: resolved,
    isOwnerAdmin,
    has: (perm: string) => isOwnerAdmin || perms.includes(perm),
  };
}

async function audit(
  caller: Awaited<ReturnType<typeof getCaller>>,
  action: string,
  target_type: string | null,
  target_id: string | null,
  details: Record<string, unknown> = {}
) {
  if (!caller) return;
  await admin().from("staff_audit_log").insert({
    admin_user_id: caller.user.id,
    admin_username: caller.staff.roblox_username,
    action,
    target_type,
    target_id,
    details,
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
    const caller = await getCaller(req);
    if (!caller) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const sb = admin();

    switch (action) {
      case "whoami": {
        // Return staff identity + permissions for the dashboard
        const { data: pRows } = caller.staff.id
          ? await sb.from("staff_permissions").select("permission").eq("admin_id", caller.staff.id)
          : { data: [] as any[] };
        return json({
          user_id: caller.user.id,
          roblox_username: caller.staff.roblox_username,
          role: caller.staff.role,
          owner_admin: caller.isOwnerAdmin,
          permissions: caller.isOwnerAdmin ? "*" : (pRows || []).map((p: any) => p.permission),
        });
      }

      case "add_admin": {
        if (!caller.isOwnerAdmin) return json({ error: "forbidden" }, 403);
        const username = String(body.roblox_username || "").trim();
        if (!username) return json({ error: "missing_username" }, 400);
        const { data: vu } = await sb
          .from("verified_users")
          .select("user_id, roblox_username")
          .ilike("roblox_username", username)
          .maybeSingle();
        if (!vu) return json({ error: "user_not_verified" }, 404);
        const { data: ins, error } = await sb
          .from("staff_admins")
          .insert({
            user_id: vu.user_id,
            roblox_username: vu.roblox_username,
            role: "admin",
            added_by: caller.user.id,
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        await audit(caller, "add_admin", "staff_admin", ins.id, { username: vu.roblox_username });
        return json({ admin: ins });
      }

      case "remove_admin": {
        if (!caller.isOwnerAdmin) return json({ error: "forbidden" }, 403);
        const id = String(body.admin_id || "");
        const { data: target } = await sb.from("staff_admins").select("role, roblox_username").eq("id", id).maybeSingle();
        if (!target) return json({ error: "not_found" }, 404);
        if (target.role === "owner_admin") return json({ error: "cannot_remove_owner" }, 400);
        await sb.from("staff_admins").delete().eq("id", id);
        await audit(caller, "remove_admin", "staff_admin", id, { username: target.roblox_username });
        return json({ ok: true });
      }

      case "set_permissions": {
        if (!caller.isOwnerAdmin) return json({ error: "forbidden" }, 403);
        const id = String(body.admin_id || "");
        const perms: string[] = Array.isArray(body.permissions) ? body.permissions : [];

        // Capture previous perms before mutating
        const { data: prevRows } = await sb
          .from("staff_permissions")
          .select("permission")
          .eq("admin_id", id);
        const prev = (prevRows || []).map((r: any) => r.permission).sort();
        const next = [...perms].sort();

        await sb.from("staff_permissions").delete().eq("admin_id", id);
        if (perms.length) {
          await sb.from("staff_permissions").insert(perms.map((p) => ({ admin_id: id, permission: p })));
        }

        // Resolve target username for nicer audit summary
        const { data: target } = await sb.from("staff_admins").select("roblox_username").eq("id", id).maybeSingle();
        const targetName = target?.roblox_username || id.slice(0, 8);

        // Consolidate: drop prior set_permissions rows for this target by this caller
        await sb
          .from("staff_audit_log")
          .delete()
          .eq("action", "set_permissions")
          .eq("target_id", id)
          .eq("admin_user_id", caller.user.id);

        const added = next.filter((p) => !prev.includes(p));
        const removed = prev.filter((p) => !next.includes(p));
        const summary =
          added.length || removed.length
            ? `edited "${targetName}" permissions` +
              (removed.length ? ` — removed [${removed.join(", ")}]` : "") +
              (added.length ? ` — added [${added.join(", ")}]` : "")
            : `reviewed "${targetName}" permissions (no change)`;

        await audit(caller, "set_permissions", "staff_admin", id, {
          target: targetName,
          from: prev,
          to: next,
          added,
          removed,
          summary,
        });
        return json({ ok: true });
      }

      case "list_all_workspaces": {
        if (!caller.has("claim_premium_self")) return json({ error: "forbidden" }, 403);
        const q = String(body.query || "").trim();
        let qb = sb.from("workspaces").select("id, name, premium, premium_until").order("name").limit(200);
        if (q) qb = qb.ilike("name", `%${q}%`);
        const { data } = await qb;
        return json({ workspaces: data || [] });
      }

      case "grant_self_premium": {
        if (!caller.has("claim_premium_self")) return json({ error: "forbidden" }, 403);
        const workspace_id = String(body.workspace_id || "");
        const days = Math.max(1, Math.min(3650, Number(body.days || 30)));
        const { data: ws } = await sb.from("workspaces").select("id, name, owner_id, premium_until").eq("id", workspace_id).maybeSingle();
        if (!ws) return json({ error: "workspace_not_found" }, 404);
        const base = ws.premium_until && new Date(ws.premium_until) > new Date() ? new Date(ws.premium_until) : new Date();
        const next = new Date(base.getTime() + days * 86400_000);
        await sb.from("workspaces").update({ premium: true, premium_until: next.toISOString() }).eq("id", workspace_id);
        await audit(caller, "grant_self_premium", "workspace", workspace_id, { days });
        return json({ ok: true, premium_until: next.toISOString() });
      }

      case "search_users": {
        if (!caller.has("export_user_data") && !caller.has("delete_users") && !caller.isOwnerAdmin)
          return json({ error: "forbidden" }, 403);
        const q = String(body.query || "").trim();
        if (!q) return json({ users: [] });
        const { data } = await sb
          .from("verified_users")
          .select("user_id, roblox_username, roblox_user_id, verified_at")
          .or(`roblox_username.ilike.%${q}%,roblox_user_id.eq.${/^\d+$/.test(q) ? q : 0}`)
          .limit(25);
        return json({ users: data || [] });
      }

      case "export_user_data": {
        if (!caller.has("export_user_data")) return json({ error: "forbidden" }, 403);
        const target_user_id = String(body.user_id || "");
        if (!target_user_id) return json({ error: "missing_user_id" }, 400);

        const [vu, owned, memberships, sessions, tickets, ticketMsgs, feedback, feedbackMsgs, prefs, claims, signatures, loa] = await Promise.all([
          sb.from("verified_users").select("*").eq("user_id", target_user_id),
          sb.from("workspaces").select("*").eq("owner_id", target_user_id),
          sb.from("workspace_members").select("*").eq("user_id", target_user_id),
          sb.from("activity_sessions").select("*").in("roblox_user_id",
            (await sb.from("verified_users").select("roblox_user_id").eq("user_id", target_user_id)).data?.map((r: any) => r.roblox_user_id) || ["__none__"]
          ),
          sb.from("support_tickets").select("*").eq("user_id", target_user_id),
          sb.from("support_messages").select("*").eq("user_id", target_user_id),
          sb.from("feedback_tickets").select("*").eq("user_id", target_user_id),
          sb.from("feedback_messages").select("*").eq("user_id", target_user_id),
          sb.from("user_preferences").select("*").eq("user_id", target_user_id),
          sb.from("premium_grant_claims").select("*").eq("user_id", target_user_id),
          sb.from("document_signatures").select("*").eq("user_id", target_user_id),
          sb.from("loa_requests").select("*").eq("user_id", target_user_id),
        ]);

        const username = vu.data?.[0]?.roblox_username || null;
        // Strip sensitive workspace-owner secrets (Roblox Open Cloud key, internal API key)
        const sanitizedWorkspaces = (owned.data || []).map((w: any) => {
          const { roblox_api_key, api_key, ...safe } = w;
          return safe;
        });
        const payload = {
          exported_at: new Date().toISOString(),
          target_user_id,
          target_username: username,
          verified_user: vu.data,
          workspaces_owned: sanitizedWorkspaces,
          workspace_memberships: memberships.data,
          activity_sessions: sessions.data,
          support_tickets: tickets.data,
          support_messages: ticketMsgs.data,
          feedback_tickets: feedback.data,
          feedback_messages: feedbackMsgs.data,
          preferences: prefs.data,
          premium_claims: claims.data,
          document_signatures: signatures.data,
          loa_requests: loa.data,
        };

        await sb.from("data_export_requests").insert({
          target_user_id,
          target_username: username,
          requested_by: caller.user.id,
          status: "completed",
          payload,
        });
        await audit(caller, "export_user_data", "user", target_user_id, { username });
        return json({ payload });
      }

      case "request_account_removal": {
        if (!caller.has("delete_users")) return json({ error: "forbidden" }, 403);
        const target_user_id = String(body.user_id || "");
        const reason = String(body.reason || "").trim() || null;
        if (!target_user_id) return json({ error: "missing_user_id" }, 400);
        if (target_user_id === caller.user.id) return json({ error: "cannot_target_self" }, 400);

        const { data: vu } = await sb
          .from("verified_users")
          .select("roblox_username")
          .eq("user_id", target_user_id)
          .maybeSingle();

        // Cancel any existing pending request first
        await sb.from("account_removal_requests")
          .delete()
          .eq("target_user_id", target_user_id)
          .eq("status", "pending");

        const { data: ins, error } = await sb
          .from("account_removal_requests")
          .insert({
            target_user_id,
            target_username: vu?.roblox_username ?? null,
            requested_by: caller.user.id,
            requested_by_username: caller.staff.roblox_username,
            reason,
            status: "pending",
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        await audit(caller, "request_account_removal", "user", target_user_id, { username: vu?.roblox_username, reason });
        return json({ request: ins });
      }

      case "delete_user": {
        if (!caller.has("delete_users")) return json({ error: "forbidden" }, 403);
        const target_user_id = String(body.user_id || "");
        if (!target_user_id) return json({ error: "missing_user_id" }, 400);
        if (target_user_id === caller.user.id) return json({ error: "cannot_delete_self" }, 400);

        // Cascade-ish cleanup
        await sb.from("workspaces").delete().eq("owner_id", target_user_id);
        await sb.from("workspace_members").delete().eq("user_id", target_user_id);
        await sb.from("support_messages").delete().eq("user_id", target_user_id);
        await sb.from("support_tickets").delete().eq("user_id", target_user_id);
        await sb.from("feedback_messages").delete().eq("user_id", target_user_id);
        await sb.from("feedback_tickets").delete().eq("user_id", target_user_id);
        await sb.from("user_preferences").delete().eq("user_id", target_user_id);
        await sb.from("verified_users").delete().eq("user_id", target_user_id);
        await sb.from("account_removal_requests").delete().eq("target_user_id", target_user_id);

        const { error } = await sb.auth.admin.deleteUser(target_user_id);
        await audit(caller, "delete_user", "user", target_user_id, { auth_error: error?.message });
        return json({ ok: !error, error: error?.message });
      }

      case "list_workspaces": {
        if (!caller.isOwnerAdmin && !caller.has("delete_workspaces")) return json({ error: "forbidden" }, 403);
        const q = String(body.query || "").trim();
        let qb = sb.from("workspaces").select("id, name, owner_id, premium, premium_until, created_at, closed_at, closed_reason").order("created_at", { ascending: false }).limit(50);
        if (q) qb = qb.ilike("name", `%${q}%`);
        const { data } = await qb;
        return json({ workspaces: data || [] });
      }

      case "delete_workspace": {
        if (!caller.has("delete_workspaces")) return json({ error: "forbidden" }, 403);
        const id = String(body.workspace_id || "");
        await sb.from("workspaces").delete().eq("id", id);
        await audit(caller, "delete_workspace", "workspace", id);
        return json({ ok: true });
      }

      case "close_workspace": {
        if (!caller.has("delete_workspaces")) return json({ error: "forbidden" }, 403);
        const id = String(body.workspace_id || "");
        const reason = String(body.reason || "").trim() || "Closed by Fluxcore staff";
        await sb.from("workspaces").update({ closed_at: new Date().toISOString(), closed_reason: reason }).eq("id", id);
        await audit(caller, "close_workspace", "workspace", id, { reason });
        return json({ ok: true });
      }

      case "reopen_workspace": {
        if (!caller.has("delete_workspaces")) return json({ error: "forbidden" }, 403);
        const id = String(body.workspace_id || "");
        await sb.from("workspaces").update({ closed_at: null, closed_reason: null }).eq("id", id);
        await audit(caller, "reopen_workspace", "workspace", id);
        return json({ ok: true });
      }

      case "list_chats": {
        // Lists Fluxcore Wall announcements for moderation; empty workspace_id = all
        if (!caller.has("moderate_chats")) return json({ error: "forbidden" }, 403);
        const workspace_id = String(body.workspace_id || "");
        let qb = sb
          .from("announcements")
          .select("id, title, content, author_name, pinned, created_at, workspace_id")
          .order("created_at", { ascending: false })
          .limit(200);
        if (workspace_id) qb = qb.eq("workspace_id", workspace_id);
        const { data } = await qb;
        const events = data || [];
        const ids = Array.from(new Set(events.map((e: any) => e.workspace_id).filter(Boolean)));
        let nameMap: Record<string, string> = {};
        if (ids.length) {
          const { data: ws } = await sb.from("workspaces").select("id, name").in("id", ids);
          nameMap = Object.fromEntries((ws || []).map((w: any) => [w.id, w.name]));
        }
        return json({ events: events.map((e: any) => ({ ...e, workspace_name: nameMap[e.workspace_id] || null })) });
      }

      case "list_chat_workspaces": {
        if (!caller.has("moderate_chats")) return json({ error: "forbidden" }, 403);
        const q = String(body.query || "").trim();
        let qb = sb.from("workspaces").select("id, name").order("name").limit(200);
        if (q) qb = qb.ilike("name", `%${q}%`);
        const { data } = await qb;
        return json({ workspaces: data || [] });
      }

      case "delete_chat": {
        if (!caller.has("moderate_chats")) return json({ error: "forbidden" }, 403);
        const id = String(body.event_id || "");
        await sb.from("announcements").delete().eq("id", id);
        await audit(caller, "delete_announcement", "announcement", id);
        return json({ ok: true });
      }

      case "support_reply": {
        if (!caller.has("support_reply")) return json({ error: "forbidden" }, 403);
        const ticket_id = String(body.ticket_id || "");
        const content = String(body.content || "").trim();
        if (!ticket_id || !content) return json({ error: "missing_fields" }, 400);
        const { data, error } = await sb.from("support_messages").insert({
          ticket_id,
          user_id: caller.user.id,
          roblox_username: caller.staff.roblox_username,
          content,
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        await sb.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticket_id);
        await audit(caller, "support_reply", "support_ticket", ticket_id);
        return json({ message: data });
      }

      case "support_update": {
        if (!caller.has("support_reply") && !caller.has("support_assign")) return json({ error: "forbidden" }, 403);
        const ticket_id = String(body.ticket_id || "");
        const updates: any = {};
        if (body.status) updates.status = String(body.status);
        if (body.assigned_to !== undefined && caller.has("support_assign")) updates.assigned_to = body.assigned_to ? String(body.assigned_to) : null;
        if (!Object.keys(updates).length) return json({ error: "no_updates" }, 400);
        updates.updated_at = new Date().toISOString();
        const { error } = await sb.from("support_tickets").update(updates).eq("id", ticket_id);
        if (error) return json({ error: error.message }, 400);
        await audit(caller, "support_update", "support_ticket", ticket_id, updates);
        return json({ ok: true });
      }

      case "list_blacklist": {
        if (!caller.has("manage_blacklist")) return json({ error: "forbidden" }, 403);
        const q = String(body.query || "").trim();
        let qb = sb
          .from("fluxcore_blacklist")
          .select("id, roblox_user_id, roblox_username, reason, blacklisted_by_username, created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (q) qb = qb.or(`roblox_username.ilike.%${q}%,roblox_user_id.eq.${/^\d+$/.test(q) ? q : 0}`);
        const { data } = await qb;
        return json({ entries: data || [] });
      }

      case "add_blacklist": {
        if (!caller.has("manage_blacklist")) return json({ error: "forbidden" }, 403);
        const username = String(body.roblox_username || "").trim();
        const reason = String(body.reason || "").trim() || null;
        if (!username) return json({ error: "missing_username" }, 400);
        const { data: vu } = await sb
          .from("verified_users")
          .select("roblox_user_id, roblox_username")
          .ilike("roblox_username", username)
          .maybeSingle();
        if (!vu) return json({ error: "user_not_verified" }, 404);
        const { data: ins, error } = await sb
          .from("fluxcore_blacklist")
          .insert({
            roblox_user_id: vu.roblox_user_id,
            roblox_username: vu.roblox_username,
            reason,
            blacklisted_by: caller.user.id,
            blacklisted_by_username: caller.staff.roblox_username,
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        await audit(caller, "add_blacklist", "fluxcore_blacklist", ins.id, { username: vu.roblox_username, reason });
        return json({ entry: ins });
      }

      case "remove_blacklist": {
        if (!caller.has("manage_blacklist")) return json({ error: "forbidden" }, 403);
        const id = String(body.entry_id || "");
        const { data: prev } = await sb.from("fluxcore_blacklist").select("roblox_username").eq("id", id).maybeSingle();
        await sb.from("fluxcore_blacklist").delete().eq("id", id);
        await audit(caller, "remove_blacklist", "fluxcore_blacklist", id, { username: prev?.roblox_username });
        return json({ ok: true });
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e: any) {
    console.error("staff-actions error", e);
    return json({ error: e.message || String(e) }, 500);
  }
});
