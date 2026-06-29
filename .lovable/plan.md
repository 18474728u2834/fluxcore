Build two new features in one slice: a full Application Forms module and a rank-locked Discord slash-command bot.

## 1) Application Forms

**Tables**
- `application_forms` — workspace_id, slug, title, description, role_id (target role), is_open, auto_rank_on_accept, notify_webhook, min_account_age_days, require_group_member, scoring_rules jsonb, created_by, timestamps.
- `application_form_questions` — form_id, label, type (`short_text` | `long_text` | `choice` | `roblox_username` | `age` | `timezone`), options jsonb, required, position.
- `applications` — form_id, workspace_id, roblox_user_id, roblox_username, answers jsonb, auto_score int, status (`pending`|`accepted`|`denied`), reviewer_id, review_note, created_at, reviewed_at.

All tables: GRANT to authenticated + service_role, RLS:
- Forms/questions: owners and members with `manage_applications` permission can write; public can read forms where `is_open = true` via a SECURITY DEFINER RPC `get_public_form(slug, workspace_slug)` so applicants don't need workspace access.
- Applications: insert via SECURITY DEFINER RPC `submit_application` (verifies Roblox identity through existing `verified_users` row); read/update restricted to workspace owners + `manage_applications` permission.

**Frontend**
- `/applications` — list, create/edit form (question builder, drag to reorder), toggle open/closed, copy public link.
- `/applications/:formId/queue` — reviewer queue with filters, score column, accept/deny actions. Accept calls existing `roblox-rank` edge function when `auto_rank_on_accept` is on. Both actions fire optional Discord webhook.
- `/apply/:workspaceSlug/:formSlug` — public page. Reuses Roblox emoji-verify flow, then renders questions, submits via RPC. Confirmation screen with reference ID.
- Add "Applications" entry to Classic sidebar and Nexus shell (gated on `manage_applications` permission).
- Add `manage_applications` to the default permission set.

## 2) Discord Slash Commands (rank-locked via `/verify`)

**New edge function `discord-bot`** — single Cloudflare-Worker-style HTTPS endpoint that Discord posts interactions to. Verifies Ed25519 signatures with `DISCORD_PUBLIC_KEY`. Routes:
- `/verify` → creates a row in `discord_command_sessions` with a 10-char random token, replies (ephemeral) with `https://fluxcore.works/discord/verification/<token>`. That page asks the user to sign in to Fluxcore (Roblox OAuth) and then binds their Discord ID to their Fluxcore user. The link is single-use and 15-minute TTL; only the Discord user who ran `/verify` sees it (ephemeral reply).
- `/promote <user>`, `/demote <user>` → look up caller's Fluxcore identity via Discord ID; require workspace `promote_members` permission; call existing `roblox-rank` function; reply ephemerally with result. If unverified or unauthorized, the command is silently declined ("You don't have permission to run this command in <workspace>.").
- `/warn <user> <reason>` → requires `manage_members`; writes to `member_logs`.
- `/lookup <user>` → returns member profile snapshot (rank, warnings, quota progress, last session).
- `/loa <start> <end> <reason>` → submits an LOA request as the caller.
- `/quota` → caller's current quota progress.

**Tables**
- `discord_links` — discord_user_id, user_id, workspace_id, created_at, unique(discord_user_id, workspace_id). Authenticated user can read their own row; inserts go through `bind_discord_account(_token)` SECURITY DEFINER RPC after Roblox verification.
- `discord_command_sessions` — token, discord_user_id, discord_username, guild_id, workspace_id (resolved from guild), expires_at, consumed_at. No direct reads — populated by the bot, consumed by the verification page RPC.
- `workspace_discord_guilds` — workspace_id, guild_id, installed_by, created_at. Used to map a guild to a workspace.

**Frontend**
- `/discord/verification/:token` — page that requires Roblox auth, calls `bind_discord_account` RPC, shows success + which workspace+permissions the Discord account now inherits.
- Settings → Integrations: "Discord Bot" card with a one-click invite URL (preconfigured client ID + scopes `applications.commands bot`) and a status row showing the linked guild.
- Admin → Audit log: every slash command writes to `staff_audit_log` for traceability.

**Secrets needed (request via add_secret):** `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`.

**Edge functions deployed**
- `discord-bot` (interactions endpoint, `verify_jwt = false`, signature verification in code).
- `discord-register-commands` (one-shot helper to register the slash commands with Discord).

## Order of work
1. Migration for application + discord tables, RPCs, permissions.
2. Edge functions: `discord-bot`, `discord-register-commands`. Request the three Discord secrets.
3. Application Forms pages (builder, queue, public apply).
4. Discord verification page + Settings integration card.
5. Wire navigation entries in Classic + Nexus.

## Out of scope (call out, don't build)
- Auto-scoring beyond simple keyword/account-age rules.
- Multi-workspace Discord bot per-guild quotas (one guild → one workspace mapping for v1).
- /session command (not selected).
