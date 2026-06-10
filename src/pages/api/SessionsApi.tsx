import { ApiShell, CodeBlock, EndpointBadge, ParamsTable } from "./ApiLayout";
import { SessionScriptGenerator } from "./SessionScriptGenerator";

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
          "assigned": [{ "userId": 12345, "username": "TrainerOne" }]
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

export default function SessionsApi() {
  return (
    <ApiShell>
      <section className="space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">Sessions API</div>
        <h1 className="text-4xl font-bold tracking-tight">Live & upcoming sessions</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Pull today's scheduled sessions from any Fluxcore workspace — including recurring ones, expanded into individual occurrences with Roblox user IDs resolved server-side.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Endpoint</h2>
        <EndpointBadge method="GET" url={ENDPOINT} />
        <p className="text-sm text-muted-foreground">
          Authenticate with <code className="px-1.5 py-0.5 rounded bg-card border border-border text-xs">x-api-key: YOUR_KEY</code> or <code className="px-1.5 py-0.5 rounded bg-card border border-border text-xs">Authorization: Bearer YOUR_KEY</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Query parameters</h2>
        <ParamsTable rows={[
          { param: "category", default: "all", desc: <>Filter by session category (e.g. <code>training</code>, <code>shift</code>).</> },
          { param: "today", default: "true", desc: "When true, only returns occurrences happening today (UTC)." },
        ]} />
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
        <CodeBlock code={responseExample} lang="JSON" />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">✨ Generate a session board with AI</h2>
        <p className="text-sm text-muted-foreground">Skip writing Lua. Describe your in-game session board, upload a screenshot of the SurfaceGui, and get a ModuleScript + handler that updates it live.</p>
        <SessionScriptGenerator />
      </section>


      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Errors</h2>
        <ParamsTable rows={[
          { param: "401", desc: "Missing or invalid API key." },
          { param: "500", desc: <>Server error — payload includes <code>error</code> message.</> },
        ]} />
      </section>
    </ApiShell>
  );
}
