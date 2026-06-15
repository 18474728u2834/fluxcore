---
name: Kudos & Promotion Nominations
description: Community engagement features — kudos shoutouts + peer promotion nomination queue
type: feature
---
**Kudos** (`/kudos`, `src/pages/Kudos.tsx`)
- Workspace members publicly recognise teammates. Stored in `kudos` table.
- Auto "Staff Spotlight" card: top kudos recipient in the last 7 days, computed client-side.
- Anyone in workspace can read/post; sender or owner can delete.

**Promotion Nominations** (`/promotions`, `src/pages/Promotions.tsx`)
- Peer nomination queue. Any member can nominate a teammate with reason + optional suggested rank.
- Stored in `promotion_nominations` with status pending/approved/declined.
- Reviewers = workspace owner OR `promote_members` OR `manage_members` permission. Reviewers see all and can approve/decline.
- Tabs: Pending, Decided, My nominations.

Both pages are wired into Classic sidebar (`AppSidebar.tsx`) and Nexus shell (`bargains/Shell.tsx`) under main nav.
