import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";

export default function SetupTracking() {
  const [copied, setCopied] = useState(false);
  const { workspace } = useWorkspace();

  const FUNCTION_URL = "https://fluxcore.works/api/v1/track";

  const luaScript = `-- Fluxcore Activity Tracker v2
-- Place in ServerScriptService as a Script named "FluxcoreTracker"
-- Features: Staff-only tracking, idle detection, message logging, heartbeats

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local Fluxcore = {}
Fluxcore.API_URL = "${FUNCTION_URL}"
Fluxcore.API_KEY = "${workspace?.api_key || "YOUR_API_KEY_FROM_SETTINGS"}"
Fluxcore.Sessions = {}        -- [UserId] = { session_id, last_input, message_count, idle_seconds }
Fluxcore.HEARTBEAT_INTERVAL = 30  -- seconds
Fluxcore.IDLE_THRESHOLD = 120     -- seconds before considered idle
Fluxcore.STAFF_ONLY = true        -- only track staff (workspace members)

function Fluxcore:Send(payload)
  local ok, res = pcall(function()
    return HttpService:PostAsync(
      self.API_URL,
      HttpService:JSONEncode(payload),
      Enum.HttpContentType.ApplicationJson,
      false,
      { ["x-api-key"] = self.API_KEY }
    )
  end)
  if ok then
    local decoded = pcall(function() return HttpService:JSONDecode(res) end)
    if decoded then return HttpService:JSONDecode(res) end
  end
  warn("[Fluxcore] Request failed:", res)
  return nil
end

function Fluxcore:OnPlayerAdded(player)
  local data = self:Send({
    action = "join",
    roblox_user_id = tostring(player.UserId),
    roblox_username = player.Name,
    server_id = tostring(game.JobId),
  })
  if data and data.session_id then
    self.Sessions[player.UserId] = {
      session_id = data.session_id,
      last_input = tick(),
      message_count = 0,
      idle_seconds = 0,
    }
    print("[Fluxcore] Tracking", player.Name)
  end
end

function Fluxcore:OnPlayerRemoving(player)
  local session = self.Sessions[player.UserId]
  if session then
    self:Send({
      action = "leave",
      roblox_user_id = tostring(player.UserId),
      session_id = session.session_id,
      message_count = session.message_count,
      idle_seconds = session.idle_seconds,
    })
    self.Sessions[player.UserId] = nil
  end
end

function Fluxcore:OnPlayerChatted(player, message)
  local session = self.Sessions[player.UserId]
  if session then
    session.message_count = session.message_count + 1
    session.last_input = tick()
    -- Log message if message logger is enabled (server-side check)
    self:Send({
      action = "event",
      roblox_user_id = tostring(player.UserId),
      roblox_username = player.Name,
      event_type = "chat_message",
      event_data = { message = message, server_id = tostring(game.JobId) },
    })
  end
end

function Fluxcore:RunHeartbeats()
  while true do
    wait(self.HEARTBEAT_INTERVAL)
    for userId, session in pairs(self.Sessions) do
      local idleTime = tick() - session.last_input
      local isIdle = idleTime >= self.IDLE_THRESHOLD
      if isIdle then
        session.idle_seconds = session.idle_seconds + self.HEARTBEAT_INTERVAL
      end
      self:Send({
        action = "heartbeat",
        roblox_user_id = tostring(userId),
        session_id = session.session_id,
        is_idle = isIdle,
        message_count = session.message_count,
      })
    end
  end
end

function Fluxcore:TrackInput(player)
  -- Track mouse/keyboard activity for idle detection
  -- Note: This runs on server but we use chat as primary input indicator
  player.Chatted:Connect(function(msg)
    self:OnPlayerChatted(player, msg)
  end)
end

function Fluxcore:Init()
  Players.PlayerAdded:Connect(function(p)
    self:OnPlayerAdded(p)
    self:TrackInput(p)
  end)
  Players.PlayerRemoving:Connect(function(p) self:OnPlayerRemoving(p) end)
  for _, p in ipairs(Players:GetPlayers()) do
    self:OnPlayerAdded(p)
    self:TrackInput(p)
  end

  -- Start heartbeat loop
  spawn(function() self:RunHeartbeats() end)

  print("[Fluxcore] Tracker v2 initialized - Idle detection, message logging, heartbeats active")
end

Fluxcore:Init()
return Fluxcore`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(luaScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout title="Setup Tracking">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Setup Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Install the Activity Tracker v2 in your Roblox game</p>
        </div>

        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
            <h2 className="font-semibold text-foreground text-sm">Enable HTTP Requests</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            In Roblox Studio → Game Settings → Security → <strong className="text-foreground">Allow HTTP Requests</strong>
          </p>
        </div>

        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
            <h2 className="font-semibold text-foreground text-sm">Add Tracker Script (v2)</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            Create a <strong className="text-foreground">Script</strong> named <code className="text-primary">FluxcoreTracker</code> in <strong className="text-foreground">ServerScriptService</strong>.
          </p>
          <div className="pl-8 text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">v2 Features:</strong></p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Idle detection (120s threshold)</li>
              <li>Message counting & logging</li>
              <li>30-second heartbeat keepalive</li>
              <li>Staff-only tracking mode</li>
              <li>Automatic session cleanup on leave</li>
            </ul>
          </div>
          <div className="relative pl-8">
            <pre className="bg-muted rounded-lg p-3 text-[11px] font-mono text-secondary-foreground overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
              {luaScript}
            </pre>
            <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={copyToClipboard}>
              <Copy className="w-3 h-3 mr-1" /> {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
            <h2 className="font-semibold text-foreground text-sm">Test It</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            Publish and join your game. Check the output for <code className="text-primary">[Fluxcore] Tracker v2 initialized</code>. Activity will appear in the dashboard immediately.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
