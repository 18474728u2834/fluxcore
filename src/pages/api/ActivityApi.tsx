import { ApiShell, CodeBlock, EndpointBadge, ParamsTable } from "./ApiLayout";

const ENDPOINT = "https://fluxcore.works/api/v1/track";

const joinExample = `{
  "action": "join",
  "roblox_user_id": "12345678",
  "roblox_username": "PlayerName",
  "server_id": "game-job-id"
}`;

const heartbeatExample = `{
  "action": "heartbeat",
  "roblox_user_id": "12345678",
  "session_id": "uuid-from-join-response",
  "is_idle": false,
  "message_count": 4,
  "idle_seconds": 0
}`;

const leaveExample = `{
  "action": "leave",
  "roblox_user_id": "12345678",
  "session_id": "uuid-from-join-response",
  "message_count": 4,
  "idle_seconds": 30
}`;

const luaExample = `local HttpService = game:GetService("HttpService")

local res = HttpService:PostAsync(
  "${ENDPOINT}",
  HttpService:JSONEncode({
    action = "join",
    roblox_user_id = tostring(player.UserId),
    roblox_username = player.Name,
    server_id = tostring(game.JobId),
  }),
  Enum.HttpContentType.ApplicationJson,
  false,
  { ["x-api-key"] = "YOUR_WORKSPACE_API_KEY" }
)

local data = HttpService:JSONDecode(res)
print(data.session_id) -- save this, use it in heartbeat/leave`;

export default function ActivityApi() {
  return (
    <ApiShell>
      <section className="space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">Activity Tracker API</div>
        <h1 className="text-4xl font-bold tracking-tight">Track playtime & chat</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Send player events from your Roblox game to populate the Fluxcore activity dashboard. The same endpoint powers the official Lua tracker — you can call it from anywhere.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Endpoint</h2>
        <EndpointBadge method="POST" url={ENDPOINT} />
        <p className="text-sm text-muted-foreground">
          Authenticate with <code className="px-1.5 py-0.5 rounded bg-card border border-border text-xs">x-api-key: YOUR_KEY</code>. Send a JSON body with an <code className="px-1.5 py-0.5 rounded bg-card border border-border text-xs">action</code> field.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Actions</h2>
        <ParamsTable rows={[
          { param: "join", desc: "Player joined a server. Returns a session_id you must reuse." },
          { param: "heartbeat", desc: "Send every ~15s to keep the session alive and report idle status." },
          { param: "leave", desc: "Player left the server. Closes the session." },
          { param: "event", desc: "Generic event log (e.g. chat_message)." },
        ]} />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Example bodies</h2>
        <CodeBlock code={joinExample} lang="JSON · join" />
        <CodeBlock code={heartbeatExample} lang="JSON · heartbeat" />
        <CodeBlock code={leaveExample} lang="JSON · leave" />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Roblox Lua</h2>
        <CodeBlock code={luaExample} lang="Roblox Lua" />
        <p className="text-sm text-muted-foreground">
          Prefer the official drop-in tracker? It's pre-wired with idle detection — grab it from any workspace's <span className="text-foreground font-medium">Setup Tracking</span> page.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Errors</h2>
        <ParamsTable rows={[
          { param: "401", desc: "Missing or invalid API key." },
          { param: "400", desc: "Invalid action or missing required field." },
        ]} />
      </section>
    </ApiShell>
  );
}
