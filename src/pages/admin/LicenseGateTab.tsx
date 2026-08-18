import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const ENDPOINT = "https://zulnuayumxsdbivigvfe.supabase.co/functions/v1/license-check";

export default function LicenseGateTab() {
  const [protectedCode, setProtectedCode] = useState(
    `print("Licensed Fluxcore game - protected code running")`
  );
  const [kickMessage, setKickMessage] = useState(
    "This place is not licensed to run Fluxcore systems."
  );
  const [kickPlayers, setKickPlayers] = useState(false);
  const [failOpen, setFailOpen] = useState(false);

  const script = useMemo(() => {
    const indented = protectedCode
      .split("\n")
      .map((l) => "\t" + l)
      .join("\n");
    return `--[[
	Fluxcore License Gate  (ServerScriptService -> Script)
	The game owner must have a Fluxcore account (or a workspace linked to
	this group). If not, this script deletes itself and never runs the
	protected code below.
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local ENDPOINT = "${ENDPOINT}"
local FAIL_OPEN = ${failOpen} -- true = keep running if Fluxcore is unreachable
local KICK_PLAYERS = ${kickPlayers}
local KICK_MESSAGE = ${JSON.stringify(kickMessage)}

local function checkLicense()
	local creatorId = game.CreatorId
	local creatorType = (game.CreatorType == Enum.CreatorType.Group) and "Group" or "User"
	if creatorId == 0 then return false, "unpublished" end

	local ok, res = pcall(function()
		return HttpService:RequestAsync({
			Url = ENDPOINT,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json" },
			Body = HttpService:JSONEncode({
				creatorId = tostring(creatorId),
				creatorType = creatorType,
			}),
		})
	end)

	if not ok or not res.Success then
		return FAIL_OPEN, "unreachable"
	end

	local decoded
	local parsed = pcall(function() decoded = HttpService:JSONDecode(res.Body) end)
	if not parsed or type(decoded) ~= "table" then
		return FAIL_OPEN, "bad_response"
	end

	return decoded.licensed == true, decoded.reason or decoded.workspace
end

local licensed, info = checkLicense()

if not licensed then
	warn("[Fluxcore] License check failed (" .. tostring(info) .. ") - removing script.")
	if KICK_PLAYERS then
		local function kick(plr) plr:Kick(KICK_MESSAGE) end
		for _, plr in ipairs(Players:GetPlayers()) do kick(plr) end
		Players.PlayerAdded:Connect(kick)
		task.wait(3)
	end
	script:Destroy()
	return
end

print("[Fluxcore] Licensed to: " .. tostring(info))

-- ===== Protected code =====
do
${indented}
end
-- ===== End protected code =====
`;
  }, [protectedCode, kickMessage, kickPlayers, failOpen]);

  const copy = async () => {
    await navigator.clipboard.writeText(script);
    toast.success("License gate script copied");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card/40 backdrop-blur p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">License Gate generator</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Generates a Roblox server script that asks Fluxcore whether the game's owner (user or
          group) has a Fluxcore account. Licensed games run your protected code; everyone else gets{" "}
          <code className="text-foreground">script:Destroy()</code>.
        </p>

        <div className="space-y-2">
          <Label>Protected code (runs only when licensed)</Label>
          <Textarea
            rows={8}
            className="font-mono text-xs"
            value={protectedCode}
            onChange={(e) => setProtectedCode(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Kick message</Label>
            <Input value={kickMessage} onChange={(e) => setKickMessage(e.target.value)} />
          </div>
          <div className="space-y-3 pt-6">
            <div className="flex items-center gap-3">
              <Switch id="kick" checked={kickPlayers} onCheckedChange={setKickPlayers} />
              <Label htmlFor="kick">Also kick players when unlicensed</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="failopen" checked={failOpen} onCheckedChange={setFailOpen} />
              <Label htmlFor="failopen">Keep running if Fluxcore is unreachable</Label>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/40 backdrop-blur p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">LicenseGate (Script · ServerScriptService)</h3>
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
          </Button>
        </div>
        <pre className="text-[11px] leading-relaxed bg-muted/30 rounded-md p-3 overflow-auto max-h-[520px] font-mono">
          {script}
        </pre>
        <p className="text-xs text-muted-foreground">
          Requires HTTP requests enabled in Game Settings → Security.
        </p>
      </div>
    </div>
  );
}
