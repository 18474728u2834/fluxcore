import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, Key } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const [apiKey] = useState("flx_" + "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6");
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <Button variant="secondary" size="sm">
              <RefreshCw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-sm">Group Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Workspace Name</Label>
              <Input placeholder="Your workspace name" className="bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Roblox Group ID</Label>
              <Input placeholder="e.g. 12345678" className="bg-muted border-border" />
            </div>
          </div>
          <Button variant="hero" size="sm">Save Changes</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
