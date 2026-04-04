import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, Key, Save, Loader2, Palette, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InviteSection } from "@/components/InviteSection";
import { MemberPermissions } from "@/components/MemberPermissions";

export default function SettingsPage() {
  const { workspace, isOwner, workspaceId } = useWorkspace();
  const [apiKey, setApiKey] = useState(workspace?.api_key || "");
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [name, setName] = useState(workspace?.name || "");
  const [groupId, setGroupId] = useState(workspace?.roblox_group_id || "");
  const [robloxApiKey, setRobloxApiKey] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [textColor, setTextColor] = useState("#ffffff");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace) {
      setApiKey(workspace.api_key);
      setName(workspace.name);
      setGroupId(workspace.roblox_group_id || "");
      // Fetch extended fields
      const fetchExtras = async () => {
        const { data } = await supabase.from("workspaces").select("primary_color, text_color, roblox_api_key").eq("id", workspaceId).single();
        if (data) {
          setPrimaryColor((data as any).primary_color || "#7c3aed");
          setTextColor((data as any).text_color || "#ffffff");
          setRobloxApiKey((data as any).roblox_api_key || "");
        }
      };
      fetchExtras();
    }
  }, [workspace]);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetKey = async () => {
    setResetting(true);
    const newKey = "flx_" + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("workspaces").update({ api_key: newKey }).eq("id", workspaceId);
    if (error) toast.error("Failed to reset API key");
    else { setApiKey(newKey); toast.success("API key reset! Update it in your Roblox script."); }
    setResetting(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from("workspaces").update({
      name: name.trim(),
      roblox_group_id: groupId.trim() || null,
      roblox_api_key: robloxApiKey.trim() || null,
      primary_color: primaryColor,
      text_color: textColor,
    } as any).eq("id", workspaceId);
    if (error) toast.error("Failed to save: " + error.message);
    else toast.success("Settings saved!");
    setSaving(false);
  };

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Workspace configuration — owner only</p>
        </div>

        <InviteSection />

        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Fluxcore API Key</h2>
          </div>
          <p className="text-xs text-muted-foreground">Used by the Lua tracker module to authenticate with Fluxcore.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-xs font-mono text-foreground break-all select-all">{apiKey}</code>
            <Button variant="secondary" size="sm" onClick={copyKey}>
              <Copy className="w-3 h-3 mr-1" /> {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="secondary" size="sm" onClick={resetKey} disabled={resetting}>
              {resetting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Reset
            </Button>
          </div>
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Roblox Open Cloud API Key</h2>
          </div>
          <p className="text-xs text-muted-foreground">Required for promotions/demotions. Get it from <a href="https://create.roblox.com/credentials" target="_blank" rel="noreferrer" className="text-primary hover:underline">Roblox Creator Hub</a>.</p>
          <Input
            type="password"
            placeholder="Enter your Roblox Open Cloud API key"
            value={robloxApiKey}
            onChange={(e) => setRobloxApiKey(e.target.value)}
            className="bg-muted border-border font-mono text-xs"
          />
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-sm">Workspace Settings</h2>
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
            <h2 className="font-semibold text-foreground text-sm">Customization</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primaryColor, color: textColor }}>Aa</div>
            <span className="text-xs text-muted-foreground">Preview of your brand colors</span>
          </div>
        </div>

        <Button variant="hero" size="sm" onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
          Save All Changes
        </Button>

        <MemberPermissions />
      </div>
    </DashboardLayout>
  );
}
