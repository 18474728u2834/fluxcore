# Project architecture rules

- Nexus UI versions share existing workspace routes and data hooks; each version changes only shell and presentation so permissions and behavior remain consistent.
- Preview-only Nexus releases use a server-enforced workspace allowlist managed by owner admins, so unavailable versions cannot be activated by client-side changes.
- Frontend (login + data) points to the owned standby backend via vite define; why: Lovable Cloud primary is paused and client.ts is auto-generated.

- On the standby (now primary) backend, a trigger on auth.users calls reclaim_legacy_account() to move copied data from old account IDs to the new login by Roblox ID; why: accounts were not migrated.
