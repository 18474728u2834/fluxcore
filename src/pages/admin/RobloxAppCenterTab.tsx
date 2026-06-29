import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileCode2 } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = "https://zulnuayumxsdbivigvfe.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bG51YXl1bXhzZGJpdmlndmZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjE1MzYsImV4cCI6MjA5MTEzNzUzNn0.iRheHMHKukJjf3HL1tyKO-qNxNwGDV4fcTEPlpZ6ZEc";

function buildScript(formId: string, workspaceName: string) {
  const ws = workspaceName.replace(/"/g, '\\"');
  return `--!strict
-- Fluxcore Application Center  (Roblox Luau)
-- Workspace : ${ws || "<unset>"}
-- Form ID   : ${formId || "<unset>"}
-- Drop into ServerScriptService. Requires HttpService enabled in Game Settings.

local HttpService    = game:GetService("HttpService")
local Players        = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local SUPABASE_URL = "${SUPABASE_URL}"
local SUPABASE_ANON = "${SUPABASE_ANON}"
local FORM_ID      = "${formId}"
local WORKSPACE    = "${ws}"

----------------------------------------------------------------
-- Remotes
----------------------------------------------------------------
local folder = ReplicatedStorage:FindFirstChild("FluxcoreApp")
if not folder then
    folder = Instance.new("Folder")
    folder.Name = "FluxcoreApp"
    folder.Parent = ReplicatedStorage
end
local getForm = folder:FindFirstChild("GetForm") or Instance.new("RemoteFunction", folder)
getForm.Name = "GetForm"
local submit  = folder:FindFirstChild("Submit")  or Instance.new("RemoteFunction", folder)
submit.Name = "Submit"

----------------------------------------------------------------
-- HTTP helpers
----------------------------------------------------------------
local function rpc(name: string, body: any)
    local ok, res = pcall(function()
        return HttpService:RequestAsync({
            Url = SUPABASE_URL .. "/rest/v1/rpc/" .. name,
            Method = "POST",
            Headers = {
                ["apikey"]        = SUPABASE_ANON,
                ["Authorization"] = "Bearer " .. SUPABASE_ANON,
                ["Content-Type"]  = "application/json",
            },
            Body = HttpService:JSONEncode(body or {}),
        })
    end)
    if not ok or not res.Success then
        warn("[Fluxcore] rpc fail: " .. name .. " -> " .. tostring(res and res.StatusMessage))
        return nil
    end
    return HttpService:JSONDecode(res.Body)
end

local cachedForm: any = nil
local function loadForm()
    cachedForm = rpc("get_public_form", { _form_id = FORM_ID })
    if cachedForm then
        print(string.format("[Fluxcore] Loaded \\"%s\\" form for %s (%d questions)",
            cachedForm.title or "Untitled", WORKSPACE, #(cachedForm.questions or {})))
    else
        warn("[Fluxcore] Form is closed or could not be loaded.")
    end
end
loadForm()

----------------------------------------------------------------
-- Remotes wired
----------------------------------------------------------------
getForm.OnServerInvoke = function()
    if not cachedForm then loadForm() end
    return { workspace = WORKSPACE, form = cachedForm }
end

submit.OnServerInvoke = function(player: Player, answers: { [string]: string })
    if not cachedForm then return { ok = false, error = "form_unavailable" } end
    if typeof(answers) ~= "table" then return { ok = false, error = "bad_payload" } end

    local result = rpc("submit_application", {
        _form_id          = FORM_ID,
        _roblox_user_id   = tostring(player.UserId),
        _roblox_username  = player.Name,
        _answers          = answers,
    })
    if result == nil then return { ok = false, error = "network" } end
    return { ok = true, application_id = result }
end

----------------------------------------------------------------
-- Client-side UI (StarterPlayerScripts loader)
----------------------------------------------------------------
local StarterPlayerScripts = game:GetService("StarterPlayer"):FindFirstChild("StarterPlayerScripts")
if StarterPlayerScripts and not StarterPlayerScripts:FindFirstChild("FluxcoreAppClient") then
    local src = [==[
        local Players = game:GetService("Players")
        local UIS     = game:GetService("UserInputService")
        local RS      = game:GetService("ReplicatedStorage")
        local folder  = RS:WaitForChild("FluxcoreApp")
        local plr     = Players.LocalPlayer

        local sg = Instance.new("ScreenGui")
        sg.Name = "FluxcoreAppCenter"
        sg.ResetOnSpawn = false
        sg.IgnoreGuiInset = true
        sg.Parent = plr:WaitForChild("PlayerGui")

        local btn = Instance.new("TextButton", sg)
        btn.Size = UDim2.new(0, 180, 0, 36)
        btn.Position = UDim2.new(0, 16, 0, 16)
        btn.BackgroundColor3 = Color3.fromRGB(34, 211, 238)
        btn.TextColor3 = Color3.fromRGB(10, 10, 12)
        btn.Font = Enum.Font.GothamBold
        btn.TextSize = 14
        btn.Text = "Apply for Staff"
        Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 10)

        local panel = Instance.new("Frame", sg)
        panel.Size = UDim2.new(0, 460, 0, 540)
        panel.Position = UDim2.new(0.5, -230, 0.5, -270)
        panel.BackgroundColor3 = Color3.fromRGB(18, 18, 24)
        panel.Visible = false
        Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 14)
        local stroke = Instance.new("UIStroke", panel)
        stroke.Color = Color3.fromRGB(45, 45, 60); stroke.Thickness = 1

        local title = Instance.new("TextLabel", panel)
        title.BackgroundTransparency = 1
        title.Size = UDim2.new(1, -32, 0, 28)
        title.Position = UDim2.new(0, 16, 0, 14)
        title.Font = Enum.Font.GothamBold
        title.TextXAlignment = Enum.TextXAlignment.Left
        title.TextColor3 = Color3.fromRGB(240, 240, 250)
        title.TextSize = 18
        title.Text = "Loading..."

        local subtitle = Instance.new("TextLabel", panel)
        subtitle.BackgroundTransparency = 1
        subtitle.Size = UDim2.new(1, -32, 0, 18)
        subtitle.Position = UDim2.new(0, 16, 0, 40)
        subtitle.Font = Enum.Font.Gotham
        subtitle.TextXAlignment = Enum.TextXAlignment.Left
        subtitle.TextColor3 = Color3.fromRGB(150, 150, 170)
        subtitle.TextSize = 12
        subtitle.Text = ""

        local close = Instance.new("TextButton", panel)
        close.Size = UDim2.new(0, 28, 0, 28); close.Position = UDim2.new(1, -36, 0, 12)
        close.BackgroundColor3 = Color3.fromRGB(35, 35, 45); close.TextColor3 = Color3.fromRGB(220, 220, 230)
        close.Font = Enum.Font.GothamBold; close.TextSize = 14; close.Text = "X"
        Instance.new("UICorner", close).CornerRadius = UDim.new(0, 8)
        close.MouseButton1Click:Connect(function() panel.Visible = false end)

        local scroll = Instance.new("ScrollingFrame", panel)
        scroll.Size = UDim2.new(1, -32, 1, -130); scroll.Position = UDim2.new(0, 16, 0, 70)
        scroll.BackgroundTransparency = 1
        scroll.CanvasSize = UDim2.new(0, 0, 0, 0); scroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
        scroll.ScrollBarThickness = 4
        local layout = Instance.new("UIListLayout", scroll); layout.Padding = UDim.new(0, 10)

        local send = Instance.new("TextButton", panel)
        send.Size = UDim2.new(1, -32, 0, 40); send.Position = UDim2.new(0, 16, 1, -56)
        send.BackgroundColor3 = Color3.fromRGB(34, 211, 238); send.TextColor3 = Color3.fromRGB(10, 10, 12)
        send.Font = Enum.Font.GothamBold; send.TextSize = 14; send.Text = "Submit application"
        Instance.new("UICorner", send).CornerRadius = UDim.new(0, 10)

        local inputs = {}
        local function render(form, workspace)
            for _, c in ipairs(scroll:GetChildren()) do
                if c:IsA("Frame") then c:Destroy() end
            end
            inputs = {}
            title.Text = form.title or "Application"
            subtitle.Text = (form.description or "") .. (workspace ~= "" and ("  -  " .. workspace) or "")
            for _, q in ipairs(form.questions or {}) do
                local row = Instance.new("Frame", scroll)
                row.BackgroundTransparency = 1
                row.Size = UDim2.new(1, 0, 0, 70)
                row.AutomaticSize = Enum.AutomaticSize.Y
                local lab = Instance.new("TextLabel", row)
                lab.BackgroundTransparency = 1
                lab.Size = UDim2.new(1, 0, 0, 18)
                lab.Font = Enum.Font.GothamMedium; lab.TextSize = 13
                lab.TextXAlignment = Enum.TextXAlignment.Left
                lab.TextColor3 = Color3.fromRGB(220, 220, 230)
                lab.Text = (q.required and "* " or "") .. (q.label or "")
                local box = Instance.new("TextBox", row)
                box.Position = UDim2.new(0, 0, 0, 22); box.Size = UDim2.new(1, 0, 0, 44)
                box.BackgroundColor3 = Color3.fromRGB(30, 30, 38)
                box.TextColor3 = Color3.fromRGB(240, 240, 250)
                box.PlaceholderText = q.help_text or ""
                box.PlaceholderColor3 = Color3.fromRGB(110, 110, 130)
                box.Font = Enum.Font.Gotham; box.TextSize = 13
                box.TextXAlignment = Enum.TextXAlignment.Left
                box.TextYAlignment = Enum.TextYAlignment.Top
                box.ClearTextOnFocus = false
                box.MultiLine = true; box.TextWrapped = true
                Instance.new("UICorner", box).CornerRadius = UDim.new(0, 8)
                local pad = Instance.new("UIPadding", box)
                pad.PaddingLeft = UDim.new(0, 10); pad.PaddingTop = UDim.new(0, 6)
                table.insert(inputs, { id = q.id, box = box })
            end
        end

        btn.MouseButton1Click:Connect(function()
            local payload = folder:WaitForChild("GetForm"):InvokeServer()
            if not payload or not payload.form then
                title.Text = "Applications closed"
                subtitle.Text = "Try again later."
            else
                render(payload.form, payload.workspace or "")
            end
            panel.Visible = true
        end)

        send.MouseButton1Click:Connect(function()
            local answers = {}
            for _, it in ipairs(inputs) do answers[it.id] = it.box.Text end
            send.Text = "Submitting..."
            local res = folder:WaitForChild("Submit"):InvokeServer(answers)
            if res and res.ok then
                send.Text = "Submitted - thank you"
                task.wait(2); panel.Visible = false; send.Text = "Submit application"
            else
                send.Text = "Failed - try again"
                task.wait(2); send.Text = "Submit application"
            end
        end)
    ]==]
    local s = Instance.new("LocalScript")
    s.Name = "FluxcoreAppClient"
    s.Source = src
    s.Parent = StarterPlayerScripts
end

print("[Fluxcore] Application Center ready.")
`;
}

export function RobloxAppCenterTab() {
  const [formId, setFormId] = useState("");
  const [workspace, setWorkspace] = useState("");
  const script = useMemo(() => buildScript(formId.trim(), workspace.trim()), [formId, workspace]);

  const copy = async () => {
    await navigator.clipboard.writeText(script);
    toast.success("Script copied");
  };
  const download = () => {
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxcore-application-center-${(workspace || "workspace").replace(/\s+/g, "-").toLowerCase()}.lua`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Roblox Application Center generator</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Generates a Luau script that loads a public Fluxcore application form in-game and submits answers straight into the workspace's application queue. Place it in <code>ServerScriptService</code>.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Workspace name</Label>
            <Input value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder="e.g. Shoply Shopping" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Public form ID (UUID)</Label>
            <Input value={formId} onChange={(e) => setFormId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" className="font-mono text-xs" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={copy}><Copy className="w-3 h-3 mr-1" /> Copy script</Button>
          <Button size="sm" variant="secondary" onClick={download}><Download className="w-3 h-3 mr-1" /> Download .lua</Button>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <pre className="text-[11px] leading-relaxed font-mono p-4 max-h-[520px] overflow-auto whitespace-pre text-foreground/90">
{script}
        </pre>
      </div>
    </div>
  );
}
