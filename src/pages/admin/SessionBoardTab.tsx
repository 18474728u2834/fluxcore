import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Download, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Filter = "all" | "shift" | "training" | "event";

function buildConfig(domain: string, apiKey: string, filter: Filter, boardName: string) {
  const d = domain.replace(/"/g, '\\"').replace(/\/+$/, "");
  const k = apiKey.replace(/"/g, '\\"');
  const b = boardName.replace(/"/g, '\\"');
  return `--!strict
-- Fluxcore Session Board — CONFIG
-- Place this ModuleScript anywhere (e.g. ServerScriptService) and name it "SessionBoardConfig".
-- The "Handler" Script must be a CHILD of this ModuleScript.

return {
    -- Your workspace domain (Settings -> Subdomain), no trailing slash.
    -- e.g. "https://shoply.fluxcore.works" or "https://fluxcore.works"
    DOMAIN = "${d}",

    -- Sessions API key (Settings -> Tracking & Scripts -> Sessions / Workspace API key)
    API_KEY = "${k}",

    -- Which sessions to show: "all" | "shift" | "training" | "event"
    CATEGORY = "${filter}",

    -- Only today's sessions? (false = every upcoming session the API returns)
    TODAY_ONLY = true,

    -- Name of the Part / Model in Workspace to mount the board on.
    -- Leave "" to show the board as a ScreenGui instead.
    BOARD_NAME = "${b}",

    -- Refresh interval in seconds
    REFRESH_SECONDS = 30,

    -- Header text per category (shown in the gradient pill at the top)
    TITLES = {
        all      = "Todays Sessions",
        shift    = "Todays Shifts",
        training = "Todays Trainings",
        event    = "Todays Events",
    },

    -- Look & feel
    ACCENT       = Color3.fromRGB(34, 211, 238),
    BACKGROUND   = Color3.fromRGB(10, 10, 12),
    CARD         = Color3.fromRGB(19, 19, 21),
    STROKE       = Color3.fromRGB(35, 35, 38),
    EMPTY_TEXT   = "No sessions scheduled",
}
`;
}

const HANDLER = `--!strict
-- Fluxcore Session Board — HANDLER
-- This Script must be a CHILD of the "SessionBoardConfig" ModuleScript.
-- Requires HTTP Requests enabled (Game Settings -> Security -> Allow HTTP Requests).

local HttpService = game:GetService("HttpService")
local Players     = game:GetService("Players")

local cfg = require(script.Parent)

local ACCENT     = cfg.ACCENT     or Color3.fromRGB(34, 211, 238)
local BACKGROUND = cfg.BACKGROUND or Color3.fromRGB(10, 10, 12)
local CARD       = cfg.CARD       or Color3.fromRGB(19, 19, 21)
local STROKE     = cfg.STROKE     or Color3.fromRGB(35, 35, 38)
local CATEGORY   = string.lower(cfg.CATEGORY or "all")
local TITLE      = (cfg.TITLES and cfg.TITLES[CATEGORY]) or "Todays Sessions"

--------------------------------------------------------------------- fetching
local function fetch(): { any }
    local url = string.format(
        "%s/api/v1/sessions?category=%s&today=%s",
        cfg.DOMAIN, CATEGORY, tostring(cfg.TODAY_ONLY ~= false)
    )
    local ok, res = pcall(function()
        return HttpService:RequestAsync({
            Url = url,
            Method = "GET",
            Headers = { ["x-api-key"] = cfg.API_KEY, ["Content-Type"] = "application/json" },
        })
    end)
    if not ok or not res.Success then
        warn("[Fluxcore] Session fetch failed:", ok and res.StatusCode or res)
        return {}
    end
    local decoded
    local decodeOk = pcall(function() decoded = HttpService:JSONDecode(res.Body) end)
    if not decodeOk or type(decoded) ~= "table" then return {} end
    local list = decoded.sessions or {}
    table.sort(list, function(a, b) return tostring(a.date) < tostring(b.date) end)
    return list
end

------------------------------------------------------------------- formatting
local MONTHS = { "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec" }

local function parseISO(iso: string?): number?
    if type(iso) ~= "string" then return nil end
    local y, mo, d, h, mi = string.match(iso, "(%d+)-(%d+)-(%d+)T(%d+):(%d+)")
    if not y then return nil end
    return os.time({
        year = tonumber(y), month = tonumber(mo), day = tonumber(d),
        hour = tonumber(h), min = tonumber(mi), sec = 0,
    })
end

local function clockLabel(iso: string?): string
    local t = parseISO(iso)
    if not t then return "TBD" end
    local d = os.date("!*t", t)
    local hour12 = d.hour % 12
    if hour12 == 0 then hour12 = 12 end
    return string.format("%d%s %s", hour12, d.min > 0 and (":" .. string.format("%02d", d.min)) or "", d.hour < 12 and "AM" or "PM")
end

local function dayLabel(iso: string?): string
    local t = parseISO(iso)
    if not t then return "" end
    local d = os.date("!*t", t)
    return string.format("%d %s", d.day, MONTHS[d.month])
end

local function isLive(s): boolean
    local t = parseISO(s.date)
    if not t then return false end
    local dur = (tonumber(s.duration) or 60) * 60
    local now = os.time()
    return now >= t and now <= t + dur
end

local function titleOf(s): string
    local cat = s.category or (s.type and s.type.category) or "session"
    return string.format("%s %s", string.upper(string.sub(cat, 1, 1)) .. string.sub(cat, 2), clockLabel(s.date))
end

local function headshot(userId): string
    local id = tonumber(userId)
    if not id or id <= 0 then return "" end
    return "rbxthumb://type=AvatarHeadShot&id=" .. tostring(id) .. "&w=150&h=150"
end

------------------------------------------------------------------------- ui
local function corner(p: Instance, r: number)
    local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r); c.Parent = p
end
local function stroke(p: Instance, col: Color3, t: number?)
    local s = Instance.new("UIStroke"); s.Color = col; s.Thickness = t or 1; s.Parent = p
end
local function pad(p: Instance, v: number)
    local u = Instance.new("UIPadding")
    u.PaddingTop = UDim.new(0, v); u.PaddingBottom = UDim.new(0, v)
    u.PaddingLeft = UDim.new(0, v); u.PaddingRight = UDim.new(0, v)
    u.Parent = p
end

local function avatarChip(parent: Instance, order: number, role: string, name: string, userId): Frame
    local chip = Instance.new("Frame")
    chip.BackgroundColor3 = Color3.fromRGB(28, 28, 32)
    chip.BackgroundTransparency = 0.25
    chip.Size = UDim2.new(0, 148, 1, 0)
    chip.LayoutOrder = order
    chip.BorderSizePixel = 0
    corner(chip, 999)
    stroke(chip, STROKE)

    local img = Instance.new("ImageLabel")
    img.BackgroundColor3 = Color3.fromRGB(45, 45, 50)
    img.Size = UDim2.fromOffset(26, 26)
    img.Position = UDim2.new(0, 3, 0.5, 0)
    img.AnchorPoint = Vector2.new(0, 0.5)
    img.Image = headshot(userId)
    img.BorderSizePixel = 0
    corner(img, 999)
    img.Parent = chip

    local lbl = Instance.new("TextLabel")
    lbl.BackgroundTransparency = 1
    lbl.Position = UDim2.new(0, 35, 0, 0)
    lbl.Size = UDim2.new(1, -42, 1, 0)
    lbl.Font = Enum.Font.GothamMedium
    lbl.TextXAlignment = Enum.TextXAlignment.Left
    lbl.TextSize = 11
    lbl.TextColor3 = Color3.fromRGB(215, 215, 220)
    lbl.TextTruncate = Enum.TextTruncate.AtEnd
    lbl.Text = role .. "  " .. (name or "—")
    lbl.Parent = chip

    chip.Parent = parent
    return chip
end

local function buildCard(s, order: number): Frame
    local card = Instance.new("Frame")
    card.BackgroundColor3 = CARD
    card.Size = UDim2.new(1, 0, 0, 118)
    card.LayoutOrder = order
    card.BorderSizePixel = 0
    corner(card, 12)
    stroke(card, STROKE)

    local live = isLive(s)

    -- accent rail on the left edge
    local rail = Instance.new("Frame")
    rail.Size = UDim2.new(0, 3, 1, -20)
    rail.Position = UDim2.new(0, 0, 0.5, 0)
    rail.AnchorPoint = Vector2.new(0, 0.5)
    rail.BackgroundColor3 = live and Color3.fromRGB(34, 197, 94) or ACCENT
    rail.BackgroundTransparency = live and 0 or 0.35
    rail.BorderSizePixel = 0
    corner(rail, 999)
    rail.Parent = card

    local body = Instance.new("Frame")
    body.BackgroundTransparency = 1
    body.Position = UDim2.new(0, 12, 0, 0)
    body.Size = UDim2.new(1, -12, 1, 0)
    body.Parent = card
    pad(body, 12)

    -- big time block (left)
    local timeBox = Instance.new("Frame")
    timeBox.BackgroundColor3 = Color3.fromRGB(28, 28, 32)
    timeBox.BackgroundTransparency = 0.3
    timeBox.Size = UDim2.fromOffset(62, 46)
    timeBox.BorderSizePixel = 0
    corner(timeBox, 10)
    stroke(timeBox, STROKE)
    timeBox.Parent = body

    local tTime = Instance.new("TextLabel")
    tTime.BackgroundTransparency = 1
    tTime.Size = UDim2.new(1, 0, 0, 22)
    tTime.Position = UDim2.new(0, 0, 0, 5)
    tTime.Font = Enum.Font.GothamBold
    tTime.TextSize = 15
    tTime.TextColor3 = Color3.fromRGB(255, 255, 255)
    tTime.Text = clockLabel(s.date)
    tTime.Parent = timeBox

    local tDay = Instance.new("TextLabel")
    tDay.BackgroundTransparency = 1
    tDay.Size = UDim2.new(1, 0, 0, 14)
    tDay.Position = UDim2.new(0, 0, 0, 26)
    tDay.Font = Enum.Font.Gotham
    tDay.TextSize = 10
    tDay.TextColor3 = Color3.fromRGB(130, 130, 140)
    tDay.Text = string.upper(dayLabel(s.date))
    tDay.Parent = timeBox

    local title = Instance.new("TextLabel")
    title.BackgroundTransparency = 1
    title.Position = UDim2.new(0, 74, 0, 2)
    title.Size = UDim2.new(1, -74 - 84, 0, 20)
    title.Font = Enum.Font.GothamBold
    title.TextSize = 16
    title.TextXAlignment = Enum.TextXAlignment.Left
    title.TextColor3 = Color3.fromRGB(255, 255, 255)
    title.TextTruncate = Enum.TextTruncate.AtEnd
    title.Text = s.name or titleOf(s)
    title.Parent = body

    -- meta chips row (category • duration • staff count)
    local meta = Instance.new("Frame")
    meta.BackgroundTransparency = 1
    meta.Position = UDim2.new(0, 74, 0, 25)
    meta.Size = UDim2.new(1, -74, 0, 18)
    meta.Parent = body

    local ml = Instance.new("UIListLayout")
    ml.FillDirection = Enum.FillDirection.Horizontal
    ml.Padding = UDim.new(0, 6)
    ml.SortOrder = Enum.SortOrder.LayoutOrder
    ml.VerticalAlignment = Enum.VerticalAlignment.Center
    ml.Parent = meta

    local function chip(text: string, order2: number, col: Color3?)
        local f = Instance.new("Frame")
        f.BackgroundColor3 = Color3.fromRGB(28, 28, 32)
        f.BackgroundTransparency = 0.3
        f.Size = UDim2.fromOffset(0, 18)
        f.AutomaticSize = Enum.AutomaticSize.X
        f.LayoutOrder = order2
        f.BorderSizePixel = 0
        corner(f, 999)
        stroke(f, STROKE)
        local l = Instance.new("TextLabel")
        l.BackgroundTransparency = 1
        l.AutomaticSize = Enum.AutomaticSize.X
        l.Size = UDim2.new(0, 0, 1, 0)
        l.Font = Enum.Font.GothamMedium
        l.TextSize = 10
        l.TextColor3 = col or Color3.fromRGB(150, 150, 160)
        l.Text = text
        l.Parent = f
        local p = Instance.new("UIPadding")
        p.PaddingLeft = UDim.new(0, 8); p.PaddingRight = UDim.new(0, 8)
        p.Parent = l
        f.Parent = meta
    end

    local cat = s.category or (s.type and s.type.category) or "session"
    chip(string.upper(cat), 1, ACCENT)
    chip((tonumber(s.duration) or 60) .. " MIN", 2)
    local staffCount = 1 + #(s.participants or {})
    chip(staffCount .. (staffCount == 1 and " STAFF" or " STAFF"), 3)

    -- status badge (top-right)
    local badge = Instance.new("TextLabel")
    badge.AnchorPoint = Vector2.new(1, 0)
    badge.Position = UDim2.new(1, 0, 0, 2)
    badge.Size = UDim2.fromOffset(78, 20)
    badge.BackgroundColor3 = live and Color3.fromRGB(34, 197, 94) or Color3.fromRGB(38, 38, 43)
    badge.BackgroundTransparency = live and 0.1 or 0.35
    badge.Font = Enum.Font.GothamBold
    badge.TextSize = 10
    badge.TextColor3 = live and Color3.fromRGB(255, 255, 255) or Color3.fromRGB(160, 160, 170)
    badge.Text = live and "LIVE NOW" or string.upper(tostring(s.status or "SCHEDULED"))
    badge.BorderSizePixel = 0
    corner(badge, 999)
    badge.Parent = body

    -- divider
    local div = Instance.new("Frame")
    div.BackgroundColor3 = STROKE
    div.BorderSizePixel = 0
    div.Position = UDim2.new(0, 0, 0, 52)
    div.Size = UDim2.new(1, 0, 0, 1)
    div.Parent = body

    -- host row (bottom-left)
    local row = Instance.new("Frame")
    row.BackgroundTransparency = 1
    row.AnchorPoint = Vector2.new(0, 1)
    row.Position = UDim2.new(0, 0, 1, 0)
    row.Size = UDim2.new(1, 0, 0, 34)
    row.Parent = body

    local layout = Instance.new("UIListLayout")
    layout.FillDirection = Enum.FillDirection.Horizontal
    layout.Padding = UDim.new(0, 6)
    layout.SortOrder = Enum.SortOrder.LayoutOrder
    layout.VerticalAlignment = Enum.VerticalAlignment.Center
    layout.Parent = row

    local host = s.host
    avatarChip(row, 1, "Host", host and host.username or "Unassigned", host and host.userId)

    local n = 2
    for _, p in ipairs(s.participants or {}) do
        local role = tostring(p.role or "")
        local pretty = (role == "co_host" and "Co-Host")
            or (role == "" and "Staff")
            or (string.upper(string.sub(role, 1, 1)) .. string.gsub(string.sub(role, 2), "_", " "))
        avatarChip(row, n, pretty, p.username or "—", p.userId)
        n += 1
        if n > 4 then break end
    end

    return card
end

local function buildBoard(): (Frame, ScrollingFrame)
    local root = Instance.new("Frame")
    root.Size = UDim2.fromScale(1, 1)
    root.BackgroundColor3 = BACKGROUND
    root.BorderSizePixel = 0
    pad(root, 14)

    -- gradient, semi-transparent header pill (smaller, pinned to the top)
    local header = Instance.new("Frame")
    header.Size = UDim2.new(0, 0, 0, 34)
    header.AutomaticSize = Enum.AutomaticSize.X
    header.Position = UDim2.new(0, 0, 0, 0)
    header.BackgroundColor3 = ACCENT
    header.BackgroundTransparency = 0.55
    header.BorderSizePixel = 0
    corner(header, 999)
    stroke(header, Color3.fromRGB(255, 255, 255), 1)
    header.Parent = root

    local grad = Instance.new("UIGradient")
    grad.Color = ColorSequence.new({
        ColorSequenceKeypoint.new(0, ACCENT),
        ColorSequenceKeypoint.new(1, Color3.fromRGB(139, 92, 246)),
    })
    grad.Transparency = NumberSequence.new({
        NumberSequenceKeypoint.new(0, 0.15),
        NumberSequenceKeypoint.new(1, 0.55),
    })
    grad.Rotation = 15
    grad.Parent = header

    local htxt = Instance.new("TextLabel")
    htxt.BackgroundTransparency = 1
    htxt.AutomaticSize = Enum.AutomaticSize.X
    htxt.Size = UDim2.new(0, 0, 1, 0)
    htxt.Font = Enum.Font.GothamBold
    htxt.TextSize = 15
    htxt.TextColor3 = Color3.fromRGB(255, 255, 255)
    htxt.Text = TITLE
    htxt.Parent = header

    local hpad = Instance.new("UIPadding")
    hpad.PaddingLeft = UDim.new(0, 18); hpad.PaddingRight = UDim.new(0, 18)
    hpad.Parent = htxt

    local list = Instance.new("ScrollingFrame")
    list.Position = UDim2.new(0, 0, 0, 44)
    list.Size = UDim2.new(1, 0, 1, -44)
    list.BackgroundTransparency = 1
    list.BorderSizePixel = 0
    list.ScrollBarThickness = 4
    list.ScrollBarImageColor3 = ACCENT
    list.ScrollBarImageTransparency = 0.4
    list.CanvasSize = UDim2.new()
    list.AutomaticCanvasSize = Enum.AutomaticSize.Y
    list.Parent = root

    local ll = Instance.new("UIListLayout")
    ll.Padding = UDim.new(0, 10)
    ll.SortOrder = Enum.SortOrder.LayoutOrder
    ll.Parent = list

    return root, list
end


----------------------------------------------------------------- mount + loop
local root, list = buildBoard()

local target = cfg.BOARD_NAME ~= "" and workspace:FindFirstChild(cfg.BOARD_NAME, true) or nil
if target then
    local part = target:IsA("BasePart") and target
        or (target:IsA("Model") and (target.PrimaryPart or target:FindFirstChildWhichIsA("BasePart")))
    if part then
        local gui = part:FindFirstChildOfClass("SurfaceGui") or Instance.new("SurfaceGui")
        gui.Name = "FluxcoreSessionBoard"
        gui.Adornee = part
        gui.Face = Enum.NormalId.Front
        gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
        gui.PixelsPerStud = 50
        gui.AlwaysOnTop = false
        gui.Parent = part
        for _, c in ipairs(gui:GetChildren()) do
            if c:IsA("GuiObject") then c:Destroy() end
        end
        root.Parent = gui
    end
end

if not root.Parent then
    -- Fallback: show it as a ScreenGui for everyone
    local StarterGui = game:GetService("StarterGui")
    local template = Instance.new("ScreenGui")
    template.Name = "FluxcoreSessionBoard"
    template.ResetOnSpawn = false
    template.IgnoreGuiInset = true
    root.AnchorPoint = Vector2.new(1, 0.5)
    root.Position = UDim2.new(1, -20, 0.5, 0)
    root.Size = UDim2.fromOffset(420, 520)
    root.Parent = template
    template.Parent = StarterGui
    for _, p in ipairs(Players:GetPlayers()) do
        local pg = p:FindFirstChildOfClass("PlayerGui")
        if pg and not pg:FindFirstChild("FluxcoreSessionBoard") then template:Clone().Parent = pg end
    end
end

local function render(sessions)
    for _, c in ipairs(list:GetChildren()) do
        if c:IsA("GuiObject") then c:Destroy() end
    end
    if #sessions == 0 then
        local empty = Instance.new("TextLabel")
        empty.BackgroundTransparency = 1
        empty.Size = UDim2.new(1, 0, 0, 80)
        empty.Font = Enum.Font.Gotham
        empty.TextSize = 14
        empty.TextColor3 = Color3.fromRGB(120, 120, 130)
        empty.Text = cfg.EMPTY_TEXT or "No sessions scheduled"
        empty.Parent = list
        return
    end
    for i, s in ipairs(sessions) do
        buildCard(s, i).Parent = list
    end
end

task.spawn(function()
    while true do
        local ok, sessions = pcall(fetch)
        render(ok and sessions or {})
        task.wait(math.max(10, tonumber(cfg.REFRESH_SECONDS) or 30))
    end
end)
`;

export default function SessionBoardTab() {
  const [domain, setDomain] = useState("https://fluxcore.works");
  const [apiKey, setApiKey] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [boardName, setBoardName] = useState("SessionBoard");
  const [revealed, setRevealed] = useState(false);

  const config = useMemo(() => buildConfig(domain, apiKey, filter, boardName), [domain, apiKey, filter, boardName]);

  const copy = (text: string, what: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  };
  const download = (text: string, name: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Session Board</p>
          <p className="text-[11px] text-muted-foreground">
            Two scripts: a <strong>Config</strong> ModuleScript and a <strong>Handler</strong> Script placed <em>inside</em> it.
            The handler renders a modern, scrollable board of today's sessions with host &amp; co-host avatars.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Workspace domain</Label>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="https://shoply.fluxcore.works" className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sessions API key</Label>
            <div className="flex gap-2">
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Settings → Tracking & Scripts"
                className="font-mono text-xs"
                type={revealed ? "text" : "password"}
              />
              {apiKey && (
                <Button variant="ghost" size="icon" onClick={() => setRevealed((r) => !r)}>
                  {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Show</Label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="w-full h-9 rounded-md bg-background border border-border px-2 text-xs"
            >
              <option value="all">All sessions — “Todays Sessions”</option>
              <option value="shift">Shifts only — “Todays Shifts”</option>
              <option value="training">Trainings only — “Todays Trainings”</option>
              <option value="event">Events only — “Todays Events”</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Board part / model name (optional)</Label>
            <Input value={boardName} onChange={(e) => setBoardName(e.target.value)} placeholder="SessionBoard" className="font-mono text-xs" />
            <p className="text-[11px] text-muted-foreground">Leave empty to render as an on-screen panel instead of a SurfaceGui.</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
          <p className="text-foreground font-medium text-xs">Installation</p>
          <p>1. Enable <strong>HTTP Requests</strong>: Game Settings → Security → Allow HTTP Requests.</p>
          <p>2. Create a <code>ModuleScript</code> named <code>SessionBoardConfig</code> in <code>ServerScriptService</code> and paste <strong>Script 1 — Config</strong>.</p>
          <p>3. Create a <code>Script</code> named <code>Handler</code> <strong>inside</strong> that ModuleScript and paste <strong>Script 2 — Handler</strong>.</p>
          <p>4. Publish &amp; play — the board refreshes every {`REFRESH_SECONDS`} seconds.</p>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Script 1 — Config <span className="text-muted-foreground font-normal">(ModuleScript)</span></p>
            <p className="text-[11px] text-muted-foreground">Name it exactly <code>SessionBoardConfig</code>.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => copy(config, "Config script")} disabled={!apiKey}>
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => download(config, "fluxcore-sessionboard-config.lua")} disabled={!apiKey}>
              <Download className="w-3 h-3 mr-1" /> .lua
            </Button>
          </div>
        </div>
        <pre className="text-[11px] leading-relaxed font-mono p-4 max-h-[360px] overflow-auto whitespace-pre text-foreground/90">{config}</pre>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Script 2 — Handler <span className="text-muted-foreground font-normal">(Script, child of Config)</span></p>
            <p className="text-[11px] text-muted-foreground">Builds the scrollable board UI with the gradient header and host avatars.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => copy(HANDLER, "Handler script")}>
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => download(HANDLER, "fluxcore-sessionboard-handler.lua")}>
              <Download className="w-3 h-3 mr-1" /> .lua
            </Button>
          </div>
        </div>
        <pre className="text-[11px] leading-relaxed font-mono p-4 max-h-[460px] overflow-auto whitespace-pre text-foreground/90">{HANDLER}</pre>
      </div>
    </div>
  );
}
