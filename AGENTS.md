# Project architecture rules

- Nexus UI versions share existing workspace routes and data hooks; each version changes only shell and presentation so permissions and behavior remain consistent.
- Preview-only Nexus releases use a server-enforced workspace allowlist managed by owner admins, so unavailable versions cannot be activated by client-side changes.
- Keep the database workspace UI default and client configuration fallback aligned so new and unconfigured workspaces use the same standard version.
- Paid upgrades go through Whop: checkout sessions are created server-side with workspace metadata, and only the signed webhook may set workspace Pro flags (clients cannot write them).
