import { Link } from "react-router-dom";
import { ArrowLeft, Code2, Calendar, Activity, Globe, ArrowRight } from "lucide-react";

const APIS = [
  {
    href: "/api/sessions",
    icon: Calendar,
    name: "Sessions API",
    desc: "Pull live and upcoming scheduled sessions from any workspace. Perfect for in-game session boards.",
    auth: "API key",
    method: "GET",
  },
  {
    href: "/api/activity",
    icon: Activity,
    name: "Activity Tracker API",
    desc: "Send join, leave, chat, and heartbeat events from your Roblox game. Powers the activity dashboard.",
    auth: "API key",
    method: "POST",
  },
  {
    href: "/api/workspaces",
    icon: Globe,
    name: "Public Workspaces",
    desc: "List verified Fluxcore workspaces for marquees, directories, or partner widgets. No auth required.",
    auth: "Public",
    method: "GET",
  },
];

export default function ApiIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Fluxcore
          </Link>
          <div className="text-xs font-mono text-muted-foreground">v1 · Open Source</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <section className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider">
            <Code2 className="w-3 h-3" /> Fluxcore API
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Open APIs</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Free, public endpoints for embedding Fluxcore data into your Roblox game, website, or tools. Pick an API to view docs and examples.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {APIS.map((a) => (
            <Link
              key={a.href}
              to={a.href}
              className="group rounded-xl border border-border bg-card/30 p-5 hover:bg-card/60 hover:border-primary/40 transition-all flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <a.icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">{a.method}</span>
              </div>
              <div className="text-base font-semibold">{a.name}</div>
              <p className="text-sm text-muted-foreground mt-1 flex-1">{a.desc}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{a.auth}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-xl border border-border bg-card/20 p-6 space-y-2">
          <h2 className="text-lg font-semibold">Need an API key?</h2>
          <p className="text-sm text-muted-foreground">
            Open your workspace → <span className="text-foreground font-medium">Settings</span> to grab or rotate your key. Treat it like a password.
          </p>
        </section>
      </main>

      <footer className="border-t border-border/60 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-xs text-muted-foreground flex items-center justify-between">
          <span>© Fluxcore</span>
          <Link to="/" className="hover:text-foreground transition-colors">fluxcore.works</Link>
        </div>
      </footer>
    </div>
  );
}
