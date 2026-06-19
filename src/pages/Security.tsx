import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, KeyRound, ShieldCheck, Database, Eye, FileCheck2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function Security() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Security & Privacy · Fluxcore";
    const desc = "How Fluxcore protects your workspace data: TLS in transit, encryption at rest, RLS-isolated tables, and column-level encryption for sensitive credentials.";
    let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!tag) { tag = document.createElement("meta"); tag.name = "description"; document.head.appendChild(tag); }
    tag.content = desc;
  }, []);

  const items = [
    {
      icon: Lock,
      title: "Encrypted in transit",
      body: "All requests between your browser, the Roblox game server, and Fluxcore travel over HTTPS/TLS 1.2+. The activity-tracker Lua client and Open Cloud calls use the same encrypted channels.",
    },
    {
      icon: Database,
      title: "Encrypted at rest",
      body: "Our managed Postgres database encrypts every disk page and every automated backup. Object storage for uploaded images is encrypted the same way.",
    },
    {
      icon: KeyRound,
      title: "Column-level encryption for secrets",
      body: "Sensitive credentials — your Fluxcore API key, Roblox Open Cloud key, and Discord webhook URLs — get a second layer of pgcrypto encryption on top of disk encryption. The symmetric key lives in a locked-down schema that no application role can read; only audited security-definer functions can decrypt, and only for the workspace owner.",
    },
    {
      icon: ShieldCheck,
      title: "Row-Level Security on every table",
      body: "Every table in the database is gated by Postgres RLS policies. A workspace owner can never see another workspace's members, sessions, logs, kudos, or quotas — the database itself enforces it, not just the app.",
    },
    {
      icon: Eye,
      title: "Roblox OAuth — no passwords",
      body: "You sign in with Roblox via OAuth 2.0 + PKCE. Fluxcore never sees or stores your Roblox password, and only receives the scopes you approve.",
    },
    {
      icon: Server,
      title: "Where your data goes",
      body: "Your data is processed by Fluxcore and these third parties only when needed for a feature you enabled: Roblox (auth, group ranking, avatars), Discord (webhooks you configured), and our hosting/database providers. We don't sell data and we don't ship it to ad networks.",
    },
    {
      icon: FileCheck2,
      title: "Your data, your control",
      body: "Workspace owners can export workspace data and request deletion at any time from the Staff Dashboard or by contacting support. We honour GDPR and CCPA-style requests.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/40 bg-card/40 text-[12px] text-muted-foreground mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Security & Privacy
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">How Fluxcore protects your data.</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            This page is maintained by the Fluxcore team to summarise the security controls currently in place.
            It describes what we do today — not certifications, and not a legal commitment.
          </p>
        </div>

        <div className="space-y-4">
          {items.map((it, i) => (
            <div key={i} className="p-5 rounded-xl border border-border/40 bg-card/40">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <it.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold mb-1">{it.title}</h2>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">{it.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 rounded-xl border border-border/40 bg-card/40">
          <h2 className="text-[15px] font-semibold mb-1">Reporting a vulnerability</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            If you believe you've found a security issue, please reach out through the in-app{" "}
            <button onClick={() => navigate("/support")} className="text-primary hover:underline">Support</button>{" "}
            page rather than disclosing it publicly. We'll respond as quickly as we can.
          </p>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          See also our <button onClick={() => navigate("/privacy")} className="underline hover:text-foreground">Privacy Policy</button> and{" "}
          <button onClick={() => navigate("/terms")} className="underline hover:text-foreground">Terms</button>.
        </p>
      </div>
    </div>
  );
}
