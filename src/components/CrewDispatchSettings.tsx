import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Radio, Save, X } from "lucide-react";
import { useLexicon } from "@/hooks/useLexicon";

const FALLBACK_ROLES = ["Pilot", "First Officer", "Cabin Crew", "Ground Crew"];

export function CrewDispatchSettings() {
  const { workspaceId } = useWorkspace();
  const { crew } = useLexicon(workspaceId);
  const DEFAULT_ROLES = crew?.defaults ?? FALLBACK_ROLES;
  const [enabled, setEnabled] = useState(false);
  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    supabase.from("workspaces")
      .select("dispatch_enabled, dispatch_roles")
      .eq("id", workspaceId).maybeSingle()
      .then(({ data }) => {
        const d: any = data || {};
        setEnabled(!!d.dispatch_enabled);
        setRoles(Array.isArray(d.dispatch_roles) && d.dispatch_roles.length ? d.dispatch_roles : DEFAULT_ROLES);
        setLoading(false);
      });
  }, [workspaceId]);

  const addRole = () => {
    const v = draft.trim();
    if (!v) return;
    if (roles.some(r => r.toLowerCase() === v.toLowerCase())) { toast.error("That crew role already exists"); return; }
    setRoles([...roles, v]);
    setDraft("");
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("workspaces")
      .update({ dispatch_enabled: enabled, dispatch_roles: roles } as any)
      .eq("id", workspaceId);
    if (error) toast.error("Failed to save: " + error.message);
    else toast.success("Crew dispatch settings saved");
    setSaving(false);
  };

  // Crew dispatch is an aviation / maritime feature only.
  if (!crew) return null;

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 space-y-5">
      <div className="flex items-start gap-3">
        <Radio className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h3 className="font-semibold text-foreground">{crew.title}</h3>
          <p className="text-sm text-muted-foreground">
            Let staff with the <span className="text-foreground font-medium">{crew.permissionLabel}</span> permission assign crew
            positions on any scheduled session. Assigned members get a Discord DM from the Fluxcore bot if their account is linked.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
        <div>
          <Label className="text-sm">Enable crew dispatch</Label>
          <p className="text-xs text-muted-foreground">Shows a Dispatch action on every session card.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">{crew.positionsLabel}</Label>
        <div className="flex flex-wrap gap-2">
          {roles.map(r => (
            <span key={r} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-muted text-foreground">
              {r}
              <button onClick={() => setRoles(roles.filter(x => x !== r))} className="text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {roles.length === 0 && <span className="text-xs text-muted-foreground">No positions yet.</span>}
        </div>
        <div className="flex gap-2 pt-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }}
            placeholder={crew.placeholder}
          />
          <Button variant="secondary" onClick={addRole}><Plus className="w-4 h-4" /></Button>
        </div>
      </div>

      <Button variant="hero" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save crew dispatch
      </Button>
    </div>
  );
}

export default CrewDispatchSettings;
