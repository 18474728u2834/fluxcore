## Goal

The landing page reads like AI wrote it ("The all-in-one tool to run your Roblox community", "everything your staff team needs — Built for groups that take it seriously", "Stop juggling spreadsheets, Discord bots, and seven open tabs"). Rewrite it in a plainspoken founder voice and restructure to match the chosen "Founder-led hero" prototype. Keep the existing purple-on-dark palette and the existing nav/footer untouched.

## Scope

Only `src/pages/Index.tsx`. No backend, no routing, no nav/footer changes, no palette changes.

## Edits

### 1. Hero
- Replace headline `The all-in-one tool to run your Roblox community.` with:
  **`Managing staff doesn't have to be a mess.`** (second half "have to be a mess." in purple)
- Replace sub: 
  `Running a Roblox group shouldn't mean four hours a night in spreadsheets. Fluxcore handles ranking, activity logs, and quotas so your staff can focus on the game.`
- Keep badge but change to: `Now syncing via Roblox Open Cloud`
- Primary CTA label: `Set up your group` · Secondary: `View the demo`
- Keep the existing dashboard mock component as-is (already strong, matches prototype anchor).

### 2. Trusted-by row
- Keep, no copy change.

### 3. Features section
- Replace section eyebrow/heading/sub with:
  - eyebrow: `What's inside`
  - h2: `Built because nothing else did it right.`
  - sub: `Every feature here exists because I needed it at 2am and Discord bots kept breaking.`
- Keep the existing 12 feature tiles, but rewrite each blurb in first-person/plain voice. Examples:
  - Activity tracking → `Heartbeats every 30 seconds with idle detection. You see exactly who's in-game and for how long — no guessing.`
  - Group ranking → `Promote and demote from the dashboard. Hits the Roblox profile instantly via Open Cloud.`
  - Sessions & shifts → `Schedule trainings and patrols. Staff claim slots themselves and Discord gets pinged automatically.`
  - Policies & signatures → `Write a policy once. Every new member signs it before they can do anything.`
  - Roles & permissions → `Import roles straight from your Roblox group. Lock down who can promote, demote, or warn.`
  - Per-role quotas → `Set weekly session and time targets per rank. Misses show up in the audit feed.`
  - Message logs → `Every staff chat message, searchable. When something happens in-game, you have the receipt.`
  - Leave of absence → `Staff request time off, leadership approves in one click. Their quota pauses automatically.`
  - Staff wall → `Pin announcements your team will actually see. Not buried in the seventh Discord channel.`
  - AI support → `Tickets get triaged by an AI that knows your group's docs. Most never reach a human.`
  - Open Cloud API → `Auto-rank syncs straight to Roblox using your group's API key. No bot accounts, no Selenium hacks.`
  - Discord webhooks → `Session reminders, role changes, alerts — all routed to the channels your team already lives in.`

### 4. Pricing
- Eyebrow: `Pricing`
- h2: `Free forever. Premium when you outgrow it.`
- sub: `No subscriptions. No card on file. Premium is a one-time Robux unlock.`
- Card copy stays the same (Free $0, Premium 400 Robux).

### 5. Final CTA
- h2: `Stop spreadsheeting your group.`
- sub: `Takes about a minute. You'll wonder why you didn't switch sooner.`
- Button label: `Get started — it's free`

## Out of scope
Nav, footer, dashboard mock layout, color tokens, fonts (already Outfit project-wide — leaving as-is since user said keep current look), routing.

## Verification
Take a screenshot after the edit and visually confirm copy reads naturally + composition matches the chosen direction.
