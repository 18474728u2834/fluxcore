import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, ArrowUp, ArrowDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useNexusConfig, NEXUS_CARDS, NEXUS_NAV_KEYS, type NexusConfig,
} from "@/hooks/useNexusConfig";

const NAV_LABELS: Record<string, string> = {
  dashboard: "Dashboard", activity: "Activity", documents: "Documents", loa: "LOA",
  members: "Members", sessions: "Sessions", quotas: "Quotas", wall: "Wall",
  kudos: "Kudos", promotions: "Promotion hints", applications: "Applications",
  roles: "Roles", staff: "Blacklist",
};

export function NexusDesigner() {
  const { workspaceId, isOwner } = useWorkspace();
  const { config, loading, save } = useNexusConfig(workspaceId);
  const [draft, setDraft] = useState<NexusConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(config); }, [config]);

  if (!isOwner) {
    return (
      <div className="glass rounded-xl border border-border/50 p-6 text-sm text-muted-foreground">
        Only the workspace owner can choose and design the Nexus UI version. The owner's choice applies to everyone.
      </div>
    );
  }

  const set = (patch: Partial<NexusConfig>) => setDraft(d => ({ ...d, ...patch }));

  const toggleNav = (key: string) => {
    const hidden = draft.hiddenNav.includes(key)
      ? draft.hiddenNav.filter(k => k !== key)
      : [...draft.hiddenNav, key];
    set({ hiddenNav: hidden });
  };

  const toggleCard = (id: string) => {
    const cards = draft.cards.includes(id)
      ? draft.cards.filter(c => c !== id)
      : [...draft.cards, id];
    set({ cards });
  };

  const move = (id: string, dir: -1 | 1) => {
    const cards = [...draft.cards];
    const i = cards.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cards.length) return;
    [cards[i], cards[j]] = [cards[j], cards[i]];
    set({ cards });
  };

  const onSave = async () => {
    setSaving(true);
    const { error } = await save(draft);
    setSaving(false);
    if (error) toast.error("Failed to save the Nexus UI layout");
    else toast.success("Nexus UI layout saved for the whole workspace");
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl border border-border/50 p-6">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Nexus UI version
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your choice is locked in for every member of this workspace.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {([
            { v: "v1" as const, title: "Nexus UI 1.0", desc: "The standard layout with every page and section, exactly as it is today." },
            { v: "v2" as const, title: "Nexus UI 2.0", desc: "Same layout, but you decide which pages appear and which cards fill the dashboard." },
          ]).map(o => (
            <button
              key={o.v}
              onClick={() => set({ version: o.v })}
              className={`text-left rounded-lg border p-4 transition-colors ${
                draft.version === o.v ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/40"
              }`}
            >
              <div className="text-sm font-semibold text-foreground">{o.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{o.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl border border-border/50 p-6 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sidebar rail</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Applies to both versions on desktop.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { v: "hover" as const, title: "Expand on hover", desc: "Icons only until you hover the rail, then it slides open with page names." },
            { v: "icons" as const, title: "Icons only", desc: "Keep the compact rail exactly as it is today." },
          ]).map(o => (
            <button
              key={o.v}
              onClick={() => set({ railMode: o.v })}
              className={`text-left rounded-lg border p-4 transition-colors ${
                draft.railMode === o.v ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/40"
              }`}
            >
              <div className="text-sm font-semibold text-foreground">{o.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{o.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl border border-border/50 p-6 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" /> Fluxcore For Aviation
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rewrites the wording across the workspace for airlines — Sessions become Flights,
            Shifts become Departures, Hosts become Captains, and quotas read like "Attend 1 flight".
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { v: "general" as const, title: "Standard wording", desc: "Sessions, shifts, hosts and members — the default Fluxcore vocabulary." },
            { v: "aviation" as const, title: "Aviation wording", desc: "Flights, departures, captains and crew across every page and card." },
          ]).map(o => (
            <button
              key={o.v}
              onClick={() => set({ industry: o.v })}
              className={`text-left rounded-lg border p-4 transition-colors ${
                draft.industry === o.v ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/40"
              }`}
            >
              <div className="text-sm font-semibold text-foreground">{o.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{o.desc}</div>
            </button>
          ))}
        </div>
      </div>




      {draft.version === "v2" && (
        <>
          <div className="glass rounded-xl border border-border/50 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pages</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Turn off pages you don't want in the sidebar or search.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NEXUS_NAV_KEYS.filter(k => k !== "dashboard").map(key => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <Label className="text-sm text-foreground">{NAV_LABELS[key] || key}</Label>
                  <Switch
                    checked={!draft.hiddenNav.includes(key)}
                    onCheckedChange={() => toggleNav(key)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl border border-border/50 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Dashboard hero</h3>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
              <Label className="text-sm text-foreground">Show the hero banner</Label>
              <Switch checked={draft.showHero} onCheckedChange={(v) => set({ showHero: v })} />
            </div>
            {draft.showHero && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Custom headline (optional)</Label>
                <Input
                  value={draft.heroTitle}
                  onChange={(e) => set({ heroTitle: e.target.value })}
                  placeholder="Leave empty for the rotating friendly greeting"
                />
              </div>
            )}
          </div>

          <div className="glass rounded-xl border border-border/50 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Dashboard cards</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pick the cards and their order.</p>
            </div>

            <div className="space-y-2">
              {draft.cards.map((id, idx) => {
                const meta = NEXUS_CARDS.find(c => c.id === id);
                if (!meta) return null;
                return (
                  <div key={id} className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground">{meta.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{meta.desc}</div>
                    </div>
                    <Button variant="ghost" size="icon" disabled={idx === 0} onClick={() => move(id, -1)} aria-label="Move up">
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={idx === draft.cards.length - 1} onClick={() => move(id, 1)} aria-label="Move down">
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Switch checked onCheckedChange={() => toggleCard(id)} />
                  </div>
                );
              })}
            </div>

            {NEXUS_CARDS.filter(c => !draft.cards.includes(c.id)).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Available cards</div>
                {NEXUS_CARDS.filter(c => !draft.cards.includes(c.id)).map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground">{c.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.desc}</div>
                    </div>
                    <Switch checked={false} onCheckedChange={() => toggleCard(c.id)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Button onClick={onSave} disabled={saving || loading} className="gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Nexus UI layout
      </Button>
    </div>
  );
}
