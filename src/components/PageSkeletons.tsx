import { useLocation } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  members: "Members",
  activity: "Activity",
  sessions: "Sessions",
  wall: "Wall",
  documents: "Documents",
  loa: "LOA",
  staff: "Blacklist",
  roles: "Roles",
  quotas: "Quotas",
  ranks: "Ranks",
  settings: "Settings",
  "setup-tracking": "Setup tracking",
  departments: "Departments",
  "message-logs": "Message logs",
  leaderboard: "Leaderboard",
};

/**
 * Lightweight skeleton that mimics the Nexus/Bargains shell layout so users see
 * the sidebar + page heading immediately instead of a blank spinner while a
 * route chunk is loading.
 */
export function NexusSkeleton() {
  const { pathname } = useLocation();
  const last = pathname.split("/").filter(Boolean).pop() || "dashboard";
  const title = TITLES[last] || last.replace(/-/g, " ").replace(/^./, c => c.toUpperCase());
  const { workspace } = useWorkspace();
  const wsName = workspace?.name || "Workspace";

  return (
    <div className="min-h-screen flex" style={{ background: "#0f0f10", color: "#e5e5e7" }}>
      {/* Sidebar skeleton */}
      <aside className="w-56 shrink-0 border-r p-3 hidden md:flex flex-col gap-2" style={{ borderColor: "#1f1f22", background: "#0a0a0b" }}>
        <div className="h-9 rounded-md mb-2 flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-md animate-pulse" style={{ background: "#1f1f22" }} />
          <div className="h-3 w-24 rounded animate-pulse" style={{ background: "#1f1f22" }} />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-8 rounded-md animate-pulse" style={{ background: "#15151733" }} />
        ))}
      </aside>
      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="h-14 border-b flex items-center px-6" style={{ borderColor: "#1f1f22" }}>
          <div className="h-3 w-32 rounded animate-pulse" style={{ background: "#1f1f22" }} />
        </header>
        <div className="p-8 max-w-6xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-[2.5rem] font-bold tracking-[-0.035em] leading-none" style={{ color: "#e5e5e7" }}>
              {title}
            </h1>
            <p className="text-xs animate-pulse" style={{ color: "#8a8a90" }}>
              Loading {title.toLowerCase()} for {wsName}…
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-md animate-pulse" style={{ background: "#15151b", border: "1px solid #1f1f22" }} />
            ))}
          </div>
          <div className="rounded-md border overflow-hidden" style={{ background: "#15151b", borderColor: "#1f1f22" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5" style={{ borderTop: i === 0 ? "none" : "1px solid #22222a" }}>
                <div className="w-10 h-10 rounded-md animate-pulse" style={{ background: "#1f1f22" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded animate-pulse" style={{ background: "#1f1f22" }} />
                  <div className="h-2 w-24 rounded animate-pulse" style={{ background: "#1a1a1c" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Classic-UI variant — keeps it tonally consistent with the original dashboard. */
export function ClassicSkeleton() {
  const { pathname } = useLocation();
  const last = pathname.split("/").filter(Boolean).pop() || "dashboard";
  const title = TITLES[last] || last.replace(/-/g, " ").replace(/^./, c => c.toUpperCase());
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-60 shrink-0 border-r border-border/40 p-3 hidden md:flex flex-col gap-2">
        <div className="h-10 rounded-md mb-2 bg-secondary/40 animate-pulse" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-8 rounded-md bg-secondary/30 animate-pulse" />
        ))}
      </aside>
      <main className="flex-1 min-w-0 p-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground animate-pulse">Loading {title.toLowerCase()}…</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-secondary/30 border border-border/40 animate-pulse" />
          ))}
        </div>
        <div className="rounded-lg border border-border/40 divide-y divide-border/40 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-10 h-10 rounded-md bg-secondary/40 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 rounded bg-secondary/40 animate-pulse" />
                <div className="h-2 w-24 rounded bg-secondary/30 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
