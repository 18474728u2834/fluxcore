import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ArrowRight, Loader2, LogOut, Sun, Moon, Headphones, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  role: string;
  roblox_group_id: string | null;
  verified_official: boolean;
}

export default function Workspaces() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading, robloxUsername } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [groupIcons, setGroupIcons] = useState<Record<string, string>>({});
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
    const ws: Workspace[] = [];

    try {
      // Single RPC call — much faster and avoids N+1 .single() failures
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_accessible_workspaces");

      if (rpcErr) {
        console.error("get_accessible_workspaces failed, falling back:", rpcErr);
        // Fallback to direct queries
        const { data: owned } = await supabase
          .from("workspaces")
          .select("id, name, roblox_group_id, verified_official")
          .eq("owner_id", user.id);
        if (owned) {
          for (const w of owned) {
            ws.push({ id: w.id, name: w.name, role: "Owner", roblox_group_id: w.roblox_group_id, verified_official: !!w.verified_official });
          }
        }
        const { data: memberships } = await supabase
          .from("workspace_members")
          .select("workspace_id, role, workspaces(id, name, roblox_group_id, verified_official)")
          .eq("user_id", user.id);
        if (memberships) {
          const ownedIds = new Set(ws.map(w => w.id));
          for (const m of memberships as any[]) {
            const w = m.workspaces;
            if (w && !ownedIds.has(w.id)) {
              ws.push({ id: w.id, name: w.name, role: m.role, roblox_group_id: w.roblox_group_id, verified_official: !!w.verified_official });
            }
          }
        }
      } else if (rpcData) {
        for (const w of rpcData as any[]) {
          ws.push({
            id: w.id,
            name: w.name,
            role: w.role,
            roblox_group_id: w.roblox_group_id,
            verified_official: !!w.verified_official,
          });
        }
      }

      setWorkspaces(ws);
    } catch (e) {
      console.error("Failed to load workspaces:", e);
      toast.error("Couldn't load workspaces. Please refresh.");
    } finally {
      setLoading(false);
    }

    // Fetch group icons separately (non-blocking, never affects loading state)
    const groupIds = ws.filter(w => w.roblox_group_id).map(w => w.roblox_group_id);
    if (groupIds.length > 0) {
      try {
        const uniqueIds = [...new Set(groupIds)].join(",");
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(`${supabaseUrl}/functions/v1/roblox-group-icon?groupIds=${uniqueIds}`, {
          headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (res.ok) {
          const data = await res.json();
          const icons: Record<string, string> = {};
          if (data.data) {
            for (const item of data.data) {
              if (item.imageUrl) {
                const matchingWs = ws.find(w => w.roblox_group_id === String(item.targetId));
                if (matchingWs) icons[matchingWs.id] = item.imageUrl;
              }
            }
          }
          setGroupIcons(icons);
        }
      } catch (e) {
        console.error("Failed to fetch group icons:", e);
      }
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !groupId.trim() || !user) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name: newName.trim(), owner_id: user.id, roblox_group_id: groupId.trim() })
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

  const getRoleColor = (role: string) => {
    if (role === "Owner") return "text-primary font-semibold";
    if (role === "Admin") return "text-orange-400";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-xl font-black tracking-tight">
            <span className="text-primary">flux</span>core
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/support")} className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all" title="Support">
              <Headphones className="w-4 h-4" />
            </button>
            <button onClick={toggleTheme} className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {robloxUsername && (
              <span className="text-sm text-muted-foreground hidden sm:block ml-2">{robloxUsername}</span>
            )}
            <button onClick={handleLogout} className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-foreground mb-1">Workspaces</h1>
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
                className="group rounded-xl border border-border/20 bg-card/30 hover:bg-card/60 hover:border-border/40 p-5 text-left transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  {groupIcons[ws.id] ? (
                    <img src={groupIcons[ws.id]} alt={ws.name} className="w-12 h-12 rounded-xl object-cover" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-black text-primary">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="font-bold text-foreground mb-0.5 flex items-center gap-1.5">
                  <span className="truncate">{ws.name}</span>
                  {ws.verified_official && <BadgeCheck className="w-4 h-4 text-primary shrink-0" aria-label="Official verified group" />}
                </h3>
                <span className={`text-xs ${getRoleColor(ws.role)}`}>{ws.role}</span>
              </button>
            ))}

            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) { setOnboardingStep(0); setNewName(""); setGroupId(""); }
            }}>
              <DialogTrigger asChild>
                <button className="group rounded-xl border-2 border-dashed border-border/30 hover:border-primary/30 p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-foreground text-sm">Create Workspace</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Free forever</p>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="border-border/30 bg-card">
                <DialogHeader>
                  <DialogTitle className="text-foreground font-bold">
                    {onboardingStep === 0 ? "Create Workspace" : onboardingStep === 1 ? "Setup Tracking" : "Invite Your Team"}
                  </DialogTitle>
                </DialogHeader>

                {onboardingStep === 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm font-medium">Workspace Name</Label>
                      <Input placeholder="e.g. Pastriez Bakery" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-muted border-border h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm font-medium">Roblox Group ID <span className="text-destructive">*</span></Label>
                      <Input placeholder="e.g. 12345678" value={groupId} onChange={(e) => setGroupId(e.target.value)} className="bg-muted border-border h-11" />
                      <p className="text-xs text-muted-foreground">Required. Find it in your Roblox group URL.</p>
                    </div>
                    <Button onClick={handleCreate} disabled={creating || !newName.trim() || !groupId.trim()} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                      {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Workspace
                    </Button>
                  </div>
                )}

                {onboardingStep === 1 && (
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">To track activity in your game, add the Fluxcore tracker script to ServerScriptService.</p>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground font-mono">Go to Setup Tracking in your workspace for the full script.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 h-10" onClick={() => setOnboardingStep(2)}>Skip</Button>
                      <Button className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={() => setOnboardingStep(2)}>
                        Next <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {onboardingStep === 2 && (
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">Share this invite link with your staff:</p>
                    <div className="bg-muted rounded-lg p-3">
                      <code className="text-xs font-mono text-foreground break-all select-all">
                        {`${window.location.origin}${window.location.pathname}#/join/${createdInviteCode}`}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground">You can always find this in Settings.</p>
                    <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={finishOnboarding}>
                      Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}

        {!loading && workspaces.length === 0 && (
          <div className="rounded-xl border border-border/20 bg-card/30 p-10 text-center">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-1">No workspaces yet</h3>
            <p className="text-sm text-muted-foreground">Create your first workspace to get started, or ask a workspace owner to invite you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
