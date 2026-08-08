import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Download, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Filter = "all" | "shift" | "training" | "event";

function buildConfig(domain: string, apiKey: string, filter: Filter, hubName: string, passes: string) {
  const d = domain.replace(/"/g, '\\"').replace(/\/+$/, "");
  const k = apiKey.replace(/"/g, '\\"');
  const h = hubName.replace(/"/g, '\\"');
  const ids = passes
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
  return `--!strict
-- Fluxcore Flight Hub — CONFIG
-- Place this ModuleScript in ServerScriptService and name it "FlightHubConfig".
-- The "Handler" Script must be a CHILD of this ModuleScript.

return {
    -- Your workspace domain (Settings -> Subdomain), no trailing slash.
    DOMAIN = "${d}",

    -- Sessions API key (Settings -> Tracking & Scripts)
    API_KEY = "${k}",

    -- Which flights to show: "all" | "shift" | "training" | "event"
    CATEGORY = "${filter}",

    -- Only today's flights? (false = every upcoming flight the API returns)
    TODAY_ONLY = true,

    -- Only list flights that have a game link (Join Flight button).
    REQUIRE_LINK = true,

    -- Hub branding
    HUB_NAME = "${h}",
    HEADER = {
        all      = "Available Flights",
        shift    = "Available Departures",
        training = "Available Trainings",
        event    = "Available Events",
    },

    -- Gamepasses shown in the STORE tab (numeric Gamepass IDs)
    GAMEPASS_IDS = {${ids.length ? "\n        " + ids.join(",\n        ") + ",\n    " : ""}},

    -- Extra places (Place IDs) shown in the GAMES tab with their icons.
    -- Leave empty to only show the places referenced by scheduled flights.
    PLACE_IDS = {},

    -- Refresh interval in seconds
    REFRESH_SECONDS = 30,

    -- Open the hub automatically when a player joins
    AUTO_OPEN = true,
    -- Keybind to reopen the hub
    TOGGLE_KEY = Enum.KeyCode.H,

    -- Look & feel
    ACCENT     = Color3.fromRGB(225, 29, 46),
    BACKGROUND = Color3.fromRGB(8, 8, 10),
    CARD       = Color3.fromRGB(18, 18, 21),
    STROKE     = Color3.fromRGB(38, 38, 42),
    EMPTY_TEXT = "No flights available right now",
}
`;
}

const HANDLER = `--!strict
-- Fluxcore Flight Hub — HANDLER
-- This Script must be a CHILD of the "FlightHubConfig" ModuleScript.
-- Enable HTTP Requests: Game Settings -> Security -> Allow HTTP Requests.

local HttpService       = game:GetService("HttpService")
local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local MarketplaceService= game:GetService("MarketplaceService")

local cfg = require(script.Parent)

------------------------------------------------------------------ remote setup
local remote = ReplicatedStorage:FindFirstChild("FluxcoreFlightHub")
if not remote then
    remote = Instance.new("RemoteFunction")
    remote.Name = "FluxcoreFlightHub"
    remote.Parent = ReplicatedStorage
end

------------------------------------------------------------------- server fetch
local cache, cacheAt = {}, 0

local function placeIdFromUrl(url)
    if type(url) ~= "string" then return nil end
    return tonumber(string.match(url, "/games/(%d+)")) or tonumber(string.match(url, "placeId=(%d+)"))
end

local function fetch()
    local url = string.format(
        "%s/api/v1/sessions?category=%s&today=%s",
        cfg.DOMAIN, string.lower(cfg.CATEGORY or "all"), tostring(cfg.TODAY_ONLY ~= false)
    )
    local ok, res = pcall(function()
        return HttpService:RequestAsync({
            Url = url,
            Method = "GET",
            Headers = { ["x-api-key"] = cfg.API_KEY, ["Content-Type"] = "application/json" },
        })
    end)
    if not ok or not res.Success then
        warn("[Fluxcore] Flight fetch failed:", ok and res.StatusCode or res)
        return {}
    end
    local decoded
    if not pcall(function() decoded = HttpService:JSONDecode(res.Body) end) then return {} end
    local out = {}
    for _, s in ipairs((decoded and decoded.sessions) or {}) do
        local link = s.game_url or s.link
        local placeId = placeIdFromUrl(link)
        if (cfg.REQUIRE_LINK == false) or placeId then
            table.insert(out, {
                id          = s.id,
                name        = s.name or s.title,
                category    = s.category or "session",
                date        = s.date,
                flight      = s.route_number or s.flight_number,
                origin      = s.origin,
                destination = s.destination,
                aircraft    = s.aircraft_model,
                tail        = s.tail_number,
                host        = (s.host and s.host.username) or s.host_name,
                hostId      = (s.host and s.host.user_id) or nil,
                placeId     = placeId,
                link        = link,
            })
        end
    end
    table.sort(out, function(a, b) return tostring(a.date) < tostring(b.date) end)
    return out
end

local function payload()
    if os.clock() - cacheAt > math.max(10, tonumber(cfg.REFRESH_SECONDS) or 30) then
        cache = fetch()
        cacheAt = os.clock()
    end
    local places = {}
    local seen = {}
    for _, id in ipairs(cfg.PLACE_IDS or {}) do
        if not seen[id] then seen[id] = true; table.insert(places, id) end
    end
    for _, f in ipairs(cache) do
        if f.placeId and not seen[f.placeId] then seen[f.placeId] = true; table.insert(places, f.placeId) end
    end

    local passes = {}
    for _, id in ipairs(cfg.GAMEPASS_IDS or {}) do
        local ok, info = pcall(function()
            return MarketplaceService:GetProductInfo(id, Enum.InfoType.GamePass)
        end)
        table.insert(passes, {
            id = id,
            name = (ok and info and info.Name) or ("Gamepass " .. tostring(id)),
            price = (ok and info and info.PriceInRobux) or nil,
        })
    end

    return { flights = cache, places = places, passes = passes, header = (cfg.HEADER or {})[string.lower(cfg.CATEGORY or "all")] or "Available Flights" }
end

remote.OnServerInvoke = function()
    local ok, data = pcall(payload)
    return ok and data or { flights = {}, places = {}, passes = {}, header = "Available Flights" }
end

---------------------------------------------------------------- client injector
local client = Instance.new("LocalScript")
client.Name = "FluxcoreFlightHubClient"
client.Source = [==[
local Players            = game:GetService("Players")
local ReplicatedStorage  = game:GetService("ReplicatedStorage")
local TeleportService    = game:GetService("TeleportService")
local MarketplaceService = game:GetService("MarketplaceService")
local UserInputService   = game:GetService("UserInputService")

local remote = ReplicatedStorage:WaitForChild("FluxcoreFlightHub")
local cfg    = require(ReplicatedStorage:WaitForChild("FluxcoreFlightHubCfg"))
local player = Players.LocalPlayer

local ACCENT, BG, CARD, STROKE = cfg.ACCENT, cfg.BACKGROUND, cfg.CARD, cfg.STROKE

local function corner(p, r) local c = Instance.new("UICorner") c.CornerRadius = UDim.new(0, r) c.Parent = p end
local function stroke(p, col) local s = Instance.new("UIStroke") s.Color = col s.Thickness = 1 s.Parent = p end
local function pad(p, v)
    local u = Instance.new("UIPadding")
    u.PaddingTop = UDim.new(0, v) u.PaddingBottom = UDim.new(0, v)
    u.PaddingLeft = UDim.new(0, v) u.PaddingRight = UDim.new(0, v)
    u.Parent = p
end
local function label(parent, text, size, color, font)
    local l = Instance.new("TextLabel")
    l.BackgroundTransparency = 1
    l.Font = font or Enum.Font.GothamMedium
    l.TextSize = size
    l.TextColor3 = color
    l.TextXAlignment = Enum.TextXAlignment.Left
    l.Text = text
    l.Parent = parent
    return l
end

local function clockLabel(iso)
    if type(iso) ~= "string" then return "TBD" end
    local h, mi = string.match(iso, "T(%d+):(%d+)")
    if not h then return "TBD" end
    local hour = tonumber(h) % 12
    if hour == 0 then hour = 12 end
    return string.format("%d:%s %s", hour, mi, tonumber(h) < 12 and "AM" or "PM")
end

local gui = Instance.new("ScreenGui")
gui.Name = "FluxcoreFlightHub"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.DisplayOrder = 50
gui.Enabled = cfg.AUTO_OPEN ~= false
gui.Parent = player:WaitForChild("PlayerGui")

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = BG
root.BorderSizePixel = 0
root.Parent = gui

-- sidebar
local side = Instance.new("Frame")
side.Size = UDim2.new(0, 200, 1, 0)
side.BackgroundColor3 = CARD
side.BorderSizePixel = 0
side.Parent = root
pad(side, 16)

local brand = label(side, cfg.HUB_NAME, 18, Color3.fromRGB(240,240,245), Enum.Font.GothamBold)
brand.Size = UDim2.new(1, 0, 0, 22)
label(side, "TRAVEL HUB", 10, ACCENT).Position = UDim2.new(0, 0, 0, 24)
side:FindFirstChildOfClass("TextLabel")

local navHolder = Instance.new("Frame")
navHolder.BackgroundTransparency = 1
navHolder.Position = UDim2.new(0, 0, 0, 64)
navHolder.Size = UDim2.new(1, 0, 1, -64)
navHolder.Parent = side
local navList = Instance.new("UIListLayout")
navList.Padding = UDim.new(0, 6)
navList.Parent = navHolder

local pages = {}
local navButtons = {}
local function selectPage(name)
    for n, f in pairs(pages) do f.Visible = (n == name) end
    for n, b in pairs(navButtons) do
        b.BackgroundTransparency = (n == name) and 0.85 or 1
        b.TextColor3 = (n == name) and ACCENT or Color3.fromRGB(150,150,158)
    end
end

local function nav(name)
    local b = Instance.new("TextButton")
    b.Size = UDim2.new(1, 0, 0, 34)
    b.BackgroundColor3 = ACCENT
    b.BackgroundTransparency = 1
    b.AutoButtonColor = false
    b.Font = Enum.Font.GothamMedium
    b.TextSize = 12
    b.TextXAlignment = Enum.TextXAlignment.Left
    b.Text = "   " .. string.upper(name)
    b.TextColor3 = Color3.fromRGB(150,150,158)
    b.Parent = navHolder
    corner(b, 8)
    b.MouseButton1Click:Connect(function() selectPage(name) end)
    navButtons[name] = b
    return b
end

-- content area
local content = Instance.new("Frame")
content.Position = UDim2.new(0, 200, 0, 0)
content.Size = UDim2.new(1, -200, 1, 0)
content.BackgroundTransparency = 1
content.Parent = root

local head = Instance.new("Frame")
head.Size = UDim2.new(1, 0, 0, 72)
head.BackgroundTransparency = 1
head.Parent = content
pad(head, 20)
local title = label(head, "Choose your flight", 20, Color3.fromRGB(240,240,245), Enum.Font.GothamBold)
title.Size = UDim2.new(1, -60, 0, 24)
local sub = label(head, "Live departures from the " .. cfg.HUB_NAME .. " network", 11, Color3.fromRGB(140,140,150))
sub.Position = UDim2.new(0, 0, 0, 26)
sub.Size = UDim2.new(1, -60, 0, 16)

local close = Instance.new("TextButton")
close.Size = UDim2.fromOffset(26, 26)
close.AnchorPoint = Vector2.new(1, 0)
close.Position = UDim2.new(1, 0, 0, 0)
close.BackgroundColor3 = CARD
close.Text = "X"
close.Font = Enum.Font.GothamBold
close.TextSize = 12
close.TextColor3 = Color3.fromRGB(200,200,205)
close.Parent = head
corner(close, 8)
close.MouseButton1Click:Connect(function() gui.Enabled = false end)

local function page(name)
    local f = Instance.new("ScrollingFrame")
    f.Position = UDim2.new(0, 20, 0, 72)
    f.Size = UDim2.new(1, -40, 1, -92)
    f.BackgroundTransparency = 1
    f.BorderSizePixel = 0
    f.ScrollBarThickness = 4
    f.ScrollBarImageColor3 = ACCENT
    f.CanvasSize = UDim2.new()
    f.AutomaticCanvasSize = Enum.AutomaticSize.Y
    f.Visible = false
    f.Parent = content
    pages[name] = f
    nav(name)
    return f
end

local flightsPage = page("Flights")
local gamesPage   = page("Games")
local storePage   = page("Store")

local fGrid = Instance.new("UIGridLayout")
fGrid.CellSize = UDim2.new(0, 300, 0, 300)
fGrid.CellPadding = UDim2.fromOffset(14, 14)
fGrid.Parent = flightsPage

local gGrid = fGrid:Clone()
gGrid.CellSize = UDim2.new(0, 220, 0, 200)
gGrid.Parent = gamesPage

local sList = Instance.new("UIListLayout")
sList.Padding = UDim.new(0, 10)
sList.Parent = storePage

local function banner(parent, text, desc)
    local b = Instance.new("Frame")
    b.Size = UDim2.new(1, 0, 0, 84)
    b.BackgroundColor3 = ACCENT
    b.BorderSizePixel = 0
    b.Parent = parent
    corner(b, 14)
    pad(b, 16)
    local g = Instance.new("UIGradient")
    g.Color = ColorSequence.new(ACCENT, Color3.fromRGB(math.floor(ACCENT.R*140), math.floor(ACCENT.G*140), math.floor(ACCENT.B*140)))
    g.Rotation = 20
    g.Parent = b
    label(b, text, 16, Color3.fromRGB(255,255,255), Enum.Font.GothamBold).Size = UDim2.new(1, 0, 0, 20)
    local d = label(b, desc, 11, Color3.fromRGB(240,235,235))
    d.Position = UDim2.new(0, 0, 0, 24)
    d.Size = UDim2.new(1, 0, 0, 16)
    return b
end

local function joinPlace(placeId)
    if not placeId then return end
    pcall(function() TeleportService:Teleport(placeId, player) end)
end

local function flightCard(f, order)
    local card = Instance.new("Frame")
    card.BackgroundColor3 = CARD
    card.BorderSizePixel = 0
    card.LayoutOrder = order
    corner(card, 14) stroke(card, STROKE)

    local icon = Instance.new("ImageLabel")
    icon.Size = UDim2.new(1, -20, 0, 150)
    icon.Position = UDim2.fromOffset(10, 10)
    icon.BackgroundColor3 = Color3.fromRGB(28,28,32)
    icon.BorderSizePixel = 0
    icon.ScaleType = Enum.ScaleType.Crop
    icon.Image = f.placeId and ("rbxthumb://type=GameIcon&id=" .. tostring(f.placeId) .. "&w=420&h=420") or ""
    icon.Parent = card
    corner(icon, 10)

    local tag = Instance.new("TextLabel")
    tag.BackgroundColor3 = Color3.fromRGB(12,12,14)
    tag.Position = UDim2.fromOffset(18, 18)
    tag.Size = UDim2.fromOffset(72, 22)
    tag.Font = Enum.Font.GothamBold
    tag.TextSize = 11
    tag.TextColor3 = Color3.fromRGB(255,255,255)
    tag.Text = f.flight or string.upper(string.sub(f.category, 1, 3))
    tag.Parent = card
    corner(tag, 6)

    local nameLbl = label(card, f.name or (f.category .. " " .. clockLabel(f.date)), 14, Color3.fromRGB(240,240,245), Enum.Font.GothamBold)
    nameLbl.Position = UDim2.fromOffset(14, 168)
    nameLbl.Size = UDim2.new(1, -28, 0, 18)

    local route = f.origin and f.destination and (f.origin .. "  ->  " .. f.destination) or (f.aircraft or "Direct connection available")
    local routeLbl = label(card, route, 11, Color3.fromRGB(150,150,158))
    routeLbl.Position = UDim2.fromOffset(14, 188)
    routeLbl.Size = UDim2.new(1, -28, 0, 16)

    local meta = label(card, clockLabel(f.date) .. (f.host and ("  ·  " .. f.host) or ""), 11, Color3.fromRGB(120,120,130))
    meta.Position = UDim2.fromOffset(14, 206)
    meta.Size = UDim2.new(1, -28, 0, 16)

    if f.hostId then
        local av = Instance.new("ImageLabel")
        av.Size = UDim2.fromOffset(20, 20)
        av.AnchorPoint = Vector2.new(1, 0)
        av.Position = UDim2.new(1, -14, 0, 204)
        av.BackgroundColor3 = Color3.fromRGB(40,40,46)
        av.BorderSizePixel = 0
        av.Image = "rbxthumb://type=AvatarHeadShot&id=" .. tostring(f.hostId) .. "&w=150&h=150"
        av.Parent = card
        corner(av, 999)
    end

    local join = Instance.new("TextButton")
    join.AnchorPoint = Vector2.new(0.5, 1)
    join.Position = UDim2.new(0.5, 0, 1, -12)
    join.Size = UDim2.new(1, -28, 0, 36)
    join.BackgroundColor3 = ACCENT
    join.Font = Enum.Font.GothamBold
    join.TextSize = 12
    join.TextColor3 = Color3.fromRGB(255,255,255)
    join.Text = "Join Flight  ->"
    join.Parent = card
    corner(join, 10)
    join.MouseButton1Click:Connect(function() joinPlace(f.placeId) end)

    return card
end

local function gameCard(placeId, order)
    local card = Instance.new("Frame")
    card.BackgroundColor3 = CARD
    card.BorderSizePixel = 0
    card.LayoutOrder = order
    corner(card, 14) stroke(card, STROKE)

    local icon = Instance.new("ImageLabel")
    icon.Size = UDim2.new(1, -20, 0, 120)
    icon.Position = UDim2.fromOffset(10, 10)
    icon.BackgroundColor3 = Color3.fromRGB(28,28,32)
    icon.BorderSizePixel = 0
    icon.Image = "rbxthumb://type=GameIcon&id=" .. tostring(placeId) .. "&w=420&h=420"
    icon.Parent = card
    corner(icon, 10)

    local name = "Place " .. tostring(placeId)
    local ok, info = pcall(function() return MarketplaceService:GetProductInfo(placeId) end)
    if ok and info and info.Name then name = info.Name end

    local l = label(card, name, 13, Color3.fromRGB(235,235,240), Enum.Font.GothamBold)
    l.Position = UDim2.fromOffset(14, 138)
    l.Size = UDim2.new(1, -28, 0, 18)
    l.TextTruncate = Enum.TextTruncate.AtEnd

    local b = Instance.new("TextButton")
    b.AnchorPoint = Vector2.new(0.5, 1)
    b.Position = UDim2.new(0.5, 0, 1, -10)
    b.Size = UDim2.new(1, -28, 0, 30)
    b.BackgroundColor3 = Color3.fromRGB(32,32,38)
    b.Font = Enum.Font.GothamMedium
    b.TextSize = 11
    b.TextColor3 = Color3.fromRGB(230,230,235)
    b.Text = "Travel"
    b.Parent = card
    corner(b, 8)
    b.MouseButton1Click:Connect(function() joinPlace(placeId) end)
    return card
end

local function passRow(p, order)
    local row = Instance.new("Frame")
    row.Size = UDim2.new(1, 0, 0, 62)
    row.BackgroundColor3 = CARD
    row.BorderSizePixel = 0
    row.LayoutOrder = order
    corner(row, 12) stroke(row, STROKE)

    local img = Instance.new("ImageLabel")
    img.Size = UDim2.fromOffset(42, 42)
    img.Position = UDim2.fromOffset(10, 10)
    img.BackgroundColor3 = Color3.fromRGB(30,30,34)
    img.BorderSizePixel = 0
    img.Image = "rbxthumb://type=GamePass&id=" .. tostring(p.id) .. "&w=150&h=150"
    img.Parent = row
    corner(img, 8)

    local n = label(row, p.name, 13, Color3.fromRGB(235,235,240), Enum.Font.GothamBold)
    n.Position = UDim2.fromOffset(62, 12)
    n.Size = UDim2.new(1, -200, 0, 18)

    local pr = label(row, p.price and (tostring(p.price) .. " Robux") or "Unavailable", 11, Color3.fromRGB(150,150,158))
    pr.Position = UDim2.fromOffset(62, 32)
    pr.Size = UDim2.new(1, -200, 0, 16)

    local buy = Instance.new("TextButton")
    buy.AnchorPoint = Vector2.new(1, 0.5)
    buy.Position = UDim2.new(1, -12, 0.5, 0)
    buy.Size = UDim2.fromOffset(110, 32)
    buy.BackgroundColor3 = ACCENT
    buy.Font = Enum.Font.GothamBold
    buy.TextSize = 12
    buy.TextColor3 = Color3.fromRGB(255,255,255)
    buy.Text = "Purchase"
    buy.Parent = row
    corner(buy, 8)
    buy.MouseButton1Click:Connect(function()
        pcall(function() MarketplaceService:PromptGamePassPurchase(player, p.id) end)
    end)
    return row
end

local function clear(f)
    for _, c in ipairs(f:GetChildren()) do
        if c:IsA("GuiObject") then c:Destroy() end
    end
end

local function render()
    local ok, data = pcall(function() return remote:InvokeServer() end)
    if not ok or type(data) ~= "table" then return end

    clear(flightsPage)
    local b = banner(flightsPage, "Where will you fly next?", "Browse live flights and join with one click.")
    b.LayoutOrder = -1
    b.Size = UDim2.new(0, 300, 0, 84)
    title.Text = data.header or "Available Flights"

    if #data.flights == 0 then
        local e = label(flightsPage, cfg.EMPTY_TEXT, 13, Color3.fromRGB(140,140,150))
        e.Size = UDim2.new(0, 300, 0, 40)
    else
        for i, f in ipairs(data.flights) do flightCard(f, i).Parent = flightsPage end
    end

    clear(gamesPage)
    for i, id in ipairs(data.places) do gameCard(id, i).Parent = gamesPage end
    if #data.places == 0 then
        local e = label(gamesPage, "No games linked yet", 13, Color3.fromRGB(140,140,150))
        e.Size = UDim2.new(0, 300, 0, 40)
    end

    clear(storePage)
    for i, p in ipairs(data.passes) do passRow(p, i).Parent = storePage end
    if #data.passes == 0 then
        local e = label(storePage, "No gamepasses configured", 13, Color3.fromRGB(140,140,150))
        e.Size = UDim2.new(1, 0, 0, 40)
    end
end

selectPage("Flights")
render()

UserInputService.InputBegan:Connect(function(input, processed)
    if processed then return end
    if input.KeyCode == cfg.TOGGLE_KEY then gui.Enabled = not gui.Enabled end
end)

task.spawn(function()
    while true do
        task.wait(math.max(10, tonumber(cfg.REFRESH_SECONDS) or 30))
        pcall(render)
    end
end)
]==]
client.Parent = game:GetService("StarterPlayer"):WaitForChild("StarterPlayerScripts")

-- Share a client-safe copy of the visual config
local clientCfg = Instance.new("ModuleScript")
clientCfg.Name = "FluxcoreFlightHubCfg"
clientCfg.Source = string.format([==[
return {
    HUB_NAME   = %q,
    ACCENT     = Color3.fromRGB(%d, %d, %d),
    BACKGROUND = Color3.fromRGB(%d, %d, %d),
    CARD       = Color3.fromRGB(%d, %d, %d),
    STROKE     = Color3.fromRGB(%d, %d, %d),
    EMPTY_TEXT = %q,
    AUTO_OPEN  = %s,
    TOGGLE_KEY = Enum.KeyCode.%s,
    REFRESH_SECONDS = %d,
}
]==],
    cfg.HUB_NAME or "Flight Hub",
    cfg.ACCENT.R * 255, cfg.ACCENT.G * 255, cfg.ACCENT.B * 255,
    cfg.BACKGROUND.R * 255, cfg.BACKGROUND.G * 255, cfg.BACKGROUND.B * 255,
    cfg.CARD.R * 255, cfg.CARD.G * 255, cfg.CARD.B * 255,
    cfg.STROKE.R * 255, cfg.STROKE.G * 255, cfg.STROKE.B * 255,
    cfg.EMPTY_TEXT or "No flights available right now",
    tostring(cfg.AUTO_OPEN ~= false),
    cfg.TOGGLE_KEY and cfg.TOGGLE_KEY.Name or "H",
    math.max(10, tonumber(cfg.REFRESH_SECONDS) or 30)
)
clientCfg.Parent = ReplicatedStorage
`;

export default function FlightHubTab() {
  const [domain, setDomain] = useState("https://fluxcore.works");
  const [apiKey, setApiKey] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [hubName, setHubName] = useState("Flight Hub");
  const [passes, setPasses] = useState("");
  const [revealed, setRevealed] = useState(false);

  const config = useMemo(
    () => buildConfig(domain, apiKey, filter, hubName, passes),
    [domain, apiKey, filter, hubName, passes],
  );

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
          <p className="text-sm font-semibold text-foreground">Flight Hub</p>
          <p className="text-[11px] text-muted-foreground">
            A fullscreen in-game hub: every scheduled flight that has a game link (with a <strong>Join Flight</strong> button),
            all linked games with their icons, and the game's gamepasses in a store tab. Two scripts — a <strong>Config</strong> ModuleScript
            and a <strong>Handler</strong> Script inside it.
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
              <option value="all">All flights — “Available Flights”</option>
              <option value="shift">Shifts / departures only</option>
              <option value="training">Trainings only</option>
              <option value="event">Events only</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hub name</Label>
            <Input value={hubName} onChange={(e) => setHubName(e.target.value)} placeholder="Flight Hub" className="text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Gamepass IDs (store tab)</Label>
            <Input value={passes} onChange={(e) => setPasses(e.target.value)} placeholder="123456, 789012" className="font-mono text-xs" />
            <p className="text-[11px] text-muted-foreground">Comma or space separated. Names, prices and icons are pulled from Roblox automatically.</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
          <p className="text-foreground font-medium text-xs">Installation</p>
          <p>1. Enable <strong>HTTP Requests</strong>: Game Settings → Security → Allow HTTP Requests.</p>
          <p>2. Create a <code>ModuleScript</code> named <code>FlightHubConfig</code> in <code>ServerScriptService</code> and paste <strong>Script 1 — Config</strong>.</p>
          <p>3. Create a <code>Script</code> named <code>Handler</code> <strong>inside</strong> that ModuleScript and paste <strong>Script 2 — Handler</strong>.</p>
          <p>4. Flight numbers, origin/destination and aircraft come straight from the Fluxcore session. Only flights with a game link are listed.</p>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Script 1 — Config <span className="text-muted-foreground font-normal">(ModuleScript)</span></p>
            <p className="text-[11px] text-muted-foreground">Name it exactly <code>FlightHubConfig</code>.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => copy(config, "Config script")} disabled={!apiKey}>
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => download(config, "fluxcore-flighthub-config.lua")} disabled={!apiKey}>
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
            <p className="text-[11px] text-muted-foreground">Serves the flight data and builds the fullscreen hub UI.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => copy(HANDLER, "Handler script")}>
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => download(HANDLER, "fluxcore-flighthub-handler.lua")}>
              <Download className="w-3 h-3 mr-1" /> .lua
            </Button>
          </div>
        </div>
        <pre className="text-[11px] leading-relaxed font-mono p-4 max-h-[460px] overflow-auto whitespace-pre text-foreground/90">{HANDLER}</pre>
      </div>
    </div>
  );
}
