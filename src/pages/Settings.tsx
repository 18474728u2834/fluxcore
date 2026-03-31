import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, Key, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SettingsPage() {
  const { workspace, isOwner, workspaceId } = useWorkspace();
  const [apiKey, setApiKey] = useState(workspace?.api_key || "");
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [name, setName] = useState(workspace?.name || "");
  const [groupId, setGroupId] = useState(workspace?.roblox_group_id || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace) {
      setApiKey(workspace.api_key);
      setName(workspace.name);
      setGroupId(workspace.roblox_group_id || "");
    }
  }, [workspace]);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetKey = async () => {
    setResetting(true);
    // Generate a new random key
    const newKey = "flx_" + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase
      .from("workspaces")
      .update({ api_key: newKey })
      .eq("id", workspaceId);
    if (error) {
      toast.error("Failed to reset API key");
    } else {
      setApiKey(newKey);
      toast.success("API key reset! Update it in your Roblox script.");
    }
    setResetting(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ name: name.trim(), roblox_group_id: groupId.trim() || null })
      .eq("id", workspaceId);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Settings saved!");
    }
    setSaving(false);
  };

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Workspace configuration — owner only</p>
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">API Key</h2>
          </div>
          <p className="text-xs text-muted-foreground">Used by the Lua tracker module to authenticate with Fluxcore.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-xs font-mono text-foreground break-all select-all">
              {apiKey}
            </code>
            <Button variant="secondary" size="sm" onClick={copyKey}>
              <Copy className="w-3 h-3 mr-1" /> {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="secondary" size="sm" onClick={resetKey} disabled={resetting}>
              {resetting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Reset
            </Button>
          </div>
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
          <Button variant="hero" size="sm" onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
