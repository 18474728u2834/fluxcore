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
                origin      = s.origin,
                destination = s.destination,
                aircraft    = s.aircraft_model,
                tail        = s.tail_number,
                host        = (s.host and s.host.username) or s.host_name,
                hostId      = tonumber(s.host and s.host.user_id),
                placeId     = placeId,
                link        = link,
            })
        end
    end
    table.sort(out, function(a, b) return tostring(a.date) < tostring(b.date) end)
    return out
end

local cache, cacheAt = {}, -1e9

local function payload()
    local interval = math.max(10, tonumber(cfg.REFRESH_SECONDS) or 30)
    if os.clock() - cacheAt > interval then
        cache = fetch()
        cacheAt = os.clock()
    end

    local places, seen = {}, {}
    for _, id in ipairs(cfg.PLACE_IDS or {}) do
        if not seen[id] then seen[id] = true; table.insert(places, id) end
    end
    for _, f in ipairs(cache) do
        if f.placeId and not seen[f.placeId] then seen[f.placeId] = true; table.insert(places, f.placeId) end
    end

    local placeInfo = {}
    for _, id in ipairs(places) do
        local ok, info = pcall(function() return MarketplaceService:GetProductInfo(id) end)
        table.insert(placeInfo, { id = id, name = (ok and info and info.Name) or ("Place " .. tostring(id)) })
    end

    local passes = {}
    for _, id in ipairs(cfg.GAMEPASS_IDS or {}) do
        local ok, info = pcall(function()
            return MarketplaceService:GetProductInfo(id, Enum.InfoType.GamePass)
        end)
        table.insert(passes, {
            id    = id,
            name  = (ok and info and info.Name) or ("Gamepass " .. tostring(id)),
            price = (ok and info and info.PriceInRobux) or nil,
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
\`;

const BOOTSTRAP = \`-- Fluxcore Flight Hub — CLIENT (LocalScript in StarterPlayer > StarterPlayerScripts)
require(game:GetService("ReplicatedStorage"):WaitForChild("FlightHubConfig")).mount()
\`;

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
