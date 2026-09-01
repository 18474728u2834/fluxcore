/**
 * Nexus UI 3.0 is now in open beta — every workspace can switch to it from
 * Theme settings. The old invite-only trial gate is kept as a no-op so the
 * rest of the app keeps its existing call signature.
 */
export function useNexusV3Trial(_workspaceId?: string) {
  return { enabled: true, loading: false };
}
