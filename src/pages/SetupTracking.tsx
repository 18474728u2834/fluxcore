import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Copy, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";

export default function SetupTracking() {
  const [copied, setCopied] = useState(false);
  const { workspace, workspaceId, isOwner } = useWorkspace();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isOwner) { setAllowed(true); }
      else if (!workspaceId) { setAllowed(false); return; }
      else {
        const { data, error } = await supabase.rpc("has_workspace_permission", {
          _workspace_id: workspaceId,
          _permission: "manage_settings",
        });
        if (cancelled) return;
        setAllowed(!error && !!data);
      }
      // API key is only readable by the workspace owner via this RPC.
      if (workspaceId) {
        const { data: secretsRows } = await supabase
          .rpc("get_workspace_secrets", { _workspace_id: workspaceId });
        const secrets: any = Array.isArray(secretsRows) ? secretsRows[0] : secretsRows;
        if (!cancelled) setApiKey(secrets?.api_key || "");
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceId, isOwner]);

  const FUNCTION_URL = "https://fluxcore.works/api/v1/track";

  const luaScript = `-- Fluxcore Activity Tracker v6
-- Place in ServerScriptService as a Script named "FluxcoreTracker".
-- v6 no longer writes script Source at runtime (Roblox blocks that with
-- "lacking capability PluginOrOpenCloud"). Add the optional input beacon
-- LocalScript yourself for the most accurate AFK detection — without it the
-- tracker falls back to server-side movement/chat activity detection.

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local InputEvent = ReplicatedStorage:FindFirstChild("FluxcoreInput")
if not InputEvent then
  InputEvent = Instance.new("RemoteEvent")
  InputEvent.Name = "FluxcoreInput"
  InputEvent.Parent = ReplicatedStorage
end

-- ================================================================================

local Fluxcore = {}
Fluxcore.API_URL = "${FUNCTION_URL}"
Fluxcore.API_KEY = "${apiKey || "YOUR_API_KEY_FROM_SETTINGS"}"
Fluxcore.Sessions = {}
Fluxcore.HEARTBEAT_INTERVAL = 15
Fluxcore.IDLE_THRESHOLD = 30 -- seconds with no input/focus = idle (time stops counting)
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
      focused = true,
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
  end
  self.Sessions[player.UserId] = nil
end

function Fluxcore:OnPlayerChatted(player, message)
  local session = self.Sessions[player.UserId]
  if session then
    session.message_count = session.message_count + 1
    session.last_input = tick()
  end
  self:Send({
    action = "event",
    roblox_user_id = tostring(player.UserId),
    roblox_username = player.Name,
    event_type = "chat_message",
    event_data = { message = message, server_id = tostring(game.JobId) },
  })
end

function Fluxcore:HookChat(player)
  player.Chatted:Connect(function(msg) self:OnPlayerChatted(player, msg) end)
end

local TextChatService = game:GetService("TextChatService")
TextChatService.MessageReceived:Connect(function(message)
  if not message.TextSource then return end
  local userId = message.TextSource.UserId
  local player = Players:GetPlayerByUserId(userId)
  if not player then return end
  Fluxcore:OnPlayerChatted(player, message.Text)
end)

-- Client tells us about input or focus changes (silent, no UI)
InputEvent.OnServerEvent:Connect(function(player, kind)
  local session = Fluxcore.Sessions[player.UserId]
  if not session then return end
  if kind == "input" or kind == "focus" then
    session.last_input = tick()
    session.focused = true
  elseif kind == "blur" then
    session.focused = false
  end
end)

-- Server-side fallback: if the player's character moves, count that as activity.
function Fluxcore:CheckMovement(userId, session)
  local player = Players:GetPlayerByUserId(userId)
  if not player then return end
  local char = player.Character
  local root = char and char:FindFirstChild("HumanoidRootPart")
  if not root then return end
  local pos = root.Position
  local last = session.last_pos
  if not last or (pos - last).Magnitude > 3 then
    session.last_input = tick()
    session.focused = true
  end
  session.last_pos = pos
end

function Fluxcore:RunHeartbeats()
  while true do
    wait(self.HEARTBEAT_INTERVAL)
    for userId, session in pairs(self.Sessions) do
      self:CheckMovement(userId, session)
      local idleTime = tick() - session.last_input
      local isIdle = (not session.focused) or (idleTime >= self.IDLE_THRESHOLD)
      if isIdle then
        session.idle_seconds = session.idle_seconds + self.HEARTBEAT_INTERVAL
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

function Fluxcore:Init()
  Players.PlayerAdded:Connect(function(p)
    self:OnPlayerAdded(p)
    self:HookChat(p)
  end)
  Players.PlayerRemoving:Connect(function(p) self:OnPlayerRemoving(p) end)
  for _, p in ipairs(Players:GetPlayers()) do
    self:OnPlayerAdded(p)
    self:HookChat(p)
  end
  spawn(function() self:RunHeartbeats() end)
  print("[Fluxcore] Tracker v6 initialized")
end

Fluxcore:Init()
return Fluxcore`;

  const luaBeaconScript = `-- Fluxcore Input Beacon (optional). Silent, no GUI.
-- Create a LocalScript named "FluxcoreInputBeacon" in StarterPlayer > StarterPlayerScripts.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local InputEvent = ReplicatedStorage:WaitForChild("FluxcoreInput")
local PING_INTERVAL = 5
local lastPing = 0
local function pingActive()
  local now = tick()
  if now - lastPing < PING_INTERVAL then return end
  lastPing = now
  pcall(function() InputEvent:FireServer("input") end)
end
UserInputService.InputBegan:Connect(function(_, gpe) if gpe then return end pingActive() end)
UserInputService.WindowFocused:Connect(function()
  lastPing = 0
  pcall(function() InputEvent:FireServer("focus") end)
end)
UserInputService.WindowFocusReleased:Connect(function()
  pcall(function() InputEvent:FireServer("blur") end)
end)
`;


  const luaRankingScript = `-- Fluxcore In-Game Ranking v1
-- Place in ServerScriptService as a Script named "FluxcoreRanking"
-- Lets staff promote/demote group members directly from in-game chat:
--   !promote <username>
--   !demote  <username>
-- Fluxcore checks the sender's workspace permissions and Roblox rank.
-- If they aren't allowed, the command is silently declined (no kick, no punishment).

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local TextChatService = game:GetService("TextChatService")

local Ranking = {}
Ranking.API_URL = "https://fluxcore.works/api/v1/ranking"
Ranking.API_KEY = "${apiKey || "YOUR_API_KEY_FROM_SETTINGS"}"

local function trim(s) return (s:gsub("^%s+", ""):gsub("%s+$", "")) end

local function resolveUserId(name)
  local ok, id = pcall(function() return Players:GetUserIdFromNameAsync(name) end)
  if ok and id then return id end
  return nil
end

local function reply(player, text)
  -- Silent best-effort whisper back to the sender. No kicks, no public shame.
  pcall(function()
    local channel = TextChatService:FindFirstChild("TextChannels")
      and TextChatService.TextChannels:FindFirstChild("RBXSystem")
    if channel then
      channel:DisplaySystemMessage("[Fluxcore] " .. text, player.UserId)
    end
  end)
  print(("[Fluxcore Ranking] %s -> %s"):format(player.Name, text))
end

function Ranking:Send(payload)
  local body = HttpService:JSONEncode(payload)
  local ok, res = pcall(function()
    return HttpService:RequestAsync({
      Url = self.API_URL,
      Method = "POST",
      Headers = {
        ["Content-Type"] = "application/json",
        ["x-api-key"] = self.API_KEY,
      },
      Body = body,
    })
  end)
  if not ok then return nil, "network error" end
  local decoded
  pcall(function() decoded = HttpService:JSONDecode(res.Body) end)
  if not res.Success then
    return nil, (decoded and decoded.error) or ("HTTP " .. tostring(res.StatusCode))
  end
  return decoded, nil
end

function Ranking:Handle(player, action, targetName)
  if not targetName or targetName == "" then
    reply(player, "Usage: !" .. action .. " <username>")
    return
  end
  local targetId = resolveUserId(targetName)
  if not targetId then
    reply(player, "Couldn't find Roblox user '" .. targetName .. "'")
    return
  end
  local data, err = self:Send({
    action = action,
    requester_user_id = tostring(player.UserId),
    target_user_id = tostring(targetId),
  })
  if err then
    -- Declined or failed. Do nothing else — just inform the sender.
    reply(player, "Declined: " .. err)
    return
  end
  if data and data.success then
    reply(player, ("%sd %s: %s -> %s"):format(
      action == "promote" and "Promote" or "Demote",
      targetName,
      (data.from and data.from.name) or "?",
      (data.to and data.to.name) or "?"
    ))
  end
end

local function parseAndHandle(player, message)
  local lower = message:lower()
  local action
  if lower:sub(1, 9) == "!promote " then action = "promote"
  elseif lower:sub(1, 8) == "!demote " then action = "demote"
  else return end
  local rest = trim(message:sub(action == "promote" and 10 or 9))
  -- Strip leading @ if present
  if rest:sub(1, 1) == "@" then rest = rest:sub(2) end
  Ranking:Handle(player, action, rest)
end

-- TextChatService (new chat)
TextChatService.MessageReceived:Connect(function(message)
  if not message.TextSource then return end
  local player = Players:GetPlayerByUserId(message.TextSource.UserId)
  if not player then return end
  parseAndHandle(player, message.Text)
end)

-- Legacy chat fallback
Players.PlayerAdded:Connect(function(player)
  player.Chatted:Connect(function(msg) parseAndHandle(player, msg) end)
end)
for _, p in ipairs(Players:GetPlayers()) do
  p.Chatted:Connect(function(msg) parseAndHandle(p, msg) end)
end

print("[Fluxcore] Ranking v1 initialized — !promote / !demote enabled")
`;

  const [copiedRanking, setCopiedRanking] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(luaScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRankingToClipboard = () => {
    navigator.clipboard.writeText(luaRankingScript);
    setCopiedRanking(true);
    setTimeout(() => setCopiedRanking(false), 2000);
  };

  if (allowed === false) {
    return (
      <DashboardLayout title="Setup Tracking">
        <div className="max-w-md mx-auto mt-16 glass rounded-xl p-8 text-center space-y-3">
          <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
          <h1 className="text-lg font-bold text-foreground">No access</h1>
          <p className="text-sm text-muted-foreground">You need the <strong className="text-foreground">manage_settings</strong> permission to view tracker setup. Ask a workspace owner.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Setup Tracking">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Setup Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Install the Activity Tracker v5 in your Roblox game — one server script, auto-installs the client beacon.</p>
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
            <h2 className="font-semibold text-foreground text-sm">Add Server Script (v5 — all-in-one)</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            Create a <strong className="text-foreground">Script</strong> named <code className="text-primary">FluxcoreTracker</code> in <strong className="text-foreground">ServerScriptService</strong>. The server script auto-installs the silent input beacon into <strong className="text-foreground">StarterPlayerScripts</strong> for you — no second script required.
          </p>
          <div className="pl-8 text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">v5 Features:</strong></p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Auto-installs the input beacon LocalScript on startup</li>
              <li>Silent AFK detection (30s of no input or window unfocus)</li>
              <li>Message counting & logging</li>
              <li>15-second heartbeat keepalive</li>
              <li>Staff-only tracking mode</li>
              <li><strong className="text-foreground">No on-screen GUI</strong> — fully invisible to players</li>
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
            <h2 className="font-semibold text-foreground text-sm">In-Game Ranking (optional)</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            Create a <strong className="text-foreground">Script</strong> named <code className="text-primary">FluxcoreRanking</code> in <strong className="text-foreground">ServerScriptService</strong>. Staff can then run <code className="text-primary">!promote &lt;username&gt;</code> or <code className="text-primary">!demote &lt;username&gt;</code> in chat. Fluxcore verifies their workspace permission and Roblox rank — if they're not allowed, the command is silently declined (no kicks, no punishment).
          </p>
          <div className="relative pl-8">
            <pre className="bg-muted rounded-lg p-3 text-[11px] font-mono text-secondary-foreground overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
              {luaRankingScript}
            </pre>
            <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={copyRankingToClipboard}>
              <Copy className="w-3 h-3 mr-1" /> {copiedRanking ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
            <h2 className="font-semibold text-foreground text-sm">Test It</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            Publish and join your game. Check the output for <code className="text-primary">[Fluxcore] Tracker v5 initialized</code>. Activity will appear in the dashboard immediately.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
