# Project architecture rules

- Nexus UI versions share existing workspace routes and data hooks; each version changes only shell and presentation so permissions and behavior remain consistent.
- Preview-only Nexus releases use a server-enforced workspace allowlist managed by owner admins, so unavailable versions cannot be activated by client-side changes.
