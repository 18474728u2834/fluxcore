import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Loader2, ExternalLink, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const INVITE_URL =
  "https://discord.com/oauth2/authorize?client_id=1521224984259854489&permissions=8&integration_type=0&scope=bot+applications.commands";

const INTERACTIONS_ENDPOINT = `${
  (import.meta as any).env?.VITE_SUPABASE_URL || ""
}/functions/v1/discord-bot`;

export function DiscordBotCard({ workspaceId, isOwner }: { workspaceId: string; isOwner: boolean }) {
  const [guildId, setGuildId] = useState("");
  const [linked, setLinked] = useState<{ id: string; guild_id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<"checking" | "online" | "offline">("checking");
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("workspace_discord_guilds" as any)
      .select("id, guild_id").eq("workspace_id", workspaceId).maybeSingle();
    setLinked((data as any) || null);
  };
  useEffect(() => { load(); }, [workspaceId]);

  // Ping the interactions endpoint to confirm the bot handler is live.
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      if (!INTERACTIONS_ENDPOINT.startsWith("http")) { setOnline("offline"); return; }
      try {
        const res = await fetch(INTERACTIONS_ENDPOINT, { method: "GET" });
        if (!cancelled) setOnline(res.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setOnline("offline");
      }
    };
    ping();
    const id = setInterval(ping, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const copyEndpoint = async () => {
    await navigator.clipboard.writeText(INTERACTIONS_ENDPOINT);
    setCopied(true);
    toast.success("Interactions endpoint copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const save = async () => {
    if (!guildId.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("workspace_discord_guilds" as any)
      .insert({ workspace_id: workspaceId, guild_id: guildId.trim() });
    if (error) toast.error(error.message); else { toast.success("Linked"); setGuildId(""); load(); }
    setBusy(false);
  };

  const unlink = async () => {
    if (!linked) return;
    if (!confirm("Unlink this Discord server?")) return;
    await supabase.from("workspace_discord_guilds" as any).delete().eq("id", linked.id);
    load();
  };

  const statusColor =
    online === "online" ? "bg-emerald-500" : online === "offline" ? "bg-rose-500" : "bg-amber-400";
  const statusLabel =
    online === "online" ? "Online" : online === "offline" ? "Offline" : "Checking…";

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Discord Bot</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`inline-block w-2 h-2 rounded-full ${statusColor} ${online === "online" ? "shadow-[0_0_8px_rgba(16,185,129,0.8)]" : ""} ${online === "checking" ? "animate-pulse" : ""}`} />
          <span className="text-foreground">{statusLabel}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Run Fluxcore actions from Discord with <code className="text-foreground">/verify</code>, <code className="text-foreground">/promote</code>, <code className="text-foreground">/demote</code>, <code className="text-foreground">/warn</code>, <code className="text-foreground">/lookup</code>, <code className="text-foreground">/loa</code>, <code className="text-foreground">/quota</code>. Commands are rank-locked: each Discord user must run <code className="text-foreground">/verify</code> first and link their Fluxcore account.
      </p>

      <div className="flex flex-wrap gap-2">
        <a href={INVITE_URL} target="_blank" rel="noreferrer">
          <Button variant="secondary" size="sm"><ExternalLink className="w-3 h-3 mr-1" /> Invite bot to Discord</Button>
        </a>
        {isOwner && (
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const t = toast.loading("Registering slash commands…");
              const { error } = await supabase.functions.invoke("discord-register-commands", { body: {} });
              toast.dismiss(t);
              if (error) toast.error("Failed: " + error.message);
              else toast.success("Slash commands registered with Discord");
            }}
          >
            Re-register slash commands
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Interactions Endpoint URL</Label>
        <div className="flex gap-2">
          <Input readOnly value={INTERACTIONS_ENDPOINT} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button variant="secondary" size="sm" onClick={copyEndpoint}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Paste this in the Discord Developer Portal → your application → <strong>General Information</strong> → <em>Interactions Endpoint URL</em>, then save. Discord will ping it to validate the signature.
        </p>
      </div>

      {linked ? (
        <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
          <div className="text-xs">
            <p className="text-muted-foreground">Linked Discord server</p>
            <p className="font-mono text-foreground">{linked.guild_id}</p>
          </div>
          {isOwner && (
            <Button variant="ghost" size="icon" onClick={unlink}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          )}
        </div>
      ) : isOwner ? (
        <div className="space-y-2">
          <Label className="text-xs">Discord Server ID</Label>
          <div className="flex gap-2">
            <Input placeholder="e.g. 1234567890123456789" value={guildId} onChange={e => setGuildId(e.target.value)} className="font-mono text-xs" />
            <Button onClick={save} disabled={busy} size="sm">{busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Link"}</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">In Discord: User Settings → Advanced → Developer Mode, then right-click your server icon → Copy Server ID.</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Ask the workspace owner to link a Discord server.</p>
      )}
    </div>
  );
}
