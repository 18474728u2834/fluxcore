## New Workspace Features

Three additions based on your answers.

---

### 1. Workspace Announcements

A dashboard banner + dedicated `/announcements` page where owners (and members with `post_wall` permission) can post updates that every staff member sees on login.

- New **Announcements** sidebar item.
- Pinned announcements show as a dismissible banner at the top of the dashboard.
- Markdown-style formatting (bold, links, lists).
- Author name + avatar + timestamp.
- Per-user dismiss state so the same person isn't nagged twice.
- No Discord ping (per your answer) — purely in-app.

The `announcements` table already exists, so no schema changes are needed for the core feature. We'll just add a `dismissed_announcements` table to track per-user read state.

---

### 2. Configurable Staff Leaderboards

A `/leaderboard` page inside each workspace. The owner picks **which categories appear** in workspace settings; if zero are enabled, the page is hidden.

- Available categories (owner toggles each on/off):
  - Time in-game (this week / month / all-time)
  - Sessions hosted
  - Messages sent
  - Quotas met (streak)
- Time-range tabs (Week / Month / All-time) within whichever categories are enabled.
- Top 3 get podium styling; rest is a clean ranked list with avatars.
- Visible to **all members** — no Premium gate.

---

### 3. Bulk Member Actions

Checkboxes on the Members page with a sticky action bar when 1+ rows are selected.

- **Select all** / **Select filtered** / individual checkboxes.
- Actions in the bar: **Promote**, **Demote**, **Assign role**, **Send warning**, **Remove from workspace**.
- Confirmation dialog showing the affected member count before any destructive action.
- Respects existing per-action permissions — buttons grey out if the actor lacks permission for that action across all selected members.
- Each bulk operation writes one `member_logs` entry per affected member so the audit trail stays intact.

---

### Technical Notes

**Database (one migration):**
- `dismissed_announcements` table: `user_id`, `announcement_id`, `dismissed_at`. RLS so users only see/insert their own rows.
- `workspaces.leaderboard_categories` — `jsonb` array, default `["time_in_game","sessions_hosted"]`. Empty array = leaderboard hidden.

**Frontend:**
- `src/pages/Announcements.tsx`, `src/components/AnnouncementBanner.tsx` (mounted in `DashboardLayout`).
- `src/pages/Leaderboard.tsx` using existing `activity_sessions` + `scheduled_sessions` aggregates.
- Extend `src/pages/Members.tsx` (and `src/bargains/Members.tsx`) with a `useBulkSelection` hook and a `BulkActionBar` component.
- Settings page gains a "Leaderboard" section with category toggles.

**No edge functions needed** — all aggregations are simple `supabase.from(...).select(...)` with RLS already in place. Bulk actions reuse the existing single-member RPCs in a `Promise.all` loop with client-side rate-limiting.
