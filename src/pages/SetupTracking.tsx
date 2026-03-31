import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";

export default function SetupTracking() {
  const [copied, setCopied] = useState(false);
  const { workspace } = useWorkspace();

  const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || "your-project"}.supabase.co/functions/v1/activity-tracker`;

  const luaScript = `-- Fluxcore Activity Tracker
-- Place in ServerScriptService as a Script named "FluxcoreTracker"

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local Fluxcore = {}
Fluxcore.API_URL = "${FUNCTION_URL}"
Fluxcore.API_KEY = "${workspace?.api_key || "YOUR_API_KEY_FROM_SETTINGS"}"
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

function Fluxcore:Init()
  Players.PlayerAdded:Connect(function(p) self:OnPlayerAdded(p) end)
  Players.PlayerRemoving:Connect(function(p) self:OnPlayerRemoving(p) end)
  for _, p in ipairs(Players:GetPlayers()) do self:OnPlayerAdded(p) end
  print("[Fluxcore] Tracker initialized")
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
          <p className="text-sm text-muted-foreground mt-0.5">Install the tracker module in your Roblox game</p>
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
            <h2 className="font-semibold text-foreground text-sm">Add Tracker Script</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            Create a <strong className="text-foreground">Script</strong> named <code className="text-primary">FluxcoreTracker</code> in <strong className="text-foreground">ServerScriptService</strong>.
          </p>
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
            Publish and join your game. Check the output for <code className="text-primary">[Fluxcore] Tracker initialized</code>. Activity will appear in the dashboard immediately.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
