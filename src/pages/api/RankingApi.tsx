import { ApiShell, CodeBlock, EndpointBadge } from "./ApiLayout";

const ENDPOINT = "https://fluxcore.works/api/v1/ranking";

const luaScript = `--!strict
-- Fluxcore Ranking — drop into ServerScriptService
-- Handles !promote "Username" and !demote "Username" in chat.
-- Permission is checked server-side: only players with the
-- "manage_members" permission in your Fluxcore workspace succeed.

local Players      = game:GetService("Players")
local HttpService  = game:GetService("HttpService")

local WORKSPACE_API_KEY = "PASTE_YOUR_WORKSPACE_API_KEY"
local ENDPOINT          = "${ENDPOINT}"

local function resolveUserId(name: string): number?
	local ok, id = pcall(function() return Players:GetUserIdFromNameAsync(name) end)
	if ok then return id end
	return nil
end

local function rank(action: string, requesterId: number, targetId: number, notify: (msg: string) -> ())
	local ok, res = pcall(function()
		return HttpService:RequestAsync({
			Url     = ENDPOINT,
			Method  = "POST",
			Headers = {
				["x-api-key"]    = WORKSPACE_API_KEY,
				["Content-Type"] = "application/json",
			},
			Body = HttpService:JSONEncode({
				action            = action,
				requester_user_id = requesterId,
				target_user_id    = targetId,
			}),
		})
	end)

	if not ok or not res then notify("Fluxcore: request failed") return end
	local data = HttpService:JSONDecode(res.Body)
	if data.success then
		notify(("%sd to %s"):format(action:sub(1,1):upper()..action:sub(2), data.to.name))
	else
		notify("Fluxcore: " .. (data.error or "rejected"))
	end
end

local function parse(msg: string): (string?, string?)
	local cmd, name = msg:match("^!(%a+)%s+\\"?([%w_]+)\\"?")
	return cmd, name
end

Players.PlayerAdded:Connect(function(player)
	player.Chatted:Connect(function(msg)
		local cmd, targetName = parse(msg)
		if not cmd or not targetName then return end
		cmd = cmd:lower()
		if cmd ~= "promote" and cmd ~= "demote" then return end

		local targetId = resolveUserId(targetName)
		if not targetId then
			player:Kick("") -- silent
			return
		end

		rank(cmd, player.UserId, targetId, function(msg)
			-- Send result back to the requester via PM/system
			pcall(function() player:Kick() end) -- replace with your chat system
			print("[Fluxcore]", player.Name, "->", msg)
		end)
	end)
end)`;

const responseExample = `{
  "success": true,
  "action": "promote",
  "target": { "userId": 87654321 },
  "from": { "rank": 50, "name": "Member" },
  "to":   { "rank": 100, "name": "Trusted Member" }
}`;

export default function RankingApi() {
  return (
    <ApiShell>
      <section className="space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">Ranking API</div>
        <h1 className="text-4xl font-bold tracking-tight">!promote & !demote in your game</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Drop one Lua script into your Roblox game and your staff can run <code>!promote "User"</code> or <code>!demote "User"</code> in chat. Fluxcore validates the requester's <code>manage_members</code> permission and then talks to the Roblox Open Cloud API using the key you've already configured in your workspace.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Before you start</h2>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li>Open your workspace → <span className="text-foreground font-medium">Settings</span> and copy your <span className="text-foreground font-medium">Workspace API key</span>.</li>
          <li>In the same Settings page, make sure your <span className="text-foreground font-medium">Roblox Open Cloud API key</span> and <span className="text-foreground font-medium">Group ID</span> are filled in — the ranking call uses these on your behalf.</li>
          <li>In Roblox Studio, enable <span className="text-foreground font-medium">HTTP Requests</span> under Game Settings → Security.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Drop-in Lua script</h2>
        <p className="text-sm text-muted-foreground">
          Paste this into a <code>Script</code> inside <code>ServerScriptService</code>. Replace <code>PASTE_YOUR_WORKSPACE_API_KEY</code> and you're done.
        </p>
        <CodeBlock code={luaScript} lang="Roblox Lua" />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Endpoint</h2>
        <EndpointBadge method="POST" url={ENDPOINT} />
        <p className="text-sm text-muted-foreground">
          The script above already calls this — you only need it if you want to wire ranking into a custom admin panel or Discord bot.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">How permissions work</h2>
        <p className="text-sm text-muted-foreground">
          The server looks up the requester's Roblox user ID inside your Fluxcore workspace. If they're the workspace owner, or their Fluxcore role has <code>manage_members</code>, the rank change goes through. Otherwise the request is rejected with <code>403</code> and nothing happens in your Roblox group. You can also never rank someone to a role equal to or above your own.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Response</h2>
        <CodeBlock code={responseExample} lang="JSON" />
      </section>
    </ApiShell>
  );
}
