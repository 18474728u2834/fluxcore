import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileCode2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// Public proxy. Roblox servers hit fluxcore.works (Vercel rewrite) which
// forwards to the application-center edge function. The Supabase host is
// never written into the Lua source — only the Fluxcore domain is.
const API_BASE = "https://fluxcore.works/https/application/supabase";

function buildServerScript(apiKey: string, workspaceName: string) {
  const ws = workspaceName.replace(/"/g, '\\"');
  const key = apiKey.replace(/"/g, '\\"');
  return `--!strict
-- Fluxcore Application Center — SERVER
-- Workspace : ${ws || "<unset>"}
-- Place this Script in ServerScriptService. Requires HttpService enabled (Game Settings → Security → Allow HTTP Requests).

local HttpService       = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local API_BASE  = "${API_BASE}"
local API_KEY   = "${key}"
local WORKSPACE = "${ws}"

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
        print(string.format("[Fluxcore] %s — %d open application(s)",
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
}

const CLIENT_SCRIPT = `--!strict
-- Fluxcore Application Center — CLIENT
-- Place this LocalScript in StarterPlayer → StarterPlayerScripts.

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

-- Floating launcher button (top-left)
local btn = Instance.new("TextButton", sg)
btn.Size = UDim2.new(0, 180, 0, 38)
btn.Position = UDim2.new(0, 16, 0, 16)
btn.BackgroundColor3 = Color3.fromRGB(34, 211, 238)
btn.TextColor3 = Color3.fromRGB(10, 10, 12)
btn.Font = Enum.Font.GothamBold
btn.TextSize = 14
btn.Text = "Apply for Staff"
btn.AutoButtonColor = true
rounded(btn, 10)

-- Full-screen dim background
local dim = Instance.new("Frame", sg)
dim.Size = UDim2.new(1, 0, 1, 0)
dim.Position = UDim2.new(0, 0, 0, 0)
dim.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
dim.BackgroundTransparency = 0.35
dim.BorderSizePixel = 0
dim.Visible = false

-- Full-screen panel (the application UI)
local panel = Instance.new("Frame", dim)
panel.Size = UDim2.new(1, 0, 1, 0)
panel.Position = UDim2.new(0, 0, 0, 0)
panel.BackgroundColor3 = Color3.fromRGB(14, 14, 20)
panel.BorderSizePixel = 0

-- Inner content container, max 720px wide & centered
local content = Instance.new("Frame", panel)
content.AnchorPoint = Vector2.new(0.5, 0.5)
content.Position = UDim2.new(0.5, 0, 0.5, 0)
content.Size = UDim2.new(1, -48, 1, -48)
content.BackgroundColor3 = Color3.fromRGB(18, 18, 26)
content.BorderSizePixel = 0
rounded(content, 16)
local maxW = Instance.new("UISizeConstraint", content)
maxW.MaxSize = Vector2.new(820, 99999)
local pad = Instance.new("UIPadding", content)
pad.PaddingTop = UDim.new(0, 22); pad.PaddingBottom = UDim.new(0, 22)
pad.PaddingLeft = UDim.new(0, 24); pad.PaddingRight = UDim.new(0, 24)
local stroke = Instance.new("UIStroke", content)
stroke.Color = Color3.fromRGB(45, 45, 60); stroke.Thickness = 1

-- Header
local header = Instance.new("Frame", content)
header.BackgroundTransparency = 1
header.Size = UDim2.new(1, 0, 0, 56)

local title = Instance.new("TextLabel", header)
title.BackgroundTransparency = 1
title.Size = UDim2.new(1, -50, 0, 28)
title.Position = UDim2.new(0, 0, 0, 0)
title.Font = Enum.Font.GothamBold
title.TextXAlignment = Enum.TextXAlignment.Left
title.TextColor3 = Color3.fromRGB(240, 240, 250)
title.TextSize = 22
title.Text = "Welcome"

local subtitle = Instance.new("TextLabel", header)
subtitle.BackgroundTransparency = 1
subtitle.Size = UDim2.new(1, -50, 0, 20)
subtitle.Position = UDim2.new(0, 0, 0, 30)
subtitle.Font = Enum.Font.Gotham
subtitle.TextXAlignment = Enum.TextXAlignment.Left
subtitle.TextColor3 = Color3.fromRGB(150, 150, 170)
subtitle.TextSize = 13
subtitle.Text = ""

local close = Instance.new("TextButton", header)
close.Size = UDim2.new(0, 36, 0, 36); close.Position = UDim2.new(1, -36, 0, 0)
close.BackgroundColor3 = Color3.fromRGB(35, 35, 45); close.TextColor3 = Color3.fromRGB(220, 220, 230)
close.Font = Enum.Font.GothamBold; close.TextSize = 16; close.Text = "X"
rounded(close, 10)
close.MouseButton1Click:Connect(function() dim.Visible = false end)

-- Catalog view (welcome / list of forms)
local catalogView = Instance.new("Frame", content)
catalogView.BackgroundTransparency = 1
catalogView.Size = UDim2.new(1, 0, 1, -72)
catalogView.Position = UDim2.new(0, 0, 0, 72)

local catalogScroll = Instance.new("ScrollingFrame", catalogView)
catalogScroll.Size = UDim2.new(1, 0, 1, 0)
catalogScroll.BackgroundTransparency = 1
catalogScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
catalogScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
catalogScroll.ScrollBarThickness = 5
local catalogLayout = Instance.new("UIListLayout", catalogScroll)
catalogLayout.Padding = UDim.new(0, 12)

local emptyLabel = Instance.new("TextLabel", catalogView)
emptyLabel.BackgroundTransparency = 1
emptyLabel.Size = UDim2.new(1, 0, 1, 0)
emptyLabel.Font = Enum.Font.GothamMedium
emptyLabel.TextSize = 18
emptyLabel.TextWrapped = true
emptyLabel.TextColor3 = Color3.fromRGB(180, 180, 200)
emptyLabel.Text = "Uh Oh — No applications yet, come back soon!"
emptyLabel.Visible = false

-- Form view (selected application)
local formView = Instance.new("Frame", content)
formView.BackgroundTransparency = 1
formView.Size = UDim2.new(1, 0, 1, -72)
formView.Position = UDim2.new(0, 0, 0, 72)
formView.Visible = false

local back = Instance.new("TextButton", formView)
back.Size = UDim2.new(0, 100, 0, 30); back.Position = UDim2.new(0, 0, 0, 0)
back.BackgroundColor3 = Color3.fromRGB(35, 35, 45); back.TextColor3 = Color3.fromRGB(220, 220, 230)
back.Font = Enum.Font.GothamMedium; back.TextSize = 13; back.Text = "< Back"
rounded(back, 8)

local formScroll = Instance.new("ScrollingFrame", formView)
formScroll.Size = UDim2.new(1, 0, 1, -92); formScroll.Position = UDim2.new(0, 0, 0, 40)
formScroll.BackgroundTransparency = 1
formScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
formScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
formScroll.ScrollBarThickness = 5
local formLayout = Instance.new("UIListLayout", formScroll)
formLayout.Padding = UDim.new(0, 12)

local send = Instance.new("TextButton", formView)
send.Size = UDim2.new(1, 0, 0, 42); send.Position = UDim2.new(0, 0, 1, -42)
send.BackgroundColor3 = Color3.fromRGB(34, 211, 238); send.TextColor3 = Color3.fromRGB(10, 10, 12)
send.Font = Enum.Font.GothamBold; send.TextSize = 15; send.Text = "Submit application"
rounded(send, 10)

local activeForm = nil
local inputs = {}

local showForm  -- forward decl

local function showCatalog(catalog)
    formView.Visible = false
    catalogView.Visible = true
    for _, c in ipairs(catalogScroll:GetChildren()) do
        if c:IsA("TextButton") then c:Destroy() end
    end
    local ws = catalog and catalog.workspace or ""
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
        card.Size = UDim2.new(1, -8, 0, 78)
        card.BackgroundColor3 = Color3.fromRGB(28, 28, 38)
        card.AutoButtonColor = true
        card.Text = ""
        rounded(card, 12)
        local lab = Instance.new("TextLabel", card)
        lab.BackgroundTransparency = 1
        lab.Position = UDim2.new(0, 16, 0, 10); lab.Size = UDim2.new(1, -32, 0, 22)
        lab.Font = Enum.Font.GothamBold; lab.TextSize = 16
        lab.TextXAlignment = Enum.TextXAlignment.Left
        lab.TextColor3 = Color3.fromRGB(240, 240, 250)
        lab.Text = f.title or "Application"
        local desc = Instance.new("TextLabel", card)
        desc.BackgroundTransparency = 1
        desc.Position = UDim2.new(0, 16, 0, 36); desc.Size = UDim2.new(1, -32, 0, 36)
        desc.Font = Enum.Font.Gotham; desc.TextSize = 13
        desc.TextXAlignment = Enum.TextXAlignment.Left
        desc.TextYAlignment = Enum.TextYAlignment.Top
        desc.TextWrapped = true
        desc.TextColor3 = Color3.fromRGB(150, 150, 170)
        desc.Text = f.description or ""
        card.MouseButton1Click:Connect(function() showForm(f) end)
    end
end

showForm = function(form)
    activeForm = form
    catalogView.Visible = false
    formView.Visible = true
    title.Text = form.title or "Application"
    subtitle.Text = form.description or ""
    for _, c in ipairs(formScroll:GetChildren()) do
        if c:IsA("Frame") then c:Destroy() end
    end
    inputs = {}
    for _, q in ipairs(form.questions or {}) do
        local row = Instance.new("Frame", formScroll)
        row.BackgroundTransparency = 1
        row.Size = UDim2.new(1, -8, 0, 86)
        row.AutomaticSize = Enum.AutomaticSize.Y
        local lab = Instance.new("TextLabel", row)
        lab.BackgroundTransparency = 1
        lab.Size = UDim2.new(1, 0, 0, 20)
        lab.Font = Enum.Font.GothamMedium; lab.TextSize = 14
        lab.TextXAlignment = Enum.TextXAlignment.Left
        lab.TextColor3 = Color3.fromRGB(220, 220, 230)
        lab.Text = (q.required and "* " or "") .. (q.label or "")
        local box = Instance.new("TextBox", row)
        box.Position = UDim2.new(0, 0, 0, 24); box.Size = UDim2.new(1, 0, 0, 58)
        box.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
        box.TextColor3 = Color3.fromRGB(240, 240, 250)
        box.PlaceholderText = q.help_text or ""
        box.PlaceholderColor3 = Color3.fromRGB(110, 110, 130)
        box.Font = Enum.Font.Gotham; box.TextSize = 13
        box.TextXAlignment = Enum.TextXAlignment.Left
        box.TextYAlignment = Enum.TextYAlignment.Top
        box.ClearTextOnFocus = false
        box.MultiLine = true; box.TextWrapped = true
        box.Text = ""
        rounded(box, 8)
        local pd = Instance.new("UIPadding", box)
        pd.PaddingLeft = UDim.new(0, 12); pd.PaddingTop = UDim.new(0, 8)
        pd.PaddingRight = UDim.new(0, 12); pd.PaddingBottom = UDim.new(0, 8)
        table.insert(inputs, { id = q.id, box = box })
    end
end

back.MouseButton1Click:Connect(function()
    local catalog = folder:WaitForChild("GetCatalog"):InvokeServer()
    showCatalog(catalog)
end)

btn.MouseButton1Click:Connect(function()
    dim.Visible = true
    local catalog = folder:WaitForChild("GetCatalog"):InvokeServer()
    showCatalog(catalog)
end)

send.MouseButton1Click:Connect(function()
    if not activeForm then return end
    local answers = {}
    for _, it in ipairs(inputs) do answers[it.id] = it.box.Text end
    send.Text = "Submitting..."
    local res = folder:WaitForChild("Submit"):InvokeServer(activeForm.id, answers)
    if res and res.ok then
        send.Text = "Submitted — thank you"
        task.wait(2); dim.Visible = false; send.Text = "Submit application"
    else
        send.Text = "Failed — try again"
        task.wait(2); send.Text = "Submit application"
    end
end)
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

  const serverScript = useMemo(
    () => buildServerScript(apiKey.trim() || "fxac_REPLACE_WITH_KEY", workspaceName.trim()),
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
    a.href = url;
    a.download = name;
    a.click();
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
          Generates <strong>two Roblox scripts</strong> for the in-game Application Center. Requests are routed through <code>fluxcore.works/https/application/supabase</code> and authenticated with a workspace-specific API key — no Supabase URL or UUIDs are written into the Lua source.
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
              The owner generates / rotates this key in <strong>Settings → Tracking & Scripts → Application Center API Key</strong>.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
          <p className="text-foreground font-medium text-xs">Installation</p>
          <p>1. Enable <strong>HTTP Requests</strong>: Game Settings → Security → Allow HTTP Requests.</p>
          <p>2. Paste <strong>Script 1 (Server)</strong> into a new <code>Script</code> in <code>ServerScriptService</code>.</p>
          <p>3. Paste <strong>Script 2 (Client)</strong> into a new <code>LocalScript</code> in <code>StarterPlayer → StarterPlayerScripts</code>.</p>
          <p>4. Publish & play — a full-screen "Apply for Staff" launcher appears for every player.</p>
        </div>
      </div>

      {/* SERVER SCRIPT */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Script 1 — Server</p>
            <p className="text-[11px] text-muted-foreground">Place in <code>ServerScriptService</code> as a <code>Script</code>.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => copy(serverScript, "Server script")} disabled={!apiKey}>
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => download(serverScript, `fluxcore-appcenter-server-${slug}.lua`)} disabled={!apiKey}>
              <Download className="w-3 h-3 mr-1" /> .lua
            </Button>
          </div>
        </div>
        <pre className="text-[11px] leading-relaxed font-mono p-4 max-h-[420px] overflow-auto whitespace-pre text-foreground/90">
{serverScript}
        </pre>
      </div>

      {/* CLIENT SCRIPT */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Script 2 — Client (full-screen UI)</p>
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
