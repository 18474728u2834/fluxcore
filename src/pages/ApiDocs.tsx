import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ArrowLeft, Code2, Key, Zap } from "lucide-react";

const ENDPOINT = "https://fluxcore.works/api/v1/sessions";

const curlExample = `curl -H "x-api-key: YOUR_WORKSPACE_API_KEY" \\
  "${ENDPOINT}?category=all&today=true"`;

const jsExample = `const res = await fetch(
  "${ENDPOINT}?category=all",
  { headers: { "x-api-key": "YOUR_WORKSPACE_API_KEY" } }
);
const { workspace, sessions } = await res.json();
console.log(sessions);`;

const luaExample = `local HttpService = game:GetService("HttpService")

local res = HttpService:RequestAsync({
  Url = "${ENDPOINT}?today=true",
  Method = "GET",
  Headers = { ["x-api-key"] = "YOUR_WORKSPACE_API_KEY" },
})

local data = HttpService:JSONDecode(res.Body)
for _, session in ipairs(data.sessions) do
  print(session.name, session.date, session.host and session.host.username)
end`;

const responseExample = `{
  "workspace": { "id": "uuid", "name": "My Group" },
  "sessions": [
    {
      "id": "uuid",
      "name": "Training Session",
      "date": "2026-05-28T18:00:00.000Z",
      "duration": 60,
      "status": "scheduled",
      "category": "training",
      "host": { "userId": 12345678, "username": "HostUser" },
      "participants": [
        { "userId": 87654321, "username": "CoHost", "role": "co_host" }
      ],
      "type": { "category": "training", "gameId": 1234567890 },
      "description": "Weekly training",
      "slots": [
        {
          "label": "Trainer",
          "count": 2,
          "assigned": [
            { "userId": 12345, "username": "TrainerOne" }
          ]
        }
      ],
      "tags": [
        { "id": "uuid", "name": "Mandatory", "color": "#f55a4a", "category": "general" }
      ],
      "game_url": "https://www.roblox.com/games/1234567890/My-Game",
      "role_labels": null
    }
  ]
}`;

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <div className="absolute top-3 left-4 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{lang}</div>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-2 right-2 h-7 px-2 rounded-md text-[11px] flex items-center gap-1 bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="bg-card/50 border border-border rounded-lg pt-9 pb-4 px-4 text-[12.5px] font-mono text-foreground/90 overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

export default function ApiDocs() {
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

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <section className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider">
            <Code2 className="w-3 h-3" /> Public API
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Fluxcore Sessions API</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Pull live and upcoming sessions from any Fluxcore workspace. Free, open, and meant to be embedded directly into your Roblox game or website.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Zap, title: "Free forever", desc: "No quotas, no billing tier." },
            { icon: Key, title: "API-key auth", desc: "One key per workspace." },
            { icon: Code2, title: "JSON over HTTPS", desc: "Drop-in for Roblox & web." },
          ].map(({ icon: I, title, desc }) => (
            <div key={title} className="rounded-lg border border-border bg-card/30 p-4">
              <I className="w-4 h-4 text-primary mb-2" />
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">Get your API key</h2>
          <p className="text-sm text-muted-foreground">
            Open your workspace → <span className="text-foreground font-medium">Settings</span> → copy the API key. Keep it private — treat it like a password. You can rotate it any time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Endpoint</h2>
          <div className="rounded-lg border border-border bg-card/30 p-4 font-mono text-sm flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-xs font-bold">GET</span>
            <span className="text-foreground break-all">{ENDPOINT}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Authenticate with header <code className="px-1.5 py-0.5 rounded bg-card border border-border text-xs">x-api-key: YOUR_KEY</code> (or <code className="px-1.5 py-0.5 rounded bg-card border border-border text-xs">Authorization: Bearer YOUR_KEY</code>).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">Query parameters</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-card/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Param</th>
                  <th className="text-left px-4 py-2 font-semibold">Default</th>
                  <th className="text-left px-4 py-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">category</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">all</td>
                  <td className="px-4 py-3 text-muted-foreground">Filter by session category (e.g. <code>training</code>, <code>shift</code>).</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">today</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">true</td>
                  <td className="px-4 py-3 text-muted-foreground">When true, only returns occurrences happening today (UTC).</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">Examples</h2>
          <div className="space-y-3">
            <CodeBlock code={curlExample} lang="cURL" />
            <CodeBlock code={luaExample} lang="Roblox Lua" />
            <CodeBlock code={jsExample} lang="JavaScript" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">Response</h2>
          <p className="text-sm text-muted-foreground">
            Sessions are expanded into individual occurrences. Recurring sessions are unrolled to today's occurrence automatically. Roblox user IDs are resolved server-side so you can render avatars instantly.
          </p>
          <CodeBlock code={responseExample} lang="JSON" />
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">Errors</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-card/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="text-left px-4 py-2 font-semibold">Status</th><th className="text-left px-4 py-2 font-semibold">Meaning</th></tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                <tr><td className="px-4 py-3 font-mono text-xs">401</td><td className="px-4 py-3">Missing or invalid API key.</td></tr>
                <tr><td className="px-4 py-3 font-mono text-xs">500</td><td className="px-4 py-3">Server error — payload includes <code>error</code> message.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 pt-4 border-t border-border">
          <h2 className="text-2xl font-bold tracking-tight">Open source</h2>
          <p className="text-sm text-muted-foreground">
            The Sessions API is free to use and free to integrate. No attribution required, no rate limits beyond fair use. If you build something cool with it, we'd love to hear about it — drop a note via the <Link to="/support" className="text-primary hover:underline">support</Link> page.
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
