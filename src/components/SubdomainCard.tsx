import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Globe, Loader2, ExternalLink, Sparkles, AlertCircle } from "lucide-react";

interface Props {
  workspaceId: string;
  workspaceName: string;
}

const RESERVED = new Set([
  "www", "api", "admin", "staff", "support", "app", "dashboard", "login",
  "auth", "mail", "blog", "docs", "help", "shop", "store", "preview",
  "almore", "bargains", "shoply", "downtown", "bloxy-bargains", "fluxcore",
]);

// Substring-matched profanity / slurs blocklist. Lowercased, with leet variants.
// We match as a substring so things like "nigga-rp" or "f4ggot" still get blocked.
const PROFANITY = [
  "nigg", "n1gg", "nig9", "n1g9", "nigr", "nlgg",
  "fag", "f4g", "fagg",
  "retard", "ret4rd", "r3tard",
  "kike", "k1ke",
  "chink", "ch1nk",
  "spic",
  "tranny", "tr4nny",
  "rape", "r4pe", "rapist",
  "pedo", "p3do", "pedofile", "pedophile",
  "cp", "cheese-pizza",
  "kys", "killyourself", "killurself",
  "cunt", "c0nt", "cvnt",
  "whore", "wh0re",
  "slut", "sl0t", "slvt",
  "porn", "p0rn", "pron",
  "sex", "s3x",
  "nazi", "n4zi", "hitler", "h1tler",
  "isis",
  "fuck", "fck", "f0ck", "fuk", "phuck",
  "shit", "sh1t", "sh!t",
  "bitch", "b1tch", "b!tch",
  "asshole", "a55hole",
  "dick", "d1ck", "cock", "c0ck",
  "pussy", "pu55y", "pvssy",
];

const containsProfanity = (s: string) => {
  // Normalize: lowercase, strip dashes/numbers commonly used to bypass
  const lower = s.toLowerCase();
  const normalized = lower.replace(/-/g, "");
  return PROFANITY.some((w) => lower.includes(w) || normalized.includes(w));
};

interface Portal {
  id: string;
  subdomain: string;
  status: string;
  last_active_at: string;
  auto_created: boolean;
}

export default function SubdomainCard({ workspaceId, workspaceName }: Props) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [graceUntil, setGraceUntil] = useState<string | null>(null);
  const [subInput, setSubInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: ws }, { data: p }] = await Promise.all([
      supabase.from("workspaces").select("subdomain_grace_until").eq("id", workspaceId).maybeSingle(),
      supabase.from("partner_portals").select("id,subdomain,status,last_active_at,auto_created").eq("workspace_id", workspaceId).maybeSingle(),
    ]);
    setGraceUntil((ws as any)?.subdomain_grace_until || null);
    setPortal((p as any) || null);
    if (p) setSubInput((p as any).subdomain);
    setLoading(false);
  };

  useEffect(() => { load(); }, [workspaceId]);

  const daysLeft = graceUntil
    ? Math.max(0, Math.ceil((new Date(graceUntil).getTime() - Date.now()) / 86_400_000))
    : null;

  const claim = async () => {
    const sub = subInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (sub.length < 3 || sub.length > 40) {
      toast.error("Subdomain must be 3-40 chars (a-z, 0-9, -)");
      return;
    }
    if (sub.startsWith("-") || sub.endsWith("-")) {
      toast.error("Subdomain cannot start or end with a dash");
      return;
    }
    if (RESERVED.has(sub)) {
      toast.error("That subdomain is reserved");
      return;
    }
    if (containsProfanity(sub)) {
      toast.error("That subdomain isn't allowed. Pick something else.");
      return;
    }

    setSaving(true);

    // Check availability
    const { data: existing } = await supabase.from("partner_portals").select("id,workspace_id").eq("subdomain", sub).maybeSingle();
    if (existing && (existing as any).workspace_id !== workspaceId) {
      setSaving(false);
      toast.error(`${sub}.fluxcore.works is already taken`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    let portalErr;
    if (portal) {
      // Remove old subdomain from Vercel first
      if (portal.subdomain !== sub) {
        await supabase.functions.invoke("vercel-domain", { body: { action: "remove", subdomain: portal.subdomain } });
      }
      const { error } = await supabase.from("partner_portals").update({
        subdomain: sub,
        status: "active",
        closed_reason: null,
      }).eq("id", portal.id);
      portalErr = error;
    } else {
      const { error } = await supabase.from("partner_portals").insert({
        workspace_id: workspaceId,
        subdomain: sub,
        name: workspaceName,
        auto_created: true,
        use_hyra_ui: false,
        status: "active",
        created_by: user.id,
        links: [],
      });
      portalErr = error;
    }
    if (portalErr) { setSaving(false); toast.error(portalErr.message); return; }

    // Attach on Vercel
    const { data: vData, error: vErr } = await supabase.functions.invoke("vercel-domain", {
      body: { action: "add", subdomain: sub },
    });
    setSaving(false);
    if (vErr || (vData as any)?.error) {
      toast.warning(`Saved, but Vercel attach pending. ${sub}.fluxcore.works should resolve within a few minutes.`);
    } else {
      toast.success(`${sub}.fluxcore.works is yours!`);
    }
    await load();
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-primary" /> <span className="text-sm text-muted-foreground">Loading subdomain…</span>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Your Subdomain</h2>
        </div>
        {portal && (
          portal.status === "dormant" ? <Badge variant="outline">Dormant</Badge>
          : portal.status === "closed" ? <Badge variant="destructive">Closed by staff</Badge>
          : <Badge>Active</Badge>
        )}
      </div>

      {!portal && daysLeft !== null && (
        <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${daysLeft <= 3 ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/5 text-foreground/80"}`}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">
              {daysLeft > 0
                ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left to claim a subdomain`
                : "Grace period ended — claim a subdomain to keep your workspace accessible"}
            </div>
            <p className="opacity-80 mt-0.5">
              We're moving away from <code>/w/&lt;id&gt;</code> URLs. After your grace period, your workspace will only be reachable at <code>yoursub.fluxcore.works</code>.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs">Subdomain</Label>
        <div className="flex gap-2 items-center">
          <Input
            value={subInput}
            onChange={(e) => setSubInput(e.target.value)}
            placeholder="mywork"
            className="bg-muted border-border lowercase"
            maxLength={40}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">.fluxcore.works</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Lowercase letters, numbers, dashes. Branding (logo, colours, Hyra UI) is request-only — open a support ticket.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button onClick={claim} disabled={saving || !subInput.trim() || subInput === portal?.subdomain}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          {portal ? "Update subdomain" : "Claim subdomain"}
        </Button>
        {portal && (
          <a
            href={`https://${portal.subdomain}.fluxcore.works`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open {portal.subdomain}.fluxcore.works <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {portal?.status === "dormant" && (
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Will auto-wake on next visit
          </span>
        )}
      </div>
    </div>
  );
}
