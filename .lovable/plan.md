# Staff Dashboard Plan

A new `/staff` area where Novavoff is the **Owner Admin** and can appoint other staff members with granular permissions. Built on top of the existing `is_fluxcore_staff()` model but extended to support multiple admins with per-feature permissions.

## 1. Database

New tables:
- **`staff_admins`** — `user_id`, `roblox_username`, `role` ('owner_admin' | 'admin'), `added_by`, `created_at`. Owner Admin is seeded as Novavoff.
- **`staff_permissions`** — `admin_id` (FK staff_admins), `permission` text. Permissions: `manage_admins`, `create_premium_grants`, `claim_premium_self`, `support_reply`, `support_assign`, `export_user_data`, `delete_users`, `delete_workspaces`, `moderate_chats`.
- **`staff_audit_log`** — `admin_id`, `action`, `target_type`, `target_id`, `details` jsonb, `created_at`. Records every privileged action.
- **`data_export_requests`** — `user_id`, `requested_by`, `status`, `download_url`, `created_at`, `completed_at`. For GDPR exports.

New SECURITY DEFINER functions:
- `is_staff_admin()` → bool (replaces direct username check, but keeps Novavoff as fallback owner_admin)
- `is_staff_owner_admin()` → bool
- `has_staff_permission(_perm text)` → bool (owner_admin has all)

Update `is_fluxcore_staff()` to also return true for any row in `staff_admins` so existing RLS keeps working.

RLS:
- `staff_admins` — view: all staff_admins; manage: owner_admin only.
- `staff_permissions` — view: all staff; manage: owner_admin only.
- `staff_audit_log` — view: all staff; insert: any staff via SECURITY DEFINER.
- `data_export_requests` — view/manage: staff with `export_user_data`.

Add policies for staff to **delete** workspaces, members, activity_events (chat moderation).

## 2. Edge functions

- **`staff-export-user-data`** — given a `user_id`, gathers all rows across tables (verified_users, workspaces owned, memberships, sessions, tickets, messages, etc.) and returns a JSON bundle. Logs to audit + data_export_requests.
- **`staff-delete-user`** — fully removes a user's data (workspaces they own, memberships, sessions, tickets) then deletes auth user via service role. Audit logged.
- **`staff-delete-workspace`** — cascades workspace deletion. Audit logged.
- **`staff-moderate-chat`** — delete activity_events rows of `event_type = 'chat'` by id. Audit logged.
- **`staff-grant-self-premium`** — for staff with `claim_premium_self`, applies premium days to a chosen workspace they own.

All check `has_staff_permission` server-side via service role + verifying the calling user.

## 3. Frontend (`/staff` route)

Layout: sidebar with sections, gated per permission.

Sections:
1. **Overview** — count of staff, open tickets, recent audit log entries.
2. **Admins** (owner_admin only) — list staff_admins, add by Roblox username, edit per-admin permissions checklist, remove. Owner Admin row is locked.
3. **Premium Grants** — existing grant manager moved here; create links, view claims; "Grant to my workspace" button (if `claim_premium_self`).
4. **Support** — list all `support_tickets`, open ticket → reply, assign to another admin, change status. Reuses existing `support_messages`.
5. **User Data (GDPR)** — search by Roblox username/user_id → view summary → buttons: **Export data** (downloads JSON), **Delete account**.
6. **Workspaces** — search workspaces → view → **Delete workspace**.
7. **Chat Moderation** — pick workspace → list recent chat events → delete individual messages.
8. **Audit Log** — paginated view of staff_audit_log.

Access: Route guarded by `is_staff_admin()`. Non-staff get 404.

## 4. Seeding

Migration inserts Novavoff as `owner_admin` (look up via verified_users by `lower(roblox_username)='novavoff'`). All permissions implicit for owner_admin.

## 5. Out of scope

- No UI changes outside `/staff`.
- Existing `/support` page for end users keeps working unchanged.
- No new auth providers.

---

After you approve, I'll run the migration first, then build the edge functions and the `/staff` UI.
