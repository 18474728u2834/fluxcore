## Goal

A department behaves like a mini-workspace nested inside its parent. When you're in the main workspace view, everything looks unchanged (all members, all sessions, etc.). When you switch into a department, every page is scoped to that department only.

## Data model (one migration)

Add an optional `department_id uuid references departments(id) on delete cascade` column to:
- `scheduled_sessions`
- `workspace_quotas`
- `announcements`
- `workspace_documents`
- `loa_requests`
- `workspace_roles`
- `member_logs`

Rules:
- NULL = belongs to the parent workspace (visible in main view only).
- Set = belongs to that department (visible only inside the department).
- All existing rows stay NULL (no data migration needed).

New columns on `departments`:
- `description text`
- `hero_image_url text`
- `primary_color text` (already exists)

New `department_leads` table:
- `department_id`, `member_id` (workspace member), unique together.
- A lead can manage that department (settings, members, roles, sessions, quotas, docs, LOA, announcements) without being workspace owner.

New security definer functions:
- `is_department_lead(_department_id uuid)` → bool
- `can_manage_department(_department_id uuid)` → owner OR lead

RLS for every table that gained `department_id`:
- Read: workspace member AND (`department_id IS NULL` OR `is_department_member(department_id)` OR owner).
- Write: existing rule OR `can_manage_department(department_id)`.

## Workspace switcher

`get_accessible_workspaces()` extended to also return rows for each department the user belongs to, tagged with `kind = 'department'`, `parent_workspace_id`, `department_id`. The top-level workspace dropdown (Shell.tsx + classic Sidebar) shows them indented under their parent workspace.

Selecting a department sets a context value `activeDepartmentId` (stored in `useWorkspace` alongside `workspaceId`). URL pattern: `/workspace/<id>/d/<slug>/...` for bargains, `/d/<slug>/...` style for classic. A `DepartmentContext` provides `{ id, slug, name, isLead, isMember }`.

## Page scoping (single rule for every page)

Every list query reads `useDepartment()`:
- `activeDepartmentId == null` → query unchanged (main workspace view).
- `activeDepartmentId != null` → add `.eq("department_id", activeDepartmentId)` AND restrict member-derived lists (Members, Leaderboard, MemberProfile picker) to `department_members` of that dept.

Pages touched: Sessions, Quotas, Wall/Announcements, Documents, LOA, Roles, Members, Leaderboard, MemberProfile, MessageLogs (filter by dept members), Activity stats.

Create flows (new session, new quota, new doc, new role, post announcement) auto-stamp `department_id = activeDepartmentId`.

## Department settings

Inside a department, a Settings page lets leads/owner edit: name, description, hero image, primary color, member list (pick from workspace members), leads list. The existing `Departments` page in the parent workspace still lists/creates/deletes departments (owner only).

## Permissions

- Workspace owner: full control everywhere.
- Department lead: full control inside their department only; in the main view they have only their normal workspace permissions.
- Department member: read-only inside the department unless they also hold a workspace permission like `manage_sessions` (those permissions also apply inside the dept).

## Technical notes

- One migration adds columns + `department_leads` + functions + updated RLS + updated `get_accessible_workspaces`.
- A new `useDepartment()` hook + `DepartmentProvider` mounted by the `/d/:slug` route layout.
- A small helper `withDept(query, deptId)` keeps page code tidy.
- `quota-auto-check` edge function updated to evaluate quotas per dept (members = `department_members` when `department_id` is set).
- Classic and bargains shells both updated; no visual redesign — same components, scoped data.

## Out of scope

- Per-department branding beyond color/hero image.
- Cross-department analytics rollups.
- Separate billing / premium per department.
