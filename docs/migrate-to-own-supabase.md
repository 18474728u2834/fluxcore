# Migrating Fluxcore off Lovable Cloud to your own Supabase project

Everything moves: schema, table data, auth users, storage objects, edge functions, cron
jobs and secrets. Plan for a 15–30 minute maintenance window.

The repo already contains everything needed to rebuild the backend:

- `supabase/migrations/` — 96 migration files, the full schema in order
- `supabase/functions/` — 39 edge functions
- `supabase/config.toml` — per-function `verify_jwt` settings

---

## 0. Prerequisites (on your own machine, not in Lovable)

```bash
npm i -g supabase
supabase --version        # needs >= 2.x
psql --version            # Postgres 15+ client (pg_dump must match the server major)
```

Collect from the **source** (Lovable Cloud) project and the **target** (your own) project:

| Value | Source | Target |
|---|---|---|
| Project ref | `zulnuayumxsdbivigvfe` | `<your-ref>` |
| DB connection string | from Lovable → Cloud → Advanced settings | Supabase Dashboard → Settings → Database |
| Service role key | not exposed on Lovable Cloud | Dashboard → Settings → API |

> The Lovable Cloud service role key and DB password are not retrievable from inside
> Lovable. Use **Cloud → Advanced settings → Export data** to get the source dump; that
> page is the supported export path.

---

## 1. Freeze writes

1. In the Lovable admin panel, put Fluxcore into maintenance (`SiteBanner` + workspace
   close) so no new rows land mid-copy.
2. Pause the scheduled jobs so crons don't fire during the copy:
   `subdomain-sweeper`, `cron-sync-staff`, `quota-auto-check`, `status-pinger`,
   `security-breach-scan`, `process-email-queue`.

## 2. Export from Lovable Cloud

Use **Lovable → Cloud → Advanced settings → Export data**. That produces the
role/schema/data dump set. If you instead have the source DB connection string, the
equivalent is:

```bash
export SRC="postgresql://postgres:<pw>@db.zulnuayumxsdbivigvfe.supabase.co:5432/postgres"

pg_dump "$SRC" --schema=public --schema=storage --no-owner --no-privileges \
  --exclude-table-data='storage.objects' -Fc -f fluxcore_public.dump

# auth users (roles/passwords/identities)
pg_dump "$SRC" --schema=auth --no-owner --no-privileges -Fc -f fluxcore_auth.dump
```

## 3. Rebuild the schema on the target

Two options — pick **A** if you want a clean, reviewable rebuild (recommended), **B** for
a byte-identical copy.

**A. Replay the repo migrations**

```bash
supabase link --project-ref <your-ref>
supabase db push          # runs all 96 files in supabase/migrations in order
```

Then enable the extensions the app relies on (`pgcrypto`, `pg_cron`, `pg_net`, `pgmq`,
`supabase_vault`) in Dashboard → Database → Extensions before pushing, since several
migrations reference them.

**B. Restore the dump**

```bash
export DST="postgresql://postgres:<pw>@db.<your-ref>.supabase.co:5432/postgres"
pg_restore -d "$DST" --no-owner --no-privileges --clean --if-exists fluxcore_public.dump
```

## 4. Move auth users

```bash
pg_restore -d "$DST" --no-owner --no-privileges --data-only \
  --table=auth.users --table=auth.identities --table=auth.refresh_tokens \
  fluxcore_auth.dump
```

User UUIDs are preserved, so every `user_id` foreign key in `workspaces`,
`workspace_members`, `verified_users`, etc. keeps pointing at the right person and nobody
has to re-verify their Roblox account.

## 5. Move table data

If you rebuilt with migrations (option A), load data only:

```bash
pg_restore -d "$DST" --no-owner --no-privileges --data-only --disable-triggers \
  fluxcore_public.dump
```

`--disable-triggers` matters: `verified_users_link_members` and the `updated_at` triggers
would otherwise fire during the bulk load.

## 6. Move storage

```bash
supabase storage ls --experimental --project-ref zulnuayumxsdbivigvfe
supabase storage cp --experimental -r ss:///<bucket> ./storage-backup/<bucket>
supabase storage cp --experimental -r ./storage-backup/<bucket> ss:///<bucket> \
  --project-ref <your-ref>
```

Recreate each bucket on the target with the same name and public/private flag first.

## 7. Deploy edge functions

```bash
supabase functions deploy --project-ref <your-ref>
```

`supabase/config.toml` carries the per-function `verify_jwt` values, so the auth posture
comes across unchanged.

## 8. Set secrets on the target

These must exist or functions will 500:

```
LOVABLE_API_KEY          DISCORD_APPLICATION_ID   DISCORD_BOT_TOKEN
DISCORD_CLIENT_ID        DISCORD_CLIENT_SECRET    DISCORD_PUBLIC_KEY
ROBLOX_CLIENT_ID         ROBLOX_CLIENT_SECRET
VERCEL_API_TOKEN         VERCEL_PROJECT_ID        VERCEL_TEAM_ID
```

```bash
supabase secrets set --project-ref <your-ref> --env-file ./fluxcore.env
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically — do not set them yourself.

Then re-seed the vault key used by `pg_cron` to call functions:

```bash
curl -X POST https://<your-ref>.supabase.co/functions/v1/bootstrap-vault \
  -H "Authorization: Bearer <target-service-role-key>"
```

## 9. Re-point the crons

The scheduled jobs live in `cron.job` and hardcode the project URL. After restore:

```sql
select jobid, jobname, schedule, command from cron.job;
```

Rewrite each `cron_invoke_edge(...)` target host from `zulnuayumxsdbivigvfe.supabase.co`
to `<your-ref>.supabase.co`, then re-enable them.

## 10. Re-configure auth providers

In the target Dashboard → Authentication:

- **URL configuration**: site URL `https://fluxcore.works`, plus redirect allow-list
  entries for `https://*.fluxcore.works/**` (partner subdomains) and
  `http://localhost:8080/**`.
- **Providers**: re-add Discord with the same client ID/secret.
- **Protection**: re-enable leaked-password protection (HIBP).
- Roblox OAuth is custom (`roblox-oauth-callback`), so update the redirect URI registered
  in the Roblox Creator Dashboard to the new function URL if you are not fronting it with
  `fluxcore.works`.

## 11. Switch the app over

In Lovable: **Project settings → Integrations → Supabase → Connect**, pointing at your
project. That rewrites `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`) and regenerates
`src/integrations/supabase/types.ts`. No application code changes are needed — every call
site already goes through `@/integrations/supabase/client`.

If you deploy through Vercel, update the same three env vars there and redeploy.

## 12. Verify, then unfreeze

- Sign in with Roblox on `fluxcore.works` and on a partner subdomain.
- Open a workspace: members, roles, sessions, quotas, activity all load.
- Confirm encrypted columns decrypt (API keys page in Settings) — `pgcrypto` must be in
  the same schema as on the source, or the qualified `extensions.pgp_sym_*` calls fail.
- Fire a Discord slash command and dispatch a test crew DM.
- Submit an application through `/apply` and through the Roblox application centre.
- Watch edge function logs for 500s for ~15 minutes, then lift maintenance.

## Rollback

Keep the Lovable Cloud project untouched (do not delete it) for at least a week. Rolling
back is reconnecting the old project in Lovable settings and reverting the Vercel env
vars.
