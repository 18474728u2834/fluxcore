import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useState } from "react";

export default function SetupTracking() {
  const [copied, setCopied] = useState<string | null>(null);

  const API_KEY = "YOUR_WORKSPACE_API_KEY";
  const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || "your-project"}.supabase.co/functions/v1/activity-tracker`;

  const luaScript = `-- Fluxcore Activity Tracker + Adonis Logging
-- Place in ServerScriptService

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local Fluxcore = {}
Fluxcore.API_URL = "${FUNCTION_URL}"
Fluxcore.API_KEY = "${API_KEY}"
Fluxcore.Sessions = {}

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
  if ok then return HttpService:JSONDecode(res) end
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
    self.Sessions[player.UserId] = data.session_id
    print("[Fluxcore] Tracking", player.Name)
  end
end

function Fluxcore:OnPlayerRemoving(player)
  self:Send({
    action = "leave",
    roblox_user_id = tostring(player.UserId),
    session_id = self.Sessions[player.UserId],
  })
  self.Sessions[player.UserId] = nil
end

-- Adonis admin command logging
function Fluxcore:LogAdminAction(admin, actionType, target, reason)
  self:Send({
    action = "event",
    roblox_user_id = tostring(admin.UserId),
    roblox_username = admin.Name,
    event_type = actionType,
    event_data = {
      target = target,
      reason = reason or "No reason",
    },
  })
end

function Fluxcore:Init()
  Players.PlayerAdded:Connect(function(p) self:OnPlayerAdded(p) end)
  Players.PlayerRemoving:Connect(function(p) self:OnPlayerRemoving(p) end)
  for _, p in ipairs(Players:GetPlayers()) do self:OnPlayerAdded(p) end
  print("[Fluxcore] Tracker initialized")
end

Fluxcore:Init()
return Fluxcore`;

  const adonisHook = `-- Adonis Hook for Fluxcore (place in Adonis Plugins folder)
-- Logs kicks, bans, and warns automatically

return function(Vargs)
  local server = Vargs.Server
  local Fluxcore = require(game.ServerScriptService.FluxcoreTracker)

  server.Commands.Kick.OnRun = function(caller, args)
    local target = args[1]
    local reason = args[2] or "No reason"
    Fluxcore:LogAdminAction(caller, "Kick", target, reason)
  end

  server.Commands.Ban.OnRun = function(caller, args)
    local target = args[1]
    local reason = args[2] or "No reason"
    Fluxcore:LogAdminAction(caller, "Ban", target, reason)
  end

  server.Commands.Warn.OnRun = function(caller, args)
    local target = args[1]
    local reason = args[2] or "No reason"
    Fluxcore:LogAdminAction(caller, "Warn", target, reason)
  end
end`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <DashboardLayout title="Setup Tracking">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Setup Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Install the tracker module in your Roblox game</p>
        </div>

        {/* Step 1 */}
        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
            <h2 className="font-semibold text-foreground text-sm">Enable HTTP Requests</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            In Roblox Studio → Game Settings → Security → <strong className="text-foreground">Allow HTTP Requests</strong>
          </p>
        </div>

        {/* Step 2 */}
        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
            <h2 className="font-semibold text-foreground text-sm">Main Tracker Script</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            Create a <strong className="text-foreground">Script</strong> named <code className="text-primary">FluxcoreTracker</code> in <strong className="text-foreground">ServerScriptService</strong>. Replace the API key with yours from Settings.
          </p>
          <div className="relative pl-8">
            <pre className="bg-muted rounded-lg p-3 text-[11px] font-mono text-secondary-foreground overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
              {luaScript}
            </pre>
            <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(luaScript, "lua")}>
              <Copy className="w-3 h-3 mr-1" /> {copied === "lua" ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Step 3 - Adonis */}
        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
            <h2 className="font-semibold text-foreground text-sm">Adonis Admin Hook <span className="text-muted-foreground font-normal">(optional)</span></h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            If you use Adonis admin, add this plugin to automatically log kicks, bans, and warns.
          </p>
          <div className="relative pl-8">
            <pre className="bg-muted rounded-lg p-3 text-[11px] font-mono text-secondary-foreground overflow-x-auto max-h-60 overflow-y-auto leading-relaxed">
              {adonisHook}
            </pre>
            <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(adonisHook, "adonis")}>
              <Copy className="w-3 h-3 mr-1" /> {copied === "adonis" ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Step 4 */}
        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
            <h2 className="font-semibold text-foreground text-sm">Test It</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            Publish and join your game. Check the output for <code className="text-primary">[Fluxcore] Tracker initialized</code>. Activity will appear in the dashboard immediately.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
