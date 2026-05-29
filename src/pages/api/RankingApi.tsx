import { ApiShell, CodeBlock, EndpointBadge, ParamsTable } from "./ApiLayout";

const ENDPOINT = "https://fluxcore.works/api/v1/ranking";

const curlExample = `curl -X POST "${ENDPOINT}" \\
  -H "x-api-key: YOUR_WORKSPACE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "promote",
    "requester_user_id": 12345678,
    "target_user_id": 87654321
  }'`;

const luaExample = `local HttpService = game:GetService("HttpService")

-- Wire this up to your in-game chat command !promote "Username"
local function rank(action, requesterId, targetId)
  local res = HttpService:RequestAsync({
    Url = "${ENDPOINT}",
    Method = "POST",
    Headers = {
      ["x-api-key"] = "YOUR_WORKSPACE_API_KEY",
      ["Content-Type"] = "application/json",
    },
    Body = HttpService:JSONEncode({
      action = action,            -- "promote" or "demote"
      requester_user_id = requesterId,
      target_user_id = targetId,
    }),
  })
  return HttpService:JSONDecode(res.Body)
end

print(rank("promote", 12345678, 87654321))`;

const jsExample = `await fetch("${ENDPOINT}", {
  method: "POST",
  headers: {
    "x-api-key": "YOUR_WORKSPACE_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "demote",
    requester_user_id: 12345678,
    target_user_id: 87654321,
  }),
});`;

const responseExample = `{
  "success": true,
  "action": "promote",
  "target": { "userId": 87654321, "username": "TargetUser" },
  "from": { "rank": 50, "name": "Member" },
  "to":   { "rank": 100, "name": "Trusted Member" }
}`;

export default function RankingApi() {
  return (
    <ApiShell>
      <section className="space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">Ranking API</div>
        <h1 className="text-4xl font-bold tracking-tight">In-game !promote & !demote</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Move a Roblox group member up or down one rank. Fluxcore validates that the requester has the <code>manage_members</code> permission in your workspace before talking to the Roblox Open Cloud API — so an unauthorized player just gets rejected.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Endpoint</h2>
        <EndpointBadge method="POST" url={ENDPOINT} />
        <p className="text-sm text-muted-foreground">
          Authenticate with <code className="px-1.5 py-0.5 rounded bg-card border border-border text-xs">x-api-key: YOUR_KEY</code>. Your workspace must have a Roblox Open Cloud API key and group ID configured under Settings.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Body</h2>
        <ParamsTable rows={[
          { param: "action", desc: <>Either <code>promote</code> or <code>demote</code>.</> },
          { param: "requester_user_id", desc: "Roblox user ID of the player running the command. Checked for manage_members permission." },
          { param: "target_user_id", desc: "Roblox user ID of the player being ranked." },
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
        <h2 className="text-2xl font-bold tracking-tight">Errors</h2>
        <ParamsTable rows={[
          { param: "401", desc: "Missing or invalid API key." },
          { param: "403", desc: "Requester does not have manage_members permission, or target is at/above requester's rank." },
          { param: "404", desc: "Target not in group, or no rank above/below to move to." },
          { param: "400", desc: "Roblox Open Cloud key or group ID not configured." },
        ]} />
      </section>
    </ApiShell>
  );
}
