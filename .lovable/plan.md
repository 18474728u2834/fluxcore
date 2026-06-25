# Roblox Integrations & Tools — Visual Refresh Roadmap

Four focused refresh slices. Each one keeps existing logic untouched and only modernizes the UI/UX of a Roblox-facing surface. Everything stays inside the existing dark + cyan + Outfit theme, glassmorphism, and uses semantic tokens (no hardcoded colors).

## 1. Ranks & Roles Command Center
Refresh `src/pages/Ranks.tsx` and `src/pages/Roles.tsx` into a single visual language.

- New header strip showing connected Roblox group: group icon, member count, last sync time, "Sync now" pill.
- Roles as a vertical rank ladder (highest at top) with rank number, color dot, member count, and quick actions on hover.
- Drag handle styling refresh (still uses existing reorder logic).
- Empty / "no group connected" state becomes a single illustrated card with one clear CTA.

## 2. Integrations Hub
Promote integrations out of Settings into a dedicated `/integrations` index page (visual layer only — reuses existing setting cards under the hood).

- Bento grid of integration tiles: Roblox Open Cloud, RankGun, Discord webhooks, Quota webhook, Lua tracker, In-game module.
- Each tile: logo, one-line status ("Connected as X", "Not connected", "Key set 3d ago"), subtle status dot, click → opens the existing Settings panel.
- Top filter chips: All / Connected / Needs setup.
- Settings page keeps working; this is a friendlier entry point.

## 3. Member Profile Roblox Panel
Refresh the Roblox-related section of `src/pages/MemberProfile.tsx`.

- New "Roblox" card: large avatar headshot, username + display name, current group rank as a chip, join date, last in-game seen.
- Quick-action row: Promote / Demote / Open on Roblox / Copy ID — styled as ghost buttons with icon + label.
- Inline rank history timeline (uses existing logbook data) with promotion ↑ / demotion ↓ icons and color accents.
- No backend changes; uses the data already loaded.

## 4. Lua Tracker / Setup Tracking Refresh
Refresh the in-Settings "Tracking & Scripts" category visuals.

- Stepper layout: 1) Generate API key, 2) Paste Lua script, 3) Enable in-game, 4) Verify.
- API key field becomes a monospace masked pill with copy + rotate buttons and a "last used" timestamp.
- Script block gets a faux-editor chrome (tab bar with `tracker.lua`, line numbers, copy button) — purely cosmetic, content unchanged.
- Status indicator: green pulse if a heartbeat has been received in the last 5 min, amber otherwise.

## Technical Details

- Files touched (UI only):
  - `src/pages/Ranks.tsx`, `src/pages/Roles.tsx`
  - `src/pages/Settings.tsx` (Tracking & Scripts category + Integrations entries)
  - New `src/pages/Integrations.tsx` + route in `src/App.tsx`
  - Nav entry in `src/components/AppSidebar.tsx` and `src/bargains/Shell.tsx`
  - `src/pages/MemberProfile.tsx` (Roblox card section only)
- Reuses existing hooks, RPCs, and edge functions — no schema, no policy, no edge-function changes.
- All styling via existing semantic tokens in `index.css` / `tailwind.config.ts`; new tokens only if needed for status dots, added centrally.
- Motion via existing `framer-motion`; small entrance + hover transitions only.

## Out of scope
- No new Roblox API calls or webhook types.
- No changes to ranking logic, RankGun flow, or Open Cloud auth.
- No copy/legal/footer changes.

## Build order
1 → 2 → 3 → 4, each shippable independently. Want me to start with all four, or pick a subset?
