import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";

export default function SetupTracking() {
  const [copied, setCopied] = useState(false);
  const { workspace } = useWorkspace();

  const FUNCTION_URL = "https://fluxcore.works/api/v1/track";

  const luaScript = `-- Fluxcore Activity Tracker v3
-- Place in ServerScriptService as a Script named "FluxcoreTracker"
-- Features: Staff-only tracking, idle detection, message logging, heartbeats,
--           owner-configured AFK confirm prompt (drops session time if ignored)

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local AfkEvent = ReplicatedStorage:FindFirstChild("FluxcoreAfkPrompt")
if not AfkEvent then
  AfkEvent = Instance.new("RemoteEvent")
  AfkEvent.Name = "FluxcoreAfkPrompt"
  AfkEvent.Parent = ReplicatedStorage
end

local Fluxcore = {}
Fluxcore.API_URL = "${FUNCTION_URL}"
Fluxcore.API_KEY = "${workspace?.api_key || "YOUR_API_KEY_FROM_SETTINGS"}"
Fluxcore.Sessions = {}
Fluxcore.HEARTBEAT_INTERVAL = 30
Fluxcore.IDLE_THRESHOLD = 120
Fluxcore.AFK_RESPONSE_WINDOW = 30 -- seconds player has to click the button
Fluxcore.STAFF_ONLY = true

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
    local okDecode, decoded = pcall(function() return HttpService:JSONDecode(res) end)
    if okDecode then return decoded end
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
      afk_confirm_seconds = tonumber(data.afk_confirm_seconds) or 0,
      afk_prompt_sent_at = nil,
      discarded = false,
    }
    print("[Fluxcore] Tracking", player.Name)
  end
end

function Fluxcore:OnPlayerRemoving(player)
  local session = self.Sessions[player.UserId]
  if session and not session.discarded then
    self:Send({
      action = "leave",
      roblox_user_id = tostring(player.UserId),
      session_id = session.session_id,
      message_count = session.message_count,
      idle_seconds = session.idle_seconds,
    })
  end
  self.Sessions[player.UserId] = nil
end

function Fluxcore:OnPlayerChatted(player, message)
  local session = self.Sessions[player.UserId]
  if session then
    session.message_count = session.message_count + 1
    session.last_input = tick()
    session.afk_prompt_sent_at = nil
    self:Send({
      action = "event",
      roblox_user_id = tostring(player.UserId),
      roblox_username = player.Name,
      event_type = "chat_message",
      event_data = { message = message, server_id = tostring(game.JobId) },
    })
  end
end

AfkEvent.OnServerEvent:Connect(function(player)
  local session = Fluxcore.Sessions[player.UserId]
  if not session then return end
  session.last_input = tick()
  session.afk_prompt_sent_at = nil
  Fluxcore:Send({
    action = "afk_confirm",
    roblox_user_id = tostring(player.UserId),
    session_id = session.session_id,
  })
end)

function Fluxcore:RunHeartbeats()
  while true do
    wait(self.HEARTBEAT_INTERVAL)
    for userId, session in pairs(self.Sessions) do
      if not session.discarded then
        local idleTime = tick() - session.last_input
        local isIdle = idleTime >= self.IDLE_THRESHOLD
        if isIdle then
          session.idle_seconds = session.idle_seconds + self.HEARTBEAT_INTERVAL
        end

        if session.afk_confirm_seconds and session.afk_confirm_seconds > 0 then
          if not session.afk_prompt_sent_at and idleTime >= session.afk_confirm_seconds then
            local player = Players:GetPlayerByUserId(userId)
            if player then
              session.afk_prompt_sent_at = tick()
              AfkEvent:FireClient(player, self.AFK_RESPONSE_WINDOW)
              self:Send({
                action = "afk_prompt",
                roblox_user_id = tostring(userId),
                session_id = session.session_id,
              })
            end
          elseif session.afk_prompt_sent_at and (tick() - session.afk_prompt_sent_at) >= self.AFK_RESPONSE_WINDOW then
            session.discarded = true
            local player = Players:GetPlayerByUserId(userId)
            self:Send({
              action = "afk_timeout",
              roblox_user_id = tostring(userId),
              roblox_username = player and player.Name or nil,
              session_id = session.session_id,
            })
            print("[Fluxcore] Session discarded for AFK:", userId)
          end
        end

        self:Send({
          action = "heartbeat",
          roblox_user_id = tostring(userId),
          session_id = session.session_id,
          is_idle = isIdle,
          message_count = session.message_count,
          idle_seconds = session.idle_seconds,
        })
      end
    end
  end
end

function Fluxcore:Init()
  Players.PlayerAdded:Connect(function(p)
    self:OnPlayerAdded(p)
    p.Chatted:Connect(function(msg) self:OnPlayerChatted(p, msg) end)
  end)
  Players.PlayerRemoving:Connect(function(p) self:OnPlayerRemoving(p) end)
  for _, p in ipairs(Players:GetPlayers()) do
    self:OnPlayerAdded(p)
    p.Chatted:Connect(function(msg) self:OnPlayerChatted(p, msg) end)
  end
  spawn(function() self:RunHeartbeats() end)
  print("[Fluxcore] Tracker v3 initialized")
end

Fluxcore:Init()
return Fluxcore`;

  const luaClientScript = `-- Fluxcore AFK Confirm UI (CLIENT)
-- Place in StarterPlayer > StarterPlayerScripts as a LocalScript named "FluxcoreAfkClient"

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local AfkEvent = ReplicatedStorage:WaitForChild("FluxcoreAfkPrompt")

local gui = Instance.new("ScreenGui")
gui.Name = "FluxcoreAfkPrompt"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.Enabled = false
gui.Parent = player:WaitForChild("PlayerGui")

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 360, 0, 130)
frame.Position = UDim2.new(0.5, -180, 0.5, -65)
frame.BackgroundColor3 = Color3.fromRGB(20, 20, 28)
frame.BorderSizePixel = 0
frame.Parent = gui

local corner = Instance.new("UICorner", frame)
corner.CornerRadius = UDim.new(0, 12)

local stroke = Instance.new("UIStroke", frame)
stroke.Color = Color3.fromRGB(124, 58, 237)
stroke.Thickness = 2

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -20, 0, 28)
title.Position = UDim2.new(0, 10, 0, 12)
title.BackgroundTransparency = 1
title.Text = "Are you still active?"
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.Font = Enum.Font.GothamBold
title.TextSize = 18
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = frame

local sub = Instance.new("TextLabel")
sub.Size = UDim2.new(1, -20, 0, 36)
sub.Position = UDim2.new(0, 10, 0, 42)
sub.BackgroundTransparency = 1
sub.Text = "Click below or your session time won't be logged."
sub.TextColor3 = Color3.fromRGB(180, 180, 195)
sub.Font = Enum.Font.Gotham
sub.TextSize = 13
sub.TextXAlignment = Enum.TextXAlignment.Left
sub.TextWrapped = true
sub.Parent = frame

local btn = Instance.new("TextButton")
btn.Size = UDim2.new(1, -20, 0, 36)
btn.Position = UDim2.new(0, 10, 1, -46)
btn.BackgroundColor3 = Color3.fromRGB(124, 58, 237)
btn.Text = "Click here to remove AFK timer"
btn.TextColor3 = Color3.fromRGB(255, 255, 255)
btn.Font = Enum.Font.GothamBold
btn.TextSize = 14
btn.AutoButtonColor = true
btn.Parent = frame
local btnCorner = Instance.new("UICorner", btn)
btnCorner.CornerRadius = UDim.new(0, 8)

btn.MouseButton1Click:Connect(function()
  AfkEvent:FireServer()
  gui.Enabled = false
end)

AfkEvent.OnClientEvent:Connect(function(window)
  gui.Enabled = true
  local startTime = tick()
  task.spawn(function()
    while gui.Enabled do
      local remaining = math.max(0, math.floor(window - (tick() - startTime)))
      sub.Text = "Click below in " .. remaining .. "s or your session time won't be logged."
      if remaining <= 0 then gui.Enabled = false break end
      task.wait(1)
    end
  end)
end)`;

  const [copiedClient, setCopiedClient] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(luaScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyClientToClipboard = () => {
    navigator.clipboard.writeText(luaClientScript);
    setCopiedClient(true);
    setTimeout(() => setCopiedClient(false), 2000);
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
