import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileCode2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// Public proxy. Roblox servers hit fluxcore.works (Vercel rewrite) which
// forwards to the application-center edge function.
const API_BASE = "https://fluxcore.works/https/application/supabase";

function buildConfigScript(apiKey: string, workspaceName: string) {
  const ws = workspaceName.replace(/"/g, '\\"');
  const key = apiKey.replace(/"/g, '\\"');
  return `--!strict
-- Fluxcore Application Center — CONFIG
-- Place this ModuleScript in ReplicatedStorage and name it "FluxcoreAppConfig".
-- Edit the values below at any time without touching the server / client scripts.

return {
    -- Your Application Center API key (Settings -> Tracking & Scripts -> Application Center API Key)
    API_KEY = "${key}",

    -- Shown in the welcome screen, e.g. "Shoply Shopping"
    WORKSPACE_NAME = "${ws}",

    -- If true, applicants can navigate back to previously answered questions and edit them.
    -- If false, once they press Next on a question it is locked in.
    ALLOW_GO_BACK = true,

    -- (Advanced) base URL. Leave as-is unless instructed by Fluxcore support.
    API_BASE = "${API_BASE}",
}
`;
}

const SERVER_SCRIPT = `--!strict
-- Fluxcore Application Center — SERVER
-- Place this Script in ServerScriptService. Requires HttpService enabled
-- (Game Settings -> Security -> Allow HTTP Requests).
-- Reads its API key + workspace name from ReplicatedStorage.FluxcoreAppConfig.

local HttpService       = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local cfg = require(ReplicatedStorage:WaitForChild("FluxcoreAppConfig"))
local API_BASE  = cfg.API_BASE
local API_KEY   = cfg.API_KEY
local WORKSPACE = cfg.WORKSPACE_NAME

local folder = ReplicatedStorage:FindFirstChild("FluxcoreApp")
if not folder then
    folder = Instance.new("Folder")
    folder.Name = "FluxcoreApp"
    folder.Parent = ReplicatedStorage
end
local getCatalog = folder:FindFirstChild("GetCatalog") or Instance.new("RemoteFunction", folder)
getCatalog.Name = "GetCatalog"
local submit = folder:FindFirstChild("Submit") or Instance.new("RemoteFunction", folder)
submit.Name = "Submit"
local getConfig = folder:FindFirstChild("GetConfig") or Instance.new("RemoteFunction", folder)
getConfig.Name = "GetConfig"

local function http(method: string, route: string, body: any?)
    local ok, res = pcall(function()
        return HttpService:RequestAsync({
            Url = API_BASE .. "/" .. route,
            Method = method,
            Headers = {
                ["X-API-Key"]    = API_KEY,
                ["Content-Type"] = "application/json",
            },
            Body = body and HttpService:JSONEncode(body) or nil,
        })
    end)
    if not ok or not res or not res.Success then
        warn("[Fluxcore] " .. method .. " " .. route .. " failed: " .. tostring(res and res.StatusMessage))
        return nil
    end
    local decoded
    local okDecode = pcall(function() decoded = HttpService:JSONDecode(res.Body) end)
    if not okDecode then return nil end
    return decoded
end

local catalog: any = nil
local function loadCatalog()
    catalog = http("GET", "list")
    if catalog then
        print(string.format("[Fluxcore] %s - %d open application(s)",
            catalog.workspace or WORKSPACE, #(catalog.forms or {})))
    else
        warn("[Fluxcore] Could not load application catalog.")
    end
end
loadCatalog()
task.spawn(function()
    while task.wait(120) do loadCatalog() end
end)

getCatalog.OnServerInvoke = function()
    if not catalog then loadCatalog() end
    return catalog or { workspace = WORKSPACE, forms = {} }
end

getConfig.OnServerInvoke = function()
    return { workspace = WORKSPACE, allow_go_back = cfg.ALLOW_GO_BACK ~= false }
end

submit.OnServerInvoke = function(player: Player, form_id: string, answers: { [string]: string })
    if typeof(form_id) ~= "string" or typeof(answers) ~= "table" then
        return { ok = false, error = "bad_payload" }
    end
    local result = http("POST", "submit", {
        form_id         = form_id,
        roblox_user_id  = tostring(player.UserId),
        roblox_username = player.Name,
        answers         = answers,
    })
    if result == nil then return { ok = false, error = "network" } end
    if result.error then return { ok = false, error = result.error } end
    return { ok = true, application_id = result.application_id }
end

print("[Fluxcore] Application Center server ready.")
`;

const CLIENT_SCRIPT = `--!strict
-- Fluxcore Application Center — CLIENT
-- Place this LocalScript in StarterPlayer -> StarterPlayerScripts.
-- Opens immediately on join, full-screen, one question at a time.

local Players = game:GetService("Players")
local RS      = game:GetService("ReplicatedStorage")
local folder  = RS:WaitForChild("FluxcoreApp")
local plr     = Players.LocalPlayer

local sg = Instance.new("ScreenGui")
sg.Name = "FluxcoreAppCenter"
sg.ResetOnSpawn = false
sg.IgnoreGuiInset = true
sg.DisplayOrder = 50
sg.Parent = plr:WaitForChild("PlayerGui")

local function rounded(parent, r) local c=Instance.new("UICorner",parent); c.CornerRadius=UDim.new(0,r); return c end

local cfg = folder:WaitForChild("GetConfig"):InvokeServer() or { workspace = "", allow_go_back = true }
local ALLOW_BACK = cfg.allow_go_back ~= false

local content = Instance.new("Frame", sg)
content.Size = UDim2.new(1, 0, 1, 0)
content.BackgroundColor3 = Color3.fromRGB(14, 14, 20)
content.BorderSizePixel = 0
local pad = Instance.new("UIPadding", content)
pad.PaddingTop = UDim.new(0, 96); pad.PaddingBottom = UDim.new(0, 28)
pad.PaddingLeft = UDim.new(0, 48); pad.PaddingRight = UDim.new(0, 48)

-- Header
local header = Instance.new("Frame", content)
header.BackgroundTransparency = 1
header.Size = UDim2.new(1, 0, 0, 64)
header.Position = UDim2.new(0, 0, 0, 80)

local title = Instance.new("TextLabel", header)
title.BackgroundTransparency = 1
title.Size = UDim2.new(1, 0, 0, 34)
title.Font = Enum.Font.GothamBold
title.TextXAlignment = Enum.TextXAlignment.Left
title.TextColor3 = Color3.fromRGB(240, 240, 250)
title.TextSize = 28
title.Text = "Welcome"

local subtitle = Instance.new("TextLabel", header)
subtitle.BackgroundTransparency = 1
subtitle.Size = UDim2.new(1, 0, 0, 22)
subtitle.Position = UDim2.new(0, 0, 0, 36)
subtitle.Font = Enum.Font.Gotham
subtitle.TextXAlignment = Enum.TextXAlignment.Left
subtitle.TextColor3 = Color3.fromRGB(150, 150, 170)
subtitle.TextSize = 14
subtitle.Text = ""

-- Catalog view
local catalogView = Instance.new("Frame", content)
catalogView.BackgroundTransparency = 1
catalogView.Size = UDim2.new(1, 0, 1, -176)
catalogView.Position = UDim2.new(0, 0, 0, 160)

local catalogScroll = Instance.new("ScrollingFrame", catalogView)
catalogScroll.Size = UDim2.new(1, 0, 1, 0)
catalogScroll.BackgroundTransparency = 1
catalogScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
catalogScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
catalogScroll.ScrollBarThickness = 6
local catalogLayout = Instance.new("UIListLayout", catalogScroll)
catalogLayout.Padding = UDim.new(0, 14)

local emptyLabel = Instance.new("TextLabel", catalogView)
emptyLabel.BackgroundTransparency = 1
emptyLabel.Size = UDim2.new(1, 0, 1, 0)
emptyLabel.Font = Enum.Font.GothamMedium
emptyLabel.TextSize = 20
emptyLabel.TextWrapped = true
emptyLabel.TextColor3 = Color3.fromRGB(180, 180, 200)
emptyLabel.Text = "Uh Oh - No applications yet, come back soon!"
emptyLabel.Visible = false

-- Form view (one question at a time)
local formView = Instance.new("Frame", content)
formView.BackgroundTransparency = 1
formView.Size = UDim2.new(1, 0, 1, -176)
formView.Position = UDim2.new(0, 0, 0, 160)
formView.Visible = false

-- progress bar
local progressBg = Instance.new("Frame", formView)
progressBg.Size = UDim2.new(1, 0, 0, 6)
progressBg.Position = UDim2.new(0, 0, 0, 0)
progressBg.BackgroundColor3 = Color3.fromRGB(35, 35, 45)
progressBg.BorderSizePixel = 0
rounded(progressBg, 3)
local progressFill = Instance.new("Frame", progressBg)
progressFill.Size = UDim2.new(0, 0, 1, 0)
progressFill.BackgroundColor3 = Color3.fromRGB(34, 211, 238)
progressFill.BorderSizePixel = 0
rounded(progressFill, 3)

local progressLabel = Instance.new("TextLabel", formView)
progressLabel.BackgroundTransparency = 1
progressLabel.Position = UDim2.new(0, 0, 0, 16)
progressLabel.Size = UDim2.new(1, 0, 0, 18)
progressLabel.Font = Enum.Font.Gotham
progressLabel.TextSize = 12
progressLabel.TextXAlignment = Enum.TextXAlignment.Left
progressLabel.TextColor3 = Color3.fromRGB(150, 150, 170)
progressLabel.Text = ""

-- Question label
local qLabel = Instance.new("TextLabel", formView)
qLabel.BackgroundTransparency = 1
qLabel.Position = UDim2.new(0, 0, 0, 50)
qLabel.Size = UDim2.new(1, 0, 0, 32)
qLabel.Font = Enum.Font.GothamBold
qLabel.TextSize = 22
qLabel.TextXAlignment = Enum.TextXAlignment.Left
qLabel.TextColor3 = Color3.fromRGB(240, 240, 250)
qLabel.TextWrapped = true
qLabel.Text = ""

local qHelp = Instance.new("TextLabel", formView)
qHelp.BackgroundTransparency = 1
qHelp.Position = UDim2.new(0, 0, 0, 86)
qHelp.Size = UDim2.new(1, 0, 0, 22)
qHelp.Font = Enum.Font.Gotham
qHelp.TextSize = 13
qHelp.TextXAlignment = Enum.TextXAlignment.Left
qHelp.TextColor3 = Color3.fromRGB(150, 150, 170)
qHelp.TextWrapped = true
qHelp.Text = ""

-- Input box
local qBox = Instance.new("TextBox", formView)
qBox.Position = UDim2.new(0, 0, 0, 120)
qBox.Size = UDim2.new(1, 0, 0, 180)
qBox.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
qBox.TextColor3 = Color3.fromRGB(240, 240, 250)
qBox.PlaceholderText = "Type your answer here..."
qBox.PlaceholderColor3 = Color3.fromRGB(110, 110, 130)
qBox.Font = Enum.Font.Gotham
qBox.TextSize = 15
qBox.TextXAlignment = Enum.TextXAlignment.Left
qBox.TextYAlignment = Enum.TextYAlignment.Top
qBox.ClearTextOnFocus = false
qBox.MultiLine = true
qBox.TextWrapped = true
qBox.Text = ""
rounded(qBox, 10)
local boxPad = Instance.new("UIPadding", qBox)
boxPad.PaddingLeft = UDim.new(0, 14); boxPad.PaddingTop = UDim.new(0, 10)
boxPad.PaddingRight = UDim.new(0, 14); boxPad.PaddingBottom = UDim.new(0, 10)

-- Footer buttons
local footer = Instance.new("Frame", formView)
footer.BackgroundTransparency = 1
footer.Position = UDim2.new(0, 0, 1, -56)
footer.Size = UDim2.new(1, 0, 0, 46)

local backBtn = Instance.new("TextButton", footer)
backBtn.Size = UDim2.new(0, 140, 1, 0); backBtn.Position = UDim2.new(0, 0, 0, 0)
backBtn.BackgroundColor3 = Color3.fromRGB(35, 35, 45)
backBtn.TextColor3 = Color3.fromRGB(220, 220, 230)
backBtn.Font = Enum.Font.GothamMedium; backBtn.TextSize = 14
backBtn.Text = "< Back"; backBtn.AutoButtonColor = true
rounded(backBtn, 10)

local nextBtn = Instance.new("TextButton", footer)
nextBtn.Size = UDim2.new(0, 200, 1, 0); nextBtn.Position = UDim2.new(1, -200, 0, 0)
nextBtn.BackgroundColor3 = Color3.fromRGB(34, 211, 238)
nextBtn.TextColor3 = Color3.fromRGB(10, 10, 12)
nextBtn.Font = Enum.Font.GothamBold; nextBtn.TextSize = 15
nextBtn.Text = "Next >"; nextBtn.AutoButtonColor = true
rounded(nextBtn, 10)

local exitBtn = Instance.new("TextButton", formView)
exitBtn.Size = UDim2.new(0, 110, 0, 28); exitBtn.Position = UDim2.new(1, -110, 0, 0)
exitBtn.AnchorPoint = Vector2.new(0, 0)
exitBtn.BackgroundColor3 = Color3.fromRGB(45, 28, 32)
exitBtn.TextColor3 = Color3.fromRGB(255, 180, 180)
exitBtn.Font = Enum.Font.GothamMedium; exitBtn.TextSize = 12
exitBtn.Text = "Exit to menu"
rounded(exitBtn, 8)

local activeForm = nil
local answers = {}
local stepIndex = 1

local showForm  -- forward decl
local renderStep  -- forward decl

local function showCatalog(catalog)
    formView.Visible = false
    catalogView.Visible = true
    for _, c in ipairs(catalogScroll:GetChildren()) do
        if c:IsA("TextButton") then c:Destroy() end
    end
    local ws = (catalog and catalog.workspace) or cfg.workspace or ""
    title.Text = "Welcome" .. (ws ~= "" and (" to " .. ws) or "")
    local forms = (catalog and catalog.forms) or {}
    if #forms == 0 then
        subtitle.Text = ""
        emptyLabel.Visible = true
        catalogScroll.Visible = false
        return
    end
    emptyLabel.Visible = false
    catalogScroll.Visible = true
    subtitle.Text = "Choose an application to get started."
    for _, f in ipairs(forms) do
        local card = Instance.new("TextButton", catalogScroll)
        card.Size = UDim2.new(1, -8, 0, 86)
        card.BackgroundColor3 = Color3.fromRGB(28, 28, 38)
        card.AutoButtonColor = true; card.Text = ""
        rounded(card, 12)
        local lab = Instance.new("TextLabel", card)
        lab.BackgroundTransparency = 1
        lab.Position = UDim2.new(0, 18, 0, 12); lab.Size = UDim2.new(1, -36, 0, 24)
        lab.Font = Enum.Font.GothamBold; lab.TextSize = 17
        lab.TextXAlignment = Enum.TextXAlignment.Left
        lab.TextColor3 = Color3.fromRGB(240, 240, 250)
        lab.Text = f.title or "Application"
        local desc = Instance.new("TextLabel", card)
        desc.BackgroundTransparency = 1
        desc.Position = UDim2.new(0, 18, 0, 40); desc.Size = UDim2.new(1, -36, 0, 40)
        desc.Font = Enum.Font.Gotham; desc.TextSize = 13
        desc.TextXAlignment = Enum.TextXAlignment.Left
        desc.TextYAlignment = Enum.TextYAlignment.Top
        desc.TextWrapped = true
        desc.TextColor3 = Color3.fromRGB(150, 150, 170)
        desc.Text = f.description or ""
        card.MouseButton1Click:Connect(function() showForm(f) end)
    end
end

renderStep = function()
    if not activeForm then return end
    local qs = activeForm.questions or {}
    local total = #qs
    if total == 0 then return end
    if stepIndex < 1 then stepIndex = 1 end
    if stepIndex > total then stepIndex = total end
    local q = qs[stepIndex]
    progressLabel.Text = "Question " .. stepIndex .. " of " .. total
    progressFill.Size = UDim2.new(stepIndex / total, 0, 1, 0)
    qLabel.Text = (q.required and "* " or "") .. (q.label or "")
    qHelp.Text = q.help_text or ""
    qBox.Text = answers[q.id] or ""
    -- Back is enabled only if config allows AND not at first
    backBtn.Visible = ALLOW_BACK and stepIndex > 1
    if stepIndex == total then
        nextBtn.Text = "Submit application"
    else
        nextBtn.Text = "Next >"
    end
end

showForm = function(form)
    activeForm = form
    answers = {}
    stepIndex = 1
    catalogView.Visible = false
    formView.Visible = true
    title.Text = form.title or "Application"
    subtitle.Text = form.description or ""
    renderStep()
end

local function saveCurrent()
    if not activeForm then return end
    local q = activeForm.questions[stepIndex]
    if q then answers[q.id] = qBox.Text end
end

local function currentIsValid()
    local q = activeForm.questions[stepIndex]
    if q and q.required then
        local v = qBox.Text or ""
        if v:gsub("%s+", "") == "" then return false end
    end
    return true
end

backBtn.MouseButton1Click:Connect(function()
    if not ALLOW_BACK then return end
    saveCurrent()
    stepIndex = math.max(1, stepIndex - 1)
    renderStep()
end)

nextBtn.MouseButton1Click:Connect(function()
    if not activeForm then return end
    if not currentIsValid() then
        nextBtn.Text = "This question is required"
        task.wait(1.2)
        renderStep()
        return
    end
    saveCurrent()
    local total = #activeForm.questions
    if stepIndex < total then
        stepIndex += 1
        renderStep()
        return
    end
    -- Submit
    nextBtn.Text = "Submitting..."
    local res = folder:WaitForChild("Submit"):InvokeServer(activeForm.id, answers)
    if res and res.ok then
        nextBtn.Text = "Submitted - thank you"
        task.wait(2)
        activeForm = nil
        local catalog = folder:WaitForChild("GetCatalog"):InvokeServer()
        showCatalog(catalog)
        nextBtn.Text = "Next >"
    else
        nextBtn.Text = "Failed - try again"
        task.wait(2); renderStep()
    end
end)

exitBtn.MouseButton1Click:Connect(function()
    activeForm = nil
    local catalog = folder:WaitForChild("GetCatalog"):InvokeServer()
    showCatalog(catalog)
end)

-- Open immediately on join
local catalog = folder:WaitForChild("GetCatalog"):InvokeServer()
showCatalog(catalog)
`;

export function RobloxAppCenterTab() {
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string }>>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_accessible_workspaces");
      const owned = (data || []).filter((w: any) => w.role === "Owner");
      setWorkspaces(owned.map((w: any) => ({ id: w.id, name: w.name })));
    })();
  }, []);

  const configScript = useMemo(
    () => buildConfigScript(apiKey.trim() || "fxac_REPLACE_WITH_KEY", workspaceName.trim()),
    [apiKey, workspaceName],
  );

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const download = (text: string, name: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const slug = (workspaceName || "workspace").replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Roblox Application Center generator</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Generates <strong>three Roblox scripts</strong>. The Config holds your API key and workspace name; the Server and Client are fixed — paste them once and never edit them again. All traffic is proxied through <code>fluxcore.works/https/application/supabase</code>.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Workspace</Label>
            <select
              className="w-full bg-background border border-border rounded-md h-9 px-2 text-sm"
              value={workspaceId}
              onChange={(e) => {
                const w = workspaces.find((x) => x.id === e.target.value);
                setWorkspaceId(e.target.value);
                setWorkspaceName(w?.name || "");
                setApiKey("");
                setRevealed(false);
              }}
            >
              <option value="">Select a workspace you own…</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Application Center API key</Label>
            <div className="flex gap-2">
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste the fxac_… key from Settings → Tracking & Scripts"
                className="font-mono text-xs"
                type={revealed ? "text" : "password"}
              />
              {apiKey && (
                <Button variant="ghost" size="icon" onClick={() => setRevealed((r) => !r)} title={revealed ? "Hide" : "Show"}>
                  {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Generate / rotate this key in <strong>Settings → Tracking & Scripts → Application Center API Key</strong>.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
          <p className="text-foreground font-medium text-xs">Installation</p>
          <p>1. Enable <strong>HTTP Requests</strong>: Game Settings → Security → Allow HTTP Requests.</p>
          <p>2. Paste <strong>Script 1 — Config</strong> into a <code>ModuleScript</code> in <code>ReplicatedStorage</code> named <code>FluxcoreAppConfig</code>.</p>
          <p>3. Paste <strong>Script 2 — Server</strong> into a new <code>Script</code> in <code>ServerScriptService</code>.</p>
          <p>4. Paste <strong>Script 3 — Client</strong> into a new <code>LocalScript</code> in <code>StarterPlayer → StarterPlayerScripts</code>.</p>
          <p>5. Publish & play — questions appear one at a time. Set <code>ALLOW_GO_BACK</code> in the Config to control whether applicants can revisit answers.</p>
        </div>
      </div>

      {/* CONFIG SCRIPT */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Script 1 — Config <span className="text-muted-foreground font-normal">(ModuleScript)</span></p>
            <p className="text-[11px] text-muted-foreground">Place in <code>ReplicatedStorage</code> as a <code>ModuleScript</code> named <code>FluxcoreAppConfig</code>.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => copy(configScript, "Config script")} disabled={!apiKey}>
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => download(configScript, `fluxcore-appcenter-config-${slug}.lua`)} disabled={!apiKey}>
              <Download className="w-3 h-3 mr-1" /> .lua
            </Button>
          </div>
        </div>
        <pre className="text-[11px] leading-relaxed font-mono p-4 max-h-[360px] overflow-auto whitespace-pre text-foreground/90">
{configScript}
        </pre>
      </div>

      {/* SERVER SCRIPT */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Script 2 — Server</p>
            <p className="text-[11px] text-muted-foreground">Place in <code>ServerScriptService</code> as a <code>Script</code>.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => copy(SERVER_SCRIPT, "Server script")}>
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => download(SERVER_SCRIPT, `fluxcore-appcenter-server.lua`)}>
              <Download className="w-3 h-3 mr-1" /> .lua
            </Button>
          </div>
        </div>
        <pre className="text-[11px] leading-relaxed font-mono p-4 max-h-[420px] overflow-auto whitespace-pre text-foreground/90">
{SERVER_SCRIPT}
        </pre>
      </div>

      {/* CLIENT SCRIPT */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Script 3 — Client (full-screen UI)</p>
            <p className="text-[11px] text-muted-foreground">Place in <code>StarterPlayer → StarterPlayerScripts</code> as a <code>LocalScript</code>.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => copy(CLIENT_SCRIPT, "Client script")}>
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => download(CLIENT_SCRIPT, `fluxcore-appcenter-client.lua`)}>
              <Download className="w-3 h-3 mr-1" /> .lua
            </Button>
          </div>
        </div>
        <pre className="text-[11px] leading-relaxed font-mono p-4 max-h-[420px] overflow-auto whitespace-pre text-foreground/90">
{CLIENT_SCRIPT}
        </pre>
      </div>
    </div>
  );
}
