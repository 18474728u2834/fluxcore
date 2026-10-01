import { type ReactNode } from "react";
import { ShellV3 } from "@/bargains/ShellV3";

/** Nexus 4.0 keeps the proven Nexus 3.0 workspace shell while beta testing
 * improvements to the dashboard and content hierarchy. */
export function ShellV4({ children }: { children: ReactNode }) {
  return <ShellV3 versionLabel="Nexus 4.0 Beta">{children}</ShellV3>;
}