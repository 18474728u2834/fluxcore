import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Copy, RefreshCw, Key, Save, Loader2, Palette, Globe, Grid3X3,
  MessageSquare, Bot, ShieldCheck, Lock, Trophy, Target,
  Image as ImageIcon, Upload, X, Sliders, Plug, Code, CalendarDays,
  ExternalLink, ChevronRight,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect, useRef, useMemo } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InviteSection } from "@/components/InviteSection";
import SubdomainCard from "@/components/SubdomainCard";
import { WebhookTemplatesCard } from "@/components/WebhookTemplatesCard";
import { DiscordBotCard } from "@/components/DiscordBotCard";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

type SectionId = "general" | "integrations" | "tracking" | "sessions";

const SECTIONS: { id: SectionId; label: string; icon: any; desc: string }[] = [
  { id: "general",      label: "General & Appearance", icon: Sliders, desc: "Workspace identity, branding, dashboard look" },
  { id: "integrations", label: "Integrations",          icon: Plug,    desc: "Discord webhooks, Roblox Open Cloud" },
  { id: "tracking",     label: "Tracking & Scripts",    icon: Code,    desc: "Activity tracker, API key, in-game features" },
  { id: "sessions",     label: "Sessions & Quotas",     icon: CalendarDays, desc: "Role labels, leaderboards, quota logging" },
];

export default function SettingsPage() {
  const { workspace, isOwner, workspaceId, loading } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const initial = (params.get("section") as SectionId) || "general";
  const [active, setActive] = useState<SectionId>(SECTIONS.find(s => s.id === initial) ? initial : "general");

  const setSection = (id: SectionId) => {
    setActive(id);
    const next = new URLSearchParams(params);
    next.set("section", id);
    setParams(next, { replace: true });
  };

  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [appCenterKey, setAppCenterKey] = useState("");
  const [appCenterCopied, setAppCenterCopied] = useState(false);
  const [rotatingAppCenter, setRotatingAppCenter] = useState(false);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [robloxApiKey, setRobloxApiKey] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [textColor, setTextColor] = useState("#ffffff");
  const [backgroundColor, setBackgroundColor] = useState("#0f0f11");
  const [showGrid, setShowGrid] = useState(true);
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [rankgunApiKey, setRankgunApiKey] = useState("");
  const [gameUrl, setGameUrl] = useState("");
  const [hostLabel, setHostLabel] = useState("Host");
  const [coHostLabel, setCoHostLabel] = useState("Co-Host");
  const [trainerLabel, setTrainerLabel] = useState("Trainer");
  const [messageLogger, setMessageLogger] = useState(false);
  const [autoRank, setAutoRank] = useState(false);
  const [afkConfirmSeconds, setAfkConfirmSeconds] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [leaderboardCategories, setLeaderboardCategories] = useState<string[]>([]);
  const [quotaLogMode, setQuotaLogMode] = useState<"none" | "webhook" | "warning">("none");
  const [quotaLogWebhook, setQuotaLogWebhook] = useState("");
  const [nexusHeroUrl, setNexusHeroUrl] = useState<string>("");
  const [uploadingHero, setUploadingHero] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setGroupId(workspace.roblox_group_id || "");
      const fetchExtras = async () => {
        const { data } = await supabase.from("workspaces")
          .select("primary_color, text_color, background_color, show_grid, message_logger_enabled, auto_rank_enabled, game_url, session_role_labels, afk_confirm_seconds, leaderboard_categories, quota_log_mode, nexus_hero_image_url")
          .eq("id", workspaceId).single();
        const { data: secretsRows } = await supabase
          .rpc("get_workspace_secrets", { _workspace_id: workspaceId });
        const secrets: any = Array.isArray(secretsRows) ? secretsRows[0] : secretsRows;
        if (data) {
          // Auto-create an API key on first load so owners never need to "reset" to get one.
          let key = secrets?.api_key || "";
          if (!key) {
            const generated = "flx_" + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("");
            const { error: genErr } = await supabase.rpc("set_workspace_secrets", { _workspace_id: workspaceId, _values: { api_key: generated } as any });
            if (!genErr) key = generated;
          }
          setApiKey(key);
          setPrimaryColor((data as any).primary_color || "#7c3aed");
          setTextColor((data as any).text_color || "#ffffff");
          setBackgroundColor((data as any).background_color || "#0f0f11");
          setShowGrid((data as any).show_grid ?? true);
          setRobloxApiKey(secrets?.roblox_api_key || "");
          setDiscordWebhook(secrets?.discord_webhook_url || "");
          setRankgunApiKey(secrets?.rankgun_api_key || "");
          setMessageLogger((data as any).message_logger_enabled || false);
          setAutoRank((data as any).auto_rank_enabled || false);
          setAfkConfirmSeconds((data as any).afk_confirm_seconds || 0);
          setGameUrl((data as any).game_url || "");
          const labels = (data as any).session_role_labels || {};
          setHostLabel(labels.host || "Host");
          setCoHostLabel(labels.co_host || "Co-Host");
          setTrainerLabel(labels.trainer || "Trainer");
          setLeaderboardCategories(((data as any).leaderboard_categories || []) as string[]);
          setQuotaLogMode(((data as any).quota_log_mode || "none") as any);
          setQuotaLogWebhook(secrets?.quota_log_webhook_url || "");
          setNexusHeroUrl((data as any).nexus_hero_image_url || "");
        }
      };
      fetchExtras();
    }
  }, [workspace]);

  const copyKey = () => { navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const resetKey = async () => {
    setResetting(true);
    const newKey = "flx_" + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.rpc("set_workspace_secrets", { _workspace_id: workspaceId, _values: { api_key: newKey } as any });
    if (error) toast.error("Failed to reset API key");
    else { setApiKey(newKey); toast.success("API key reset!"); }
    setResetting(false);
  };

  const testDiscord = async () => {
    setTestingDiscord(true);
    const res = await supabase.functions.invoke("discord-notify", {
      body: { action: "test", workspace_id: workspaceId },
    });
    if (res.data?.success) toast.success("Test message sent to Discord!");
    else toast.error(res.data?.error || "Failed to send test message");
    setTestingDiscord(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from("workspaces").update({
      name: name.trim(),
      roblox_group_id: groupId.trim() || null,
      primary_color: primaryColor,
      text_color: textColor,
      background_color: backgroundColor,
      show_grid: showGrid,
      message_logger_enabled: messageLogger,
      auto_rank_enabled: autoRank,
      afk_confirm_seconds: Math.max(0, Math.floor(Number(afkConfirmSeconds) || 0)),
      game_url: gameUrl.trim() || null,
      session_role_labels: {
        host: hostLabel.trim() || "Host",
        co_host: coHostLabel.trim() || "Co-Host",
        trainer: trainerLabel.trim() || "Trainer",
      },
      leaderboard_categories: leaderboardCategories,
      quota_log_mode: quotaLogMode,
      quota_log_configured: true,
      nexus_hero_image_url: nexusHeroUrl.trim() || null,
    } as any).eq("id", workspaceId);

    if (!error) {
      // Sensitive credentials are stored encrypted via a security-definer RPC.
      const { error: secErr } = await supabase.rpc("set_workspace_secrets", {
        _workspace_id: workspaceId,
        _values: {
          roblox_api_key: robloxApiKey.trim() || null,
          discord_webhook_url: discordWebhook.trim() || null,
          rankgun_api_key: rankgunApiKey.trim() || null,
          quota_log_webhook_url: quotaLogMode === "webhook" ? (quotaLogWebhook.trim() || null) : null,
        } as any,
      });
      if (secErr) { toast.error("Failed to save credentials: " + secErr.message); setSaving(false); return; }
    }

    if (error) toast.error("Failed to save: " + error.message);
    else toast.success("Settings saved!");
    setSaving(false);
  };

  const uploadHero = async (file: File) => {
    if (!workspaceId || !file) return;
    setUploadingHero(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${workspaceId}/nexus-hero-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("webhook-images").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("webhook-images").getPublicUrl(path);
      setNexusHeroUrl(pub.publicUrl);
      await supabase.from("workspaces").update({ nexus_hero_image_url: pub.publicUrl } as any).eq("id", workspaceId);
      toast.success("Hero image updated");
    } catch (e: any) {
      toast.error("Upload failed: " + (e?.message || "unknown error"));
    } finally {
      setUploadingHero(false);
    }
  };

  const clearHero = async () => {
    setNexusHeroUrl("");
    await supabase.from("workspaces").update({ nexus_hero_image_url: null } as any).eq("id", workspaceId);
    toast.success("Reverted to default blue background");
  };

  if (!loading && !isOwner) {
    return (
      <DashboardLayout title="Settings">
        <div className="max-w-md mx-auto mt-20 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Owner only</h1>
          <p className="text-sm text-muted-foreground">Only the workspace owner can access settings.</p>
        </div>
      </DashboardLayout>
    );
  }

  const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <DashboardLayout title="Settings">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left sidebar nav */}
        <aside className="w-full lg:w-64 lg:sticky lg:top-4 shrink-0">
          <div className="glass rounded-xl p-2">
            <nav className="space-y-0.5">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      isActive ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                    <span className="text-sm font-medium">{s.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 px-3">
            Changes apply when you click <span className="text-foreground font-medium">Save All Changes</span>.
          </p>
        </aside>

        {/* Right pane */}
        <div className="flex-1 min-w-0 space-y-6 max-w-2xl w-full">
          {active === "general" && (
            <>
              <SectionHeader title="General & Appearance" sub="Workspace identity, branding, and dashboard look." />

              <InviteSection />
              <SubdomainCard workspaceId={workspaceId} workspaceName={workspace?.name || "My Workspace"} />

              <div className="glass rounded-xl p-5 space-y-4">
                <h2 className="font-semibold text-foreground text-sm">Workspace</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Workspace Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Roblox Group ID</Label>
                    <Input value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="e.g. 12345678" className="bg-muted border-border" />
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Branding & Customization</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                      <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="bg-muted border-border text-xs font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Text Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                      <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="bg-muted border-border text-xs font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Background Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                      <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="bg-muted border-border text-xs font-mono" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Grid Background</p>
                      <p className="text-xs text-muted-foreground">Show grid pattern on dashboard</p>
                    </div>
                  </div>
                  <Switch checked={showGrid} onCheckedChange={setShowGrid} />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: primaryColor, color: textColor }}>Aa</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: textColor }}>Preview</p>
                    <p className="text-xs" style={{ color: textColor, opacity: 0.6 }}>Your brand colors</p>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Nexus Dashboard Banner</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Replace the default blue gradient on the Nexus dashboard with your own image. Leave empty to use the default gradient.
                </p>
                <div
                  className="rounded-md overflow-hidden relative h-32 flex items-end p-4 border border-border"
                  style={nexusHeroUrl
                    ? { backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.25), rgba(0,0,0,0.05)), url(${nexusHeroUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { background: "linear-gradient(135deg, #6ea8ff 0%, #88b8ff 40%, #b6d2ff 100%)" }}
                >
                  <span className="text-white font-bold drop-shadow text-base">Preview banner</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={heroFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHero(f); e.currentTarget.value = ""; }}
                  />
                  <Button type="button" variant="secondary" size="sm" disabled={uploadingHero} onClick={() => heroFileRef.current?.click()}>
                    {uploadingHero ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                    {nexusHeroUrl ? "Replace image" : "Upload image"}
                  </Button>
                  {nexusHeroUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearHero}>
                      <X className="w-3 h-3 mr-1" /> Use default gradient
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {active === "integrations" && (
            <>
              <SectionHeader title="Integrations" sub="Connect Fluxcore to Discord and Roblox Open Cloud." />

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Roblox Open Cloud API Key</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Required for promotions/demotions and importing group roles. Get it from{" "}
                  <a href="https://create.roblox.com/credentials" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Roblox Creator Hub
                  </a>. Ensure the key has <strong>group:read</strong> and <strong>group:write</strong> scopes.
                </p>
                <Input type="password" placeholder="Enter your Roblox Open Cloud API key" value={robloxApiKey}
                  onChange={(e) => setRobloxApiKey(e.target.value)} className="bg-muted border-border font-mono text-xs" />
              </div>

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Discord Integration</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add a Discord webhook URL to receive announcements when sessions are scheduled and reminders 5 minutes before they start.
                  Create a webhook in: Server Settings → Integrations → Webhooks → New Webhook.
                </p>
                <div className="space-y-2">
                  <Label className="text-xs">Webhook URL</Label>
                  <Input placeholder="https://discord.com/api/webhooks/..." value={discordWebhook}
                    onChange={(e) => setDiscordWebhook(e.target.value)} className="bg-muted border-border font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Game Link <span className="text-muted-foreground">(included in webhook messages)</span></Label>
                  <Input placeholder="https://www.roblox.com/games/..." value={gameUrl}
                    onChange={(e) => setGameUrl(e.target.value)} className="bg-muted border-border font-mono text-xs" />
                </div>
                {discordWebhook && (
                  <Button variant="secondary" size="sm" onClick={testDiscord} disabled={testingDiscord}>
                    {testingDiscord && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Test Webhook
                  </Button>
                )}
              </div>

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">RankGun</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste your workspace API key from{" "}
                  <a href="https://www.rankgun.works/sign-in" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    RankGun → Sign in → API Key
                  </a>. Stored encrypted; only used server-side for promote/demote/session calls to <code className="text-foreground">api.rankgun.works</code>.
                </p>
                <div className="space-y-2">
                  <Label className="text-xs">RankGun API Key</Label>
                  <Input type="password" placeholder="Enter your RankGun API key" value={rankgunApiKey}
                    onChange={(e) => setRankgunApiKey(e.target.value)} className="bg-muted border-border font-mono text-xs" />
                </div>
              </div>

              {workspaceId && <DiscordBotCard workspaceId={workspaceId} isOwner={isOwner} />}
              {isOwner && workspaceId && <WebhookTemplatesCard workspaceId={workspaceId} />}
            </>
          )}

          {active === "tracking" && (
            <>
              <SectionHeader title="Tracking & Scripts" sub="The Lua activity tracker, in-game features, and the API key it uses." />

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Fluxcore API Key</h2>
                </div>
                <p className="text-xs text-muted-foreground">Used by the Lua tracker module.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-xs font-mono text-foreground break-all select-all">{apiKey}</code>
                  <Button variant="secondary" size="sm" onClick={copyKey}><Copy className="w-3 h-3 mr-1" /> {copied ? "Copied" : "Copy"}</Button>
                  <Button variant="secondary" size="sm" onClick={resetKey} disabled={resetting}>
                    {resetting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Reset
                  </Button>
                </div>
              </div>

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Application Center API Key</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used by the in-game Application Center Roblox script. Stored as a hash — the full key is only shown once when you rotate it. Keep it secret.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-xs font-mono text-foreground break-all select-all">
                    {appCenterKey || "•••••••••••••••••••••••••  (rotate to generate a new key)"}
                  </code>
                  {appCenterKey && (
                    <Button variant="secondary" size="sm" onClick={() => {
                      navigator.clipboard.writeText(appCenterKey);
                      setAppCenterCopied(true);
                      setTimeout(() => setAppCenterCopied(false), 2000);
                    }}>
                      <Copy className="w-3 h-3 mr-1" /> {appCenterCopied ? "Copied" : "Copy"}
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" disabled={rotatingAppCenter} onClick={async () => {
                    if (!workspaceId) return;
                    setRotatingAppCenter(true);
                    const { data, error } = await supabase.rpc("rotate_app_center_key", { _workspace_id: workspaceId });
                    if (error) toast.error("Failed to rotate key");
                    else { setAppCenterKey(data as string); toast.success("New App Center key generated — copy it now!"); }
                    setRotatingAppCenter(false);
                  }}>
                    {rotatingAppCenter ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Rotate
                  </Button>
                </div>
              </div>

              <Link
                to="../setup-tracking"
                relative="path"
                className="glass rounded-xl p-5 flex items-center justify-between hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Code className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Open the full setup guide</p>
                    <p className="text-xs text-muted-foreground">Lua install steps, copy-paste script, and live tracker status.</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">In-Game Features</h2>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Message Logger</p>
                      <p className="text-xs text-muted-foreground">Log what messages staff send in-game</p>
                    </div>
                  </div>
                  <Switch checked={messageLogger} onCheckedChange={setMessageLogger} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Auto-Rank from Group</p>
                      <p className="text-xs text-muted-foreground">Automatically assign workspace roles based on Roblox group rank. Members don't need invite if enabled.</p>
                    </div>
                  </div>
                  <Switch checked={autoRank} onCheckedChange={setAutoRank} />
                </div>

                <div className="p-3 rounded-lg bg-muted space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">AFK Confirmation Timer</p>
                      <p className="text-xs text-muted-foreground">
                        After a staff member is idle for this many seconds, an in-game button appears: "Click here to remove AFK timer".
                        If they don't click within 30 seconds, their session time is discarded. Set to <strong>0</strong> to disable.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="number"
                      min={0}
                      step={30}
                      value={afkConfirmSeconds}
                      onChange={(e) => setAfkConfirmSeconds(parseInt(e.target.value) || 0)}
                      className="bg-background border-border w-32"
                    />
                    <span className="text-xs text-muted-foreground">seconds (e.g. 300 = 5 min)</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {active === "sessions" && (
            <>
              <SectionHeader title="Sessions & Quotas" sub="Customize session role names, leaderboards, and quota logging." />

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Session Role Labels</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Customize what the three session roles are called in your workspace (e.g. "Trainer" → "Instructor").
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Host label</Label>
                    <Input value={hostLabel} onChange={(e) => setHostLabel(e.target.value)} className="bg-muted border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Co-Host label</Label>
                    <Input value={coHostLabel} onChange={(e) => setCoHostLabel(e.target.value)} className="bg-muted border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Trainer label</Label>
                    <Input value={trainerLabel} onChange={(e) => setTrainerLabel(e.target.value)} className="bg-muted border-border" />
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Leaderboard</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pick which leaderboards appear in the sidebar for everyone in this workspace. Uncheck all to hide the page entirely.
                </p>
                <div className="space-y-2">
                  {[
                    { key: "time_in_game",    label: "Time In-Game",    desc: "Total minutes tracked by the activity logger." },
                    { key: "sessions_hosted", label: "Sessions Hosted", desc: "Counts scheduled sessions hosted." },
                    { key: "messages_sent",   label: "Messages Sent",   desc: "In-game chat messages logged per session." },
                    { key: "quotas_met",      label: "Quotas Met",      desc: "How many active quotas each member is meeting." },
                  ].map((opt) => {
                    const checked = leaderboardCategories.includes(opt.key);
                    return (
                      <label key={opt.key} className="flex items-start gap-3 p-3 rounded-lg bg-muted cursor-pointer hover:bg-muted/70 transition-colors">
                        <Switch
                          checked={checked}
                          onCheckedChange={(v) => {
                            setLeaderboardCategories((prev) =>
                              v ? [...prev, opt.key] : prev.filter((k) => k !== opt.key)
                            );
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Quota Logging</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  How Fluxcore reports staff who don't meet their quota for the current period. Use the "Run quota check" button on the Quotas page to apply.
                </p>
                <RadioGroup value={quotaLogMode} onValueChange={(v) => setQuotaLogMode(v as any)} className="space-y-2">
                  <label className="flex gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40">
                    <RadioGroupItem value="warning" className="mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-foreground">Warning on profile</div>
                      <div className="text-xs text-muted-foreground">Adds a warning log to each member's profile.</div>
                    </div>
                  </label>
                  <label className="flex gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40">
                    <RadioGroupItem value="webhook" className="mt-0.5" />
                    <div className="w-full">
                      <div className="text-sm font-medium text-foreground">Post to Discord channel</div>
                      <div className="text-xs text-muted-foreground">Sends a report listing missed quotas to a webhook.</div>
                      {quotaLogMode === "webhook" && (
                        <div className="pt-2 space-y-1">
                          <Label className="text-xs">Webhook URL</Label>
                          <Input value={quotaLogWebhook} onChange={(e) => setQuotaLogWebhook(e.target.value)}
                            placeholder="https://discord.com/api/webhooks/..."
                            className="bg-muted border-border font-mono text-xs h-8" />
                        </div>
                      )}
                    </div>
                  </label>
                  <label className="flex gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40">
                    <RadioGroupItem value="none" className="mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-foreground">Don't log</div>
                      <div className="text-xs text-muted-foreground">Track quotas without automatic action.</div>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link to="../quotas" relative="path" className="glass rounded-xl p-4 flex items-center justify-between hover:bg-muted/40 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Manage Quotas</p>
                      <p className="text-xs text-muted-foreground">Create and edit quota rules</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                </Link>
                <Link to="../roles" relative="path" className="glass rounded-xl p-4 flex items-center justify-between hover:bg-muted/40 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Manage Roles</p>
                      <p className="text-xs text-muted-foreground">Custom roles and permissions</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                </Link>
              </div>
            </>
          )}

          <div className="sticky bottom-4 flex justify-end">
            <Button variant="hero" size="sm" onClick={saveSettings} disabled={saving} className="shadow-lg">
              {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
              Save All Changes
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
