---
name: Status Page & Site Banners
description: Public status.fluxcore.works page, BetterStack-style components/incidents/maintenance, automated 5-min pings + manual incidents, site-wide banners, manage_status permission
type: feature
---
- Public status page lives at `status.fluxcore.works` and `/status` on the main site. Subdomain detected in `src/App.tsx` (isStatusHost) — routes directly to `src/pages/Status.tsx`.
- Tables: `status_components`, `status_checks`, `status_incidents`, `status_incident_components`, `status_incident_updates`, `status_maintenance`, `site_banners`. All publicly readable, writes gated by `has_staff_permission('manage_status')`.
- Uptime % combines automated checks (`status_checks`) and posted incidents — 90-day rolling window with daily bars.
- Edge function `status-pinger` is cron-scheduled every 5 min via pg_cron (`status-pinger-5min`); fetches each component's `check_url` and records up/down + latency.
- Admin UI: `src/pages/admin/StatusAdminTab.tsx` (Components / Incidents / Maintenance / Banners tabs) — visible only with `manage_status` permission.
- Site banner: `src/components/SiteBanner.tsx` reads `site_banners` filtered by placement (`marketing` | `workspaces` | `all`). Rendered on `Index.tsx` (marketing) and `Workspaces.tsx` (selector). Dismissals stored in localStorage.
- Status subdomain must be attached to the Vercel project manually (no auto-attach in code path).
