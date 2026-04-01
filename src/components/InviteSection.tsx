import { Copy, RefreshCw, Link, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

export function InviteSection() {
  const { workspace, workspaceId } = useWorkspace();
  const [inviteCode, setInviteCode] = useState(
    (workspace as any)?.invite_code || ""
  );
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  const inviteUrl = `${window.location.origin}${window.location.pathname}#/join/${inviteCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetCode = async () => {
    setResetting(true);
    const newCode = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    const { error } = await supabase
      .from("workspaces")
      .update({ invite_code: newCode } as any)
      .eq("id", workspaceId);
    if (error) {
      toast.error("Failed to reset invite link");
    } else {
      setInviteCode(newCode);
      toast.success("Invite link reset! Old links no longer work.");
    }
    setResetting(false);
  };

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground text-sm">Invite Link</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Share this link with members to let them join your workspace.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-xs font-mono text-foreground break-all select-all truncate">
          {inviteUrl}
        </code>
        <Button variant="secondary" size="sm" onClick={copyLink}>
          <Copy className="w-3 h-3 mr-1" /> {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="secondary" size="sm" onClick={resetCode} disabled={resetting}>
          {resetting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          Reset
        </Button>
      </div>
    </div>
  );
}
