
## 1. Global search in Nexus UI

Make the header search in `src/bargains/Shell.tsx` a real spotlight search.

- Replace the static `<input>` with a controlled search field that opens a results dropdown when focused or typed in.
- Debounced query (200ms). Results grouped by section:
  - **Members** — query `workspace_members` by `roblox_username` ilike, click → `/w/:id/members/:memberId`
  - **Sessions** — `scheduled_sessions` by title, click → `/w/:id/sessions`
  - **Documents** — `workspace_documents` by title, click → `/w/:id/documents`
  - **Pages** — static list of Nexus pages (Dashboard, Activity, LOA, Quotas, Wall, Roles, Blacklist, Staff, Settings, Setup Tracking)
- Keyboard: ↑/↓ to navigate, Enter to open, Esc to close. `Ctrl/Cmd+K` focuses it.
- All queries scoped to the active `workspaceId`; uses existing RLS (no schema changes).

## 2. Departments as sub-workspaces

Departments are a first-class entity assigned to specific members, with their own subroute and isolated content.

### Schema (migration)

```text
departments
  id uuid pk, workspace_id, name, slug, primary_color, icon, created_at, updated_at
  unique (workspace_id, slug)

department_members
  id uuid pk, department_id, member_id (fk workspace_members), role text default 'member'
  unique (department_id, member_id)
```

Add nullable `department_id uuid` columns to existing tables so a row can be scoped to a department:
- `announcements.department_id`
- `workspace_documents.department_id`
- `scheduled_sessions.department_id`

Helper SQL function `is_department_member(_department_id uuid)` (security definer) used in RLS.

RLS updates so:
- Anyone in the workspace can read rows where `department_id IS NULL` (existing behavior).
- Rows with `department_id` set are only visible to workspace owner + members of that department.

### Routing

- New route `/w/:workspaceId/d/:deptSlug/*` (React Router), rendering the same Nexus shell but with a `DepartmentContext` holding the active department.
- `useWorkspace` exposes optional `activeDepartment`. When set, dashboard/announcements/documents/sessions hooks pass `department_id = activeDepartment.id` for reads and inserts.
- Subdomain `shoply.fluxcore.works/hr` works by mapping the path segment `/hr` to `/w/<resolvedWorkspaceId>/d/hr` in `useWorkspace` partner resolution — no Vercel changes.

### UI

- New "Departments" section in the workspace settings page: create department, set name/slug/color/icon, assign members from the existing roster (multi-select).
- In Nexus sidebar (`Shell.tsx`): below the page nav, a small "Departments" group with one icon per dept the current user belongs to. Clicking switches into that department's subroute.
- A top-bar pill shows `Workspace · HR` when inside a department, with a back-to-main entry in the workspace menu.
- New page `src/bargains/Departments.tsx` (settings sub-page) for managing departments.

## 3. Activity tracker setup inside Nexus UI

Move/expose the setup tracking page inside the Nexus shell.

- New route `/w/:workspaceId/setup-tracking` rendering inside `BargainsShell`.
- Sidebar shows the "Setup Tracking" item **only if** the current user has `manage_settings` workspace permission (uses existing `has_workspace_permission` RPC). Owners always see it.
- Direct navigation to the route also checks the permission and shows a "You don't have access" panel otherwise.

## 4. One-script tracker installer (merge steps 2 & 3)

Rewrite the tracker so a single server script is enough — it programmatically creates the input-beacon LocalScript at runtime.

- Server script (in `ServerScriptService`) builds a `LocalScript` instance with the beacon source, sets it as `StarterPlayer.StarterPlayerScripts` child on init.
- The setup page collapses steps 2 and 3 into a single "Add Server Script" step that just says: paste this one script — it handles the rest. Step 4 ("Test it") stays as the new step 3.
- The `FluxcoreRanking` script section stays as the optional step 4.

## Technical notes

- All new tables include the required public-schema GRANTs (`authenticated`, `service_role`) before RLS + policies.
- New RLS policies use security-definer helpers (`is_workspace_member`, `is_department_member`, `is_workspace_owner`) — no recursion.
- No schema changes are needed for the global search; it relies on existing RLS scoping.
- Subdomain routing for `/hr` is purely client-side path handling; we don't touch `vercel.json`.
- Existing `useUIVersion`, partner portal lookup, and Roblox OAuth flows are untouched.

## Files touched

- New: `supabase/migrations/<ts>_departments.sql`
- New: `src/bargains/Departments.tsx`, `src/bargains/SetupTracking.tsx`
- New: `src/hooks/useDepartment.tsx`, `src/components/GlobalSearch.tsx`
- Edited: `src/bargains/Shell.tsx` (search + dept switcher + tracker nav item)
- Edited: `src/App.tsx` (new routes)
- Edited: `src/hooks/useWorkspace.tsx` (department resolution from `/hr`-style path)
- Edited: `src/pages/SetupTracking.tsx` (merge step 2 & 3, single-script installer)
- Edited: existing dashboard/announcements/docs/sessions hooks to filter by `department_id` when active.
