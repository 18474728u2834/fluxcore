import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, ArrowRight, Loader2, LogOut, Info, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  role: string;
}

export default function Workspaces() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading, robloxUsername } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchWorkspaces();
  }, [user, authLoading]);

  const fetchWorkspaces = async () => {
    if (!user) return;
    setLoading(true);

    // Only fetch workspaces user owns
    const { data: ownedWorkspaces } = await supabase
      .from("workspaces")
      .select("id, name, owner_id")
      .eq("owner_id", user.id);

    // Fetch workspaces user is a member of
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id);

    const ws: Workspace[] = [];

    // Add owned workspaces
    if (ownedWorkspaces) {
      for (const w of ownedWorkspaces) {
        ws.push({ id: w.id, name: w.name, role: "Owner" });
      }
    }

    // Add member workspaces (that aren't already owned)
    if (memberships) {
      const ownedIds = new Set(ws.map(w => w.id));
      for (const m of memberships) {
        if (!ownedIds.has(m.workspace_id)) {
          // Fetch workspace name
          const { data: wsData } = await supabase
            .from("workspaces")
            .select("id, name")
            .eq("id", m.workspace_id)
            .single();
          if (wsData) {
            ws.push({ id: wsData.id, name: wsData.name, role: m.role });
          }
        }
      }
    }

    setWorkspaces(ws);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name: newName.trim(), owner_id: user.id, roblox_group_id: groupId.trim() || null })
      .select("id, invite_code")
      .single();

    if (error) {
      toast.error("Failed to create workspace: " + error.message);
      setCreating(false);
      return;
    }

    toast.success("Workspace created!");
    setCreatedWorkspaceId(data.id);
    setCreatedInviteCode(data.invite_code);
    setOnboardingStep(1);
    setCreating(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const finishOnboarding = () => {
    setDialogOpen(false);
    setOnboardingStep(0);
    setNewName("");
    setGroupId("");
    if (createdWorkspaceId) {
      navigate(`/w/${createdWorkspaceId}/dashboard`);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid opacity-[0.04]" />

      <nav className="relative border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-lg font-extrabold text-gradient tracking-tight">Fluxcore</button>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {robloxUsername && (
              <span className="text-sm text-muted-foreground hidden sm:block">{robloxUsername}</span>
            )}
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Premium Banner */}
      <div className="relative border-b border-warning/20 bg-warning/5">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
          <Info className="w-4 h-4 text-warning shrink-0" />
          <p className="text-xs text-warning">
            <strong></strong>, Fluxcore is currently experiencing an issue with Roblox OAuth. Use emoji-based verification for logins while we investigate the problem. Our team is working to resolve this as quickly as possible. Thank you for your patience and understanding.
          </p>
        </div>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-1">Workspaces</h1>
          <p className="text-muted-foreground text-sm">Select a workspace or create a new one</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => navigate(`/w/${ws.id}/dashboard`)}
                className="glass-hover rounded-xl p-5 text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-0.5">{ws.name}</h3>
                <span className="text-xs text-muted-foreground">{ws.role}</span>
              </button>
            ))}

            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) { setOnboardingStep(0); setNewName(""); setGroupId(""); }
            }}>
              <DialogTrigger asChild>
                <button className="glass-hover rounded-xl p-5 text-left group border-dashed border-2 border-border/50 hover:border-primary/30 flex flex-col items-center justify-center gap-2 min-h-[140px]">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground text-sm">Create Workspace</p>
                  <p className="text-xs text-muted-foreground">Free during beta</p>
                </button>
              </DialogTrigger>
              <DialogContent className="glass border-border/40">
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    {onboardingStep === 0 ? "Create Workspace" : onboardingStep === 1 ? "Setup Tracking" : "Invite Your Team"}
                  </DialogTitle>
                </DialogHeader>

                {onboardingStep === 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm">Workspace Name</Label>
                      <Input placeholder="e.g. Pastriez Bakery" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-muted border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm">Roblox Group ID <span className="text-muted-foreground">(optional)</span></Label>
                      <Input placeholder="e.g. 12345678" value={groupId} onChange={(e) => setGroupId(e.target.value)} className="bg-muted border-border" />
                    </div>
                    <Button onClick={handleCreate} disabled={creating || !newName.trim()} variant="hero" className="w-full">
                      {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create
                    </Button>
                  </div>
                )}

                {onboardingStep === 1 && (
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">To track activity in your Roblox game, add the Fluxcore tracker script to your game's ServerScriptService.</p>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1 font-mono">Go to Setup Tracking in your workspace for the full script.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setOnboardingStep(2)}>Skip for now</Button>
                      <Button variant="hero" className="flex-1" onClick={() => setOnboardingStep(2)}>
                        Next <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {onboardingStep === 2 && (
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">Share this invite link with your staff to let them join your workspace:</p>
                    <div className="bg-muted rounded-lg p-3">
                      <code className="text-xs font-mono text-foreground break-all select-all">
                        {`${window.location.origin}${window.location.pathname}#/join/${createdInviteCode}`}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground">You can always find this link in Settings.</p>
                    <Button variant="hero" className="w-full" onClick={finishOnboarding}>
                      Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}

        {!loading && workspaces.length === 0 && (
          <div className="glass rounded-xl p-8 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No workspaces yet</h3>
            <p className="text-sm text-muted-foreground">Create your first workspace to get started, or ask a workspace owner to invite you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
