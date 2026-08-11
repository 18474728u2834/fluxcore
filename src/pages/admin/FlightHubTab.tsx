import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Download, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Filter = "all" | "shift" | "training" | "event";

function buildConfig(domain: string, apiKey: string, filter: Filter, hubName: string, passes: string, tzOffset: string) {
  const tz = Number(tzOffset);
  const d = domain.replace(/"/g, '\\"').replace(/\/+$/, "");
  const k = apiKey.replace(/"/g, '\\"');
  const h = hubName.replace(/"/g, '\\"');
  const ids = passes.split(/[\s,]+/).map((x) => x.trim()).filter((x) => /^\d+$/.test(x));
  return `--!strict
-- Fluxcore Flight Hub — CONFIG
-- ModuleScript. Place in ReplicatedStorage and name it exactly "FlightHubConfig".
-- The "FlightHubHandler" Script (server) reads the settings below.

local M = {}

--------------------------------------------------------------------- settings
-- Your workspace domain (Settings -> Subdomain), no trailing slash.
M.DOMAIN = "${d}"

-- Sessions API key (Settings -> Tracking & Scripts)
M.API_KEY = "${k}"

-- Which flights to show: "all" | "shift" | "training" | "event"
M.CATEGORY = "${filter}"

-- Timezone for displayed departure times, in hours from UTC.
-- The API always returns UTC. Example: 2 = CEST, -4 = EDT, 0 = UTC.
M.TIMEZONE_OFFSET_HOURS = ${Number.isFinite(tz) ? tz : 0}


-- Only today's flights? (false = every upcoming flight the API returns)
M.TODAY_ONLY = true

-- Only list flights that have a game link (so "Join Flight" always works)
M.REQUIRE_LINK = true

-- Branding
M.HUB_NAME = "${h}"
-- Optional logo shown top-right (rbxassetid://0000000000)
M.LOGO_IMAGE = ""
M.HEADER = {
    all      = "Available Flights",
    shift    = "Available Departures",
    training = "Available Trainings",
    event    = "Available Events",
}

-- Gamepasses shown in the STORE tab (numeric Gamepass IDs)
M.GAMEPASS_IDS = {${ids.length ? "\n    " + ids.join(",\n    ") + ",\n" : ""}}

-- Extra Place IDs shown in the GAMES tab. Places used by flights are added automatically.
M.PLACE_IDS = {}

-- Hide the hub game itself from the GAMES tab.
M.HIDE_CURRENT_GAME = true

-- Manual game icons. Roblox blocks web icons in-game, so set them here:
--   [placeId] = decalId        (decal / image asset id of the icon)
-- Example:
--   M.GAME_ICONS = {
--       [1234567890] = 9876543210,
--   }
M.GAME_ICONS = {}


M.REFRESH_SECONDS = 30
M.AUTO_OPEN  = true
M.TOGGLE_KEY = Enum.KeyCode.H

M.ACCENT     = Color3.fromRGB(225, 29, 46)
M.BACKGROUND = Color3.fromRGB(8, 8, 10)
M.CARD       = Color3.fromRGB(18, 18, 21)
M.STROKE     = Color3.fromRGB(38, 38, 42)
M.EMPTY_TEXT = "No flights available right now"

------------------------------------------------------------------ client UI
-- M.mount() is called by the one-line client LocalScript. Server never runs it.
function M.mount()
    local Players            = game:GetService("Players")
    local ReplicatedStorage  = game:GetService("ReplicatedStorage")
    local TeleportService    = game:GetService("TeleportService")
    local MarketplaceService = game:GetService("MarketplaceService")
    local UserInputService   = game:GetService("UserInputService")
    local GuiService         = game:GetService("GuiService")

    local player = Players.LocalPlayer
    if not player then return end
    local remote = ReplicatedStorage:WaitForChild("FluxcoreFlightHub")

    local ACCENT, BG, CARD, STROKE = M.ACCENT, M.BACKGROUND, M.CARD, M.STROKE
    local GREEN = Color3.fromRGB(101, 202, 148)

    -- Keep everything clear of the Roblox topbar, chat button and mobile buttons.
    local inset = GuiService:GetGuiInset()
    local TOP_SAFE  = math.max(inset.Y, 36) + 56
    local LEFT_SAFE = 56

    local function corner(p, r) local c = Instance.new("UICorner") c.CornerRadius = UDim.new(0, r) c.Parent = p end
    local function stroke(p, col) local s = Instance.new("UIStroke") s.Color = col or STROKE s.Thickness = 1 s.Parent = p end
    local function label(parent, text, size, color, font)
        local l = Instance.new("TextLabel")
        l.BackgroundTransparency = 1
        l.Font = font or Enum.Font.GothamMedium
        l.TextSize = size
        l.TextColor3 = color
        l.TextXAlignment = Enum.TextXAlignment.Left
        l.TextTruncate = Enum.TextTruncate.AtEnd
        l.Text = text
        l.Parent = parent
        return l
    end
    -- The API returns UTC ISO timestamps. Shift them by M.TIMEZONE_OFFSET_HOURS
    -- and format as HH:MM, adding a day hint when the flight is not today.
    local TZ = tonumber(M.TIMEZONE_OFFSET_HOURS) or 0
    local function civilDays(y, m, d)
        if m <= 2 then y = y - 1 end
        local era = math.floor(y / 400)
        local yoe = y - era * 400
        local mp = (m + (m > 2 and -3 or 9))
        local doy = math.floor((153 * mp + 2) / 5) + d - 1
        local doe = yoe * 365 + math.floor(yoe / 4) - math.floor(yoe / 100) + doy
        return era * 146097 + doe - 719468
    end
    -- absolute minutes (local to TZ) for an ISO timestamp
    local function isoMinutes(iso)
        if type(iso) ~= "string" then return nil end
        local y, mo, d, hh, mm = string.match(iso, "(%d+)-(%d+)-(%d+)T(%d+):(%d+)")
        if not hh then return nil end
        return civilDays(tonumber(y), tonumber(mo), tonumber(d)) * 1440
            + tonumber(hh) * 60 + tonumber(mm) + math.floor(TZ * 60)
    end
    local function dayOffset(iso)
        local mins = isoMinutes(iso)
        if not mins then return 0 end
        local nowMins = math.floor(os.time() / 60) + math.floor(TZ * 60)
        return math.floor(mins / 1440) - math.floor(nowMins / 1440)
    end
    local function timeOnly(iso)
        local mins = isoMinutes(iso)
        if not mins then return "TBD" end
        local t = mins % 1440
        return string.format("%02d:%02d", math.floor(t / 60), t % 60)
    end
    local function clockLabel(iso)
        local t = timeOnly(iso)
        if t == "TBD" then return t end
        local off = dayOffset(iso)
        if off == 1 then return "Tomorrow " .. t end
        if off > 1 then return t .. " (+" .. tostring(off) .. "d)" end
        if off < 0 then return t .. " (" .. tostring(off) .. "d)" end
        return t
    end


    local function joinPlace(placeId)
        if not placeId then return end
        pcall(function() TeleportService:Teleport(placeId, player) end)
    end

    local gui = Instance.new("ScreenGui")
    gui.Name = "FluxcoreFlightHub"
    gui.ResetOnSpawn = false
    gui.IgnoreGuiInset = true
    gui.DisplayOrder = 50
    gui.Enabled = M.AUTO_OPEN ~= false
    gui.Parent = player:WaitForChild("PlayerGui")

    local root = Instance.new("Frame")
    root.Size = UDim2.fromScale(1, 1)
    root.BackgroundColor3 = BG
    root.BorderSizePixel = 0
    root.Parent = gui

    -- ============================================================ welcome row
    local welcome = Instance.new("Frame")
    welcome.BackgroundTransparency = 1
    welcome.Position = UDim2.fromOffset(LEFT_SAFE, TOP_SAFE)
    welcome.Size = UDim2.new(1, -LEFT_SAFE * 2, 0, 34)
    welcome.Parent = root

    local av = Instance.new("ImageLabel")
    av.Size = UDim2.fromOffset(34, 34)
    av.BackgroundColor3 = Color3.fromRGB(28, 28, 32)
    av.BorderSizePixel = 0
    av.Image = "rbxthumb://type=AvatarHeadShot&id=" .. tostring(player.UserId) .. "&w=150&h=150"
    av.Parent = welcome
    corner(av, 999)

    local hi = label(welcome, "Welcome, " .. player.DisplayName .. "!", 16, Color3.fromRGB(245, 245, 250), Enum.Font.GothamBold)
    hi.Position = UDim2.fromOffset(46, 0)
    hi.Size = UDim2.new(1, -140, 1, 0)

    local logo = Instance.new("ImageLabel")
    logo.AnchorPoint = Vector2.new(1, 0.5)
    logo.Position = UDim2.new(1, 0, 0.5, 0)
    logo.Size = UDim2.fromOffset(34, 34)
    logo.BackgroundTransparency = 1
    logo.Image = M.LOGO_IMAGE or ""
    logo.Visible = (M.LOGO_IMAGE or "") ~= ""
    logo.Parent = welcome

    local close = Instance.new("TextButton")
    close.AnchorPoint = Vector2.new(1, 0.5)
    close.Position = UDim2.new(1, (M.LOGO_IMAGE or "") ~= "" and -44 or 0, 0.5, 0)
    close.Size = UDim2.fromOffset(28, 28)
    close.BackgroundColor3 = Color3.fromRGB(26, 26, 30)
    close.Font = Enum.Font.GothamBold
    close.TextSize = 12
    close.TextColor3 = Color3.fromRGB(200, 200, 205)
    close.Text = "X"
    close.Parent = welcome
    corner(close, 8)
    close.MouseButton1Click:Connect(function() gui.Enabled = false end)

    -- ================================================================= banner
    local banner = Instance.new("Frame")
    banner.Position = UDim2.fromOffset(LEFT_SAFE, TOP_SAFE + 48)
    banner.Size = UDim2.new(1, -LEFT_SAFE * 2, 0, 150)
    banner.BackgroundColor3 = Color3.fromRGB(15, 15, 17)
    banner.BorderSizePixel = 0
    banner.Parent = root
    corner(banner, 10)

    local bGrad = Instance.new("UIGradient")
    bGrad.Color = ColorSequence.new(Color3.fromRGB(20, 20, 23), Color3.fromRGB(10, 10, 12))
    bGrad.Rotation = 12
    bGrad.Parent = banner

    local bState = label(banner, "NO ONGOING FLIGHTS", 26, Color3.fromRGB(248, 248, 252), Enum.Font.GothamBlack)
    bState.Position = UDim2.fromOffset(34, 28)
    bState.Size = UDim2.new(1, -68, 0, 32)

    local bNext = Instance.new("TextLabel")
    bNext.BackgroundTransparency = 1
    bNext.RichText = true
    bNext.Font = Enum.Font.GothamMedium
    bNext.TextSize = 15
    bNext.TextColor3 = Color3.fromRGB(225, 225, 232)
    bNext.TextXAlignment = Enum.TextXAlignment.Left
    bNext.Position = UDim2.fromOffset(34, 68)
    bNext.Size = UDim2.new(1, -68, 0, 20)
    bNext.Text = "Checking the schedule..."
    bNext.Parent = banner

    local bMeta = Instance.new("TextLabel")
    bMeta.BackgroundTransparency = 1
    bMeta.RichText = true
    bMeta.Font = Enum.Font.GothamMedium
    bMeta.TextSize = 13
    bMeta.TextColor3 = Color3.fromRGB(160, 160, 170)
    bMeta.TextXAlignment = Enum.TextXAlignment.Left
    bMeta.Position = UDim2.fromOffset(34, 98)
    bMeta.Size = UDim2.new(1, -68, 0, 18)
    bMeta.Text = ""
    bMeta.Parent = banner

    local bJoin = Instance.new("TextButton")
    bJoin.AnchorPoint = Vector2.new(1, 1)
    bJoin.Position = UDim2.new(1, -24, 1, -24)
    bJoin.Size = UDim2.fromOffset(150, 36)
    bJoin.BackgroundColor3 = ACCENT
    bJoin.Font = Enum.Font.GothamBold
    bJoin.TextSize = 13
    bJoin.TextColor3 = Color3.fromRGB(255, 255, 255)
    bJoin.Text = "Join Flight"
    bJoin.Visible = false
    bJoin.Parent = banner
    corner(bJoin, 8)

    -- =================================================================== tabs
    local tabRow = Instance.new("Frame")
    tabRow.BackgroundTransparency = 1
    tabRow.Position = UDim2.fromOffset(LEFT_SAFE, TOP_SAFE + 220)
    tabRow.Size = UDim2.new(1, -LEFT_SAFE * 2, 0, 34)
    tabRow.Parent = root

    local tabList = Instance.new("UIListLayout")
    tabList.FillDirection = Enum.FillDirection.Horizontal
    tabList.Padding = UDim.new(0, 26)
    tabList.VerticalAlignment = Enum.VerticalAlignment.Center
    tabList.Parent = tabRow

    local pages, tabs = {}, {}
    local function selectPage(name)
        for n, f in pairs(pages) do f.Visible = (n == name) end
        for n, t in pairs(tabs) do
            t.btn.TextColor3 = (n == name) and Color3.fromRGB(245, 245, 250) or Color3.fromRGB(130, 130, 140)
            t.line.Visible = (n == name)
        end
    end

    local function page(name, tabText, order)
        local holder = Instance.new("Frame")
        holder.BackgroundTransparency = 1
        holder.Size = UDim2.fromOffset(#tabText * 9 + 8, 30)
        holder.LayoutOrder = order
        holder.Parent = tabRow

        local b = Instance.new("TextButton")
        b.BackgroundTransparency = 1
        b.Size = UDim2.new(1, 0, 1, -4)
        b.Font = Enum.Font.GothamBold
        b.TextSize = 14
        b.TextXAlignment = Enum.TextXAlignment.Left
        b.Text = string.upper(tabText)
        b.TextColor3 = Color3.fromRGB(130, 130, 140)
        b.Parent = holder

        local line = Instance.new("Frame")
        line.AnchorPoint = Vector2.new(0, 1)
        line.Position = UDim2.new(0, 0, 1, 0)
        line.Size = UDim2.new(1, -8, 0, 2)
        line.BackgroundColor3 = ACCENT
        line.BorderSizePixel = 0
        line.Visible = false
        line.Parent = holder

        local f = Instance.new("ScrollingFrame")
        f.Position = UDim2.fromOffset(LEFT_SAFE, TOP_SAFE + 262)
        f.Size = UDim2.new(1, -LEFT_SAFE * 2, 1, -(TOP_SAFE + 300))
        f.BackgroundTransparency = 1
        f.BorderSizePixel = 0
        f.ScrollBarThickness = 4
        f.ScrollBarImageColor3 = Color3.fromRGB(240, 240, 245)
        f.CanvasSize = UDim2.new()
        f.AutomaticCanvasSize = Enum.AutomaticSize.XY
        f.ScrollingDirection = Enum.ScrollingDirection.XY
        f.Visible = false
        f.Parent = root
        pages[name] = f

        b.MouseButton1Click:Connect(function() selectPage(name) end)
        tabs[name] = { btn = b, line = line }
        return f
    end

    local flightsPage = page("Flights", (M.HUB_NAME or "") .. " Flights", 1)
    local gamesPage   = page("Games", (M.HUB_NAME or "") .. " Experiences", 2)
    local storePage   = page("Store", "Store", 3)

    local fRow = Instance.new("UIListLayout")
    fRow.FillDirection = Enum.FillDirection.Horizontal
    fRow.Padding = UDim.new(0, 16)
    fRow.Parent = flightsPage

    local gRow = Instance.new("UIListLayout")
    gRow.FillDirection = Enum.FillDirection.Horizontal
    gRow.Padding = UDim.new(0, 16)
    gRow.Parent = gamesPage

    local sList = Instance.new("UIListLayout")
    sList.Padding = UDim.new(0, 10)
    sList.Parent = storePage

    -- Shared "experience card": header strip, big art, play button
    local function tile(order, headerLeft, headerRight, image, onPlay, playColor, playText)
        local card = Instance.new("Frame")
        card.Size = UDim2.fromOffset(285, 450)
        card.BackgroundColor3 = CARD
        card.BorderSizePixel = 0
        card.LayoutOrder = order
        corner(card, 4)

        local strip = Instance.new("Frame")
        strip.Size = UDim2.new(1, 0, 0, 44)
        strip.BackgroundColor3 = Color3.fromRGB(24, 24, 28)
        strip.BorderSizePixel = 0
        strip.Parent = card

        local left = label(strip, headerLeft, 13, Color3.fromRGB(225, 225, 232), Enum.Font.GothamBold)
        left.Position = UDim2.fromOffset(14, 0)
        left.Size = UDim2.new(0, 90, 1, 0)

        local right = label(strip, headerRight, 12, Color3.fromRGB(225, 225, 232), Enum.Font.GothamBold)
        right.TextXAlignment = Enum.TextXAlignment.Right
        right.Position = UDim2.new(0, 100, 0, 0)
        right.Size = UDim2.new(1, -114, 1, 0)

        local art = Instance.new("ImageLabel")
        art.Position = UDim2.fromOffset(0, 44)
        art.Size = UDim2.new(1, 0, 1, -44)
        art.BackgroundColor3 = Color3.fromRGB(20, 20, 24)
        art.BorderSizePixel = 0
        art.ScaleType = Enum.ScaleType.Crop
        art.Image = image or ""
        art.Parent = card

        local play = Instance.new("TextButton")
        play.AnchorPoint = Vector2.new(0.5, 1)
        play.Position = UDim2.new(0.5, 0, 1, -18)
        play.Size = UDim2.new(1, -50, 0, 40)
        play.BackgroundColor3 = playColor or GREEN
        play.Font = Enum.Font.GothamBold
        play.TextSize = 15
        play.TextColor3 = Color3.fromRGB(255, 255, 255)
        play.Text = playText or "▶"
        play.Parent = card
        corner(play, 4)
        play.MouseButton1Click:Connect(function() onPlay() end)

        return card
    end

    local function flightCard(f, order)
        local head = f.flight or string.upper(string.sub(tostring(f.category), 1, 8))
        local route = (f.origin and f.destination) and (string.upper(f.origin) .. " → " .. string.upper(f.destination))
            or string.upper(tostring(f.name or "FLIGHT"))
        local live = f.status == "started"
        local icon = (M.GAME_ICONS or {})[f.placeId]
        local art = icon and ("rbxassetid://" .. tostring(icon))
            or (f.placeId and ("rbxthumb://type=GameIcon&id=" .. tostring(f.placeId) .. "&w=420&h=420") or "")
        local card = tile(order, (live and "BOARDING · " or "") .. clockLabel(f.date), route,
            art, function() joinPlace(f.placeId) end, live and GREEN or ACCENT,
            live and "JOIN NOW" or "JOIN FLIGHT")


        local info = Instance.new("Frame")
        info.AnchorPoint = Vector2.new(0, 1)
        info.Position = UDim2.new(0, 0, 1, -66)
        info.Size = UDim2.new(1, 0, 0, 64)
        info.BackgroundColor3 = Color3.fromRGB(10, 10, 12)
        info.BackgroundTransparency = 0.25
        info.BorderSizePixel = 0
        info.Parent = card

        local n = label(info, head .. "  " .. tostring(f.name or ""), 14, Color3.fromRGB(245, 245, 250), Enum.Font.GothamBold)
        n.Position = UDim2.fromOffset(14, 8)
        n.Size = UDim2.new(1, -28, 0, 18)

        local hostTxt = (f.host and ("Host: " .. f.host) or "Host: TBD") .. (f.aircraft and ("  |  " .. f.aircraft) or "")
        local h = label(info, hostTxt, 12, Color3.fromRGB(165, 165, 175))
        h.Position = UDim2.fromOffset(14, 30)
        h.Size = UDim2.new(1, -60, 0, 16)

        if f.hostId then
            local a = Instance.new("ImageLabel")
            a.AnchorPoint = Vector2.new(1, 0)
            a.Position = UDim2.new(1, -14, 0, 24)
            a.Size = UDim2.fromOffset(26, 26)
            a.BackgroundColor3 = Color3.fromRGB(30, 30, 36)
            a.BorderSizePixel = 0
            a.Image = "rbxthumb://type=AvatarHeadShot&id=" .. tostring(f.hostId) .. "&w=150&h=150"
            a.Parent = info
            corner(a, 999)
        end

        return card
    end

    local function gameCard(p, order)
        local manual = (M.GAME_ICONS or {})[p.id]
        local img = manual and ("rbxassetid://" .. tostring(manual)) or p.icon
        if not img or img == "" then
            img = "rbxthumb://type=GameIcon&id=" .. tostring(p.id) .. "&w=420&h=420"
        end
        return tile(order, tostring(p.playing or 0) .. " playing", string.upper(tostring(p.name or "GAME")),
            img, function() joinPlace(p.id) end, GREEN, "▶")
    end


    local function passRow(p, order)
        local row = Instance.new("Frame")
        row.Size = UDim2.new(0, 560, 0, 84)
        row.BackgroundColor3 = CARD
        row.BorderSizePixel = 0
        row.LayoutOrder = order
        corner(row, 6) stroke(row)

        local img = Instance.new("ImageLabel")
        img.Size = UDim2.fromOffset(60, 60)
        img.Position = UDim2.fromOffset(12, 12)
        img.BackgroundColor3 = Color3.fromRGB(30, 30, 34)
        img.BorderSizePixel = 0
        img.ScaleType = Enum.ScaleType.Crop
        img.Image = (p.icon and p.icon ~= "" and p.icon)
            or ("rbxthumb://type=GamePass&id=" .. tostring(p.id) .. "&w=150&h=150")
        img.Parent = row
        corner(img, 6)

        local n = label(row, p.name, 13, Color3.fromRGB(235, 235, 240), Enum.Font.GothamBold)
        n.Position = UDim2.fromOffset(84, 12)
        n.Size = UDim2.new(1, -230, 0, 18)

        local pr = label(row, p.price and (tostring(p.price) .. " Robux") or "Unavailable", 11, Color3.fromRGB(150, 150, 158))
        pr.Position = UDim2.fromOffset(84, 32)
        pr.Size = UDim2.new(1, -230, 0, 16)

        local desc = label(row, p.description or "", 11, Color3.fromRGB(125, 125, 135))
        desc.Position = UDim2.fromOffset(84, 50)
        desc.Size = UDim2.new(1, -230, 0, 26)
        desc.TextWrapped = true
        desc.TextYAlignment = Enum.TextYAlignment.Top
        desc.Visible = (p.description or "") ~= ""

        local buy = Instance.new("TextButton")
        buy.AnchorPoint = Vector2.new(1, 0.5)
        buy.Position = UDim2.new(1, -12, 0.5, 0)
        buy.Size = UDim2.fromOffset(110, 32)
        buy.BackgroundColor3 = GREEN
        buy.Font = Enum.Font.GothamBold
        buy.TextSize = 12
        buy.TextColor3 = Color3.fromRGB(255, 255, 255)
        buy.Text = "Purchase"
        buy.Parent = row
        corner(buy, 6)
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

    local function hex(c) return string.format("#%02X%02X%02X", c.R * 255, c.G * 255, c.B * 255) end

    local joinTarget = nil
    bJoin.MouseButton1Click:Connect(function() if joinTarget then joinPlace(joinTarget) end end)

    local function render()

        local ok, data = pcall(function() return remote:InvokeServer() end)
        if not ok or type(data) ~= "table" then return end

        -- banner state
        local live, nextFlight
        for _, f in ipairs(data.flights) do
            if f.status == "started" then live = live or f end
            if not nextFlight then nextFlight = f end
        end
        local a = hex(ACCENT)
        local function route(f)
            local o, d = f.origin, f.destination
            if o and d then return string.format(' from <b>%s</b> to <b>%s</b>', tostring(o), tostring(d)) end
            if d then return string.format(' to <b>%s</b>', tostring(d)) end
            return ""
        end
        if live then
            bState.Text = "FLIGHT IN PROGRESS"
            bNext.Text = string.format('Now boarding: <b><font color="%s">%s</font></b>%s',
                a, tostring(live.flight or live.name or "Flight"), route(live))
            bMeta.Text = "Departure: <b>" .. clockLabel(live.date) .. "</b>"
            bJoin.Text = "Join Flight"
            bJoin.Visible = live.placeId ~= nil
            joinTarget = live.placeId
        elseif nextFlight then
            local off = dayOffset(nextFlight.date)
            bState.Text = off == 1 and "NEXT FLIGHT — TOMORROW"
                or (off > 1 and ("NEXT FLIGHT — IN " .. tostring(off) .. " DAYS") or "NEXT SCHEDULED FLIGHT")
            bNext.Text = string.format('<b><font color="%s">%s</font></b>%s',
                a, tostring(nextFlight.flight or nextFlight.name or "TBD"), route(nextFlight))
            bMeta.Text = string.format('Check-in opens: <font color="%s"><b>%s</b></font>   |   Host: <b>%s</b>',
                a, clockLabel(nextFlight.date), tostring(nextFlight.host or "TBD"))
            bJoin.Visible = false
            joinTarget = nil
        else
            bState.Text = "NO FLIGHTS"
            bNext.Text = M.EMPTY_TEXT
            bMeta.Text = ""
            bJoin.Visible = false
            joinTarget = nil
        end



        clear(flightsPage)
        if #data.flights == 0 then
            local e = label(flightsPage, M.EMPTY_TEXT, 13, Color3.fromRGB(140, 140, 150))
            e.Size = UDim2.fromOffset(320, 40)
        else
            for i, f in ipairs(data.flights) do flightCard(f, i).Parent = flightsPage end
        end

        clear(gamesPage)
        if #data.places == 0 then
            local e = label(gamesPage, "No games found for this group", 13, Color3.fromRGB(140, 140, 150))
            e.Size = UDim2.fromOffset(320, 40)
        else
            for i, p in ipairs(data.places) do gameCard(p, i).Parent = gamesPage end
        end

        clear(storePage)
        if #data.passes == 0 then
            local e = label(storePage, "No gamepasses configured", 13, Color3.fromRGB(140, 140, 150))
            e.Size = UDim2.fromOffset(320, 40)
        else
            for i, p in ipairs(data.passes) do passRow(p, i).Parent = storePage end
        end
    end

    selectPage("Games")
    render()

    UserInputService.InputBegan:Connect(function(input, processed)
        if processed then return end
        if input.KeyCode == M.TOGGLE_KEY then gui.Enabled = not gui.Enabled end
    end)

    task.spawn(function()
        while true do
            task.wait(math.max(10, tonumber(M.REFRESH_SECONDS) or 30))
            pcall(render)
        end
    end)
end

return M
`;
}

const HANDLER = `--!strict
-- Fluxcore Flight Hub — HANDLER (server)
-- Place this Script in ServerScriptService and name it "FlightHubHandler".
-- Enable HTTP Requests: Game Settings -> Security -> Allow HTTP Requests.

local HttpService        = game:GetService("HttpService")
local ReplicatedStorage  = game:GetService("ReplicatedStorage")
local MarketplaceService = game:GetService("MarketplaceService")

local cfg = require(ReplicatedStorage:WaitForChild("FlightHubConfig"))

local remote = ReplicatedStorage:FindFirstChild("FluxcoreFlightHub")
if not remote then
    remote = Instance.new("RemoteFunction")
    remote.Name = "FluxcoreFlightHub"
    remote.Parent = ReplicatedStorage
end

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
                -- Fluxcore resolves IATA/ICAO codes for us (MUC -> Munich)
                origin      = s.origin_name or s.origin,
                destination = s.destination_name or s.destination,
                originCode  = s.origin,
                destCode    = s.destination,
                aircraft    = s.aircraft_model,
                tail        = s.tail_number,
                host        = (s.host and s.host.username) or s.host_name,
                hostId      = tonumber(s.host and s.host.userId),
                status      = s.status,
                placeId     = placeId,
                link        = link,
            })
        end
    end
    table.sort(out, function(a, b) return tostring(a.date) < tostring(b.date) end)
    return out
end

-- Public games owned by the Roblox group, fetched through Fluxcore so Roblox
-- web APIs stay reachable from the game server (icons included).
local function fetchGames()
    local ok, res = pcall(function()
        return HttpService:RequestAsync({
            Url = cfg.DOMAIN .. "/api/v1/games",
            Method = "GET",
            Headers = { ["x-api-key"] = cfg.API_KEY, ["Content-Type"] = "application/json" },
        })
    end)
    if not ok or not res.Success then return {} end
    local decoded
    if not pcall(function() decoded = HttpService:JSONDecode(res.Body) end) then return {} end
    local out = {}
    for _, g in ipairs((decoded and decoded.games) or {}) do
        if g.placeId then
            table.insert(out, {
                id      = g.placeId,
                name    = g.name or "Game",
                playing = g.playing or 0,
                icon    = g.icon, -- CDN url from Fluxcore, falls back to rbxthumb on the client
            })
        end
    end
    return out
end


local cache, cacheAt = {}, -1e9
local gameCache, gameCacheAt = {}, -1e9

local function payload()
    local interval = math.max(10, tonumber(cfg.REFRESH_SECONDS) or 30)
    if os.clock() - cacheAt > interval then
        cache = fetch()
        cacheAt = os.clock()
    end
    if os.clock() - gameCacheAt > math.max(60, interval) then
        gameCache = fetchGames()
        gameCacheAt = os.clock()
    end

    local placeInfo, seen = {}, {}
    for _, g in ipairs(gameCache) do
        if not seen[g.id] then seen[g.id] = true; table.insert(placeInfo, g) end
    end
    local extra = {}
    for _, id in ipairs(cfg.PLACE_IDS or {}) do
        if not seen[id] then seen[id] = true; table.insert(extra, id) end
    end
    for _, f in ipairs(cache) do
        if f.placeId and not seen[f.placeId] then seen[f.placeId] = true; table.insert(extra, f.placeId) end
    end
    for _, id in ipairs(extra) do
        local ok, info = pcall(function() return MarketplaceService:GetProductInfo(id) end)
        table.insert(placeInfo, {
            id      = id,
            name    = (ok and info and info.Name) or ("Place " .. tostring(id)),
            playing = 0,
            icon    = (ok and info and info.IconImageAssetId and info.IconImageAssetId > 0)
                      and ("rbxassetid://" .. tostring(info.IconImageAssetId)) or nil,
        })
    end

    local passes = {}
    for _, id in ipairs(cfg.GAMEPASS_IDS or {}) do
        local ok, info = pcall(function()
            return MarketplaceService:GetProductInfo(id, Enum.InfoType.GamePass)
        end)
        local decal = ok and info and tonumber(info.IconImageAssetId) or nil
        table.insert(passes, {
            id          = id,
            name        = (ok and info and info.Name) or ("Gamepass " .. tostring(id)),
            price       = (ok and info and info.PriceInRobux) or nil,
            description = (ok and info and info.Description) or nil,
            decalId     = decal,
            icon        = (decal and decal > 0) and ("rbxassetid://" .. tostring(decal)) or nil,
        })
    end


    return {
        flights = cache,
        places  = placeInfo,
        passes  = passes,
        header  = (cfg.HEADER or {})[string.lower(cfg.CATEGORY or "all")] or "Available Flights",
    }
end

remote.OnServerInvoke = function()
    local ok, data = pcall(payload)
    if ok then return data end
    return { flights = {}, places = {}, passes = {}, header = "Available Flights" }
end
`;

const BOOTSTRAP = `-- Fluxcore Flight Hub — CLIENT (LocalScript in StarterPlayer > StarterPlayerScripts)
require(game:GetService("ReplicatedStorage"):WaitForChild("FlightHubConfig")).mount()
`;

export default function FlightHubTab() {
  const [domain, setDomain] = useState("https://fluxcore.works");
  const [apiKey, setApiKey] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [hubName, setHubName] = useState("Flight Hub");
  const [passes, setPasses] = useState("");
  const [tzOffset, setTzOffset] = useState("0");
  const [revealed, setRevealed] = useState(false);

  const config = useMemo(
    () => buildConfig(domain, apiKey, filter, hubName, passes, tzOffset),
    [domain, apiKey, filter, hubName, passes, tzOffset],
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
          <div className="space-y-1">
            <Label className="text-xs">Timezone offset from UTC (hours)</Label>
            <Input value={tzOffset} onChange={(e) => setTzOffset(e.target.value)} placeholder="0" className="font-mono text-xs" />
            <p className="text-[11px] text-muted-foreground">Departure times come from the API in UTC. Use 2 for CEST, -4 for EDT, 0 for UTC.</p>
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
          <p>2. Create a <code>ModuleScript</code> named <code>FlightHubConfig</code> in <code>ReplicatedStorage</code> and paste <strong>Script 1 — Config</strong>.</p>
          <p>3. Create a <code>Script</code> named <code>FlightHubHandler</code> in <code>ServerScriptService</code> and paste <strong>Script 2 — Handler</strong>.</p>
          <p>4. Create a <code>LocalScript</code> in <code>StarterPlayer → StarterPlayerScripts</code> and paste the one-line <strong>client bootstrap</strong> below.</p>
          <p>5. Flight numbers, origin/destination, aircraft and host come straight from the Fluxcore session. Only flights with a game link are listed.</p>

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
            <p className="text-sm font-semibold text-foreground">Script 2 — Handler <span className="text-muted-foreground font-normal">(Script in ServerScriptService)</span></p>
            <p className="text-[11px] text-muted-foreground">Fetches flights, place icons and gamepass info, then serves them to the hub UI.</p>
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

      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Client bootstrap <span className="text-muted-foreground font-normal">(LocalScript in StarterPlayerScripts)</span></p>
            <p className="text-[11px] text-muted-foreground">One line — mounts the hub UI from the Config module.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => copy(BOOTSTRAP, "Client bootstrap")}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        </div>
        <pre className="text-[11px] leading-relaxed font-mono p-4 overflow-auto whitespace-pre text-foreground/90">{BOOTSTRAP}</pre>
      </div>
    </div>

  );
}
