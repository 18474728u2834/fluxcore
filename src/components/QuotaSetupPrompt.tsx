import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Target, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function QuotaSetupPrompt() {
  const { workspaceId, isOwner } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"none" | "webhook" | "warning">("warning");
  const [webhook, setWebhook] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOwner || !workspaceId) return;
    (async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("quota_log_configured, quota_log_mode, quota_log_webhook_url")
        .eq("id", workspaceId)
        .single();
      const d = data as any;
      if (d && !d.quota_log_configured) {
        setMode((d.quota_log_mode as any) || "warning");
        setWebhook(d.quota_log_webhook_url || "");
        setOpen(true);
      }
    })();
  }, [workspaceId, isOwner]);

  const save = async () => {
    if (mode === "webhook" && !webhook.trim().startsWith("https://discord.com/api/webhooks/")) {
      toast.error("Enter a valid Discord webhook URL");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({
        quota_log_mode: mode,
        quota_log_webhook_url: mode === "webhook" ? webhook.trim() : null,
        quota_log_configured: true,
      } as any)
      .eq("id", workspaceId);
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }
    toast.success("Quota logging configured");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) setOpen(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Quota Logging
          </DialogTitle>
          <DialogDescription>
            Choose how Fluxcore should record staff who don't meet their quota each period. You can change this any time in Settings.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="space-y-3 py-2">
          <label className="flex gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value="warning" id="q-warn" className="mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground">Warning on profile</div>
              <div className="text-xs text-muted-foreground">Adds a warning log to each member's profile when they miss their quota.</div>
            </div>
          </label>
          <label className="flex gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value="webhook" id="q-hook" className="mt-0.5" />
            <div className="space-y-0.5 w-full">
              <div className="text-sm font-medium text-foreground">Post to Discord channel</div>
              <div className="text-xs text-muted-foreground">Sends a report listing missed quotas to a Discord webhook.</div>
              {mode === "webhook" && (
                <div className="pt-2 space-y-1">
                  <Label className="text-xs">Discord Webhook URL</Label>
                  <Input
                    value={webhook}
                    onChange={(e) => setWebhook(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="bg-muted border-border font-mono text-xs h-8"
                  />
                </div>
              )}
            </div>
          </label>
          <label className="flex gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value="none" id="q-none" className="mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground">Don't log</div>
              <div className="text-xs text-muted-foreground">Track quotas without taking any automatic action.</div>
            </div>
          </label>
        </RadioGroup>

        <DialogFooter>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
