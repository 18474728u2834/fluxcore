import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, ArrowRight, Loader2, LogOut, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchWorkspaces();
  }, [user, authLoading]);

  const fetchWorkspaces = async () => {
    if (!user) return;
    setLoading(true);

    const { data: owned } = await supabase
      .from("workspaces")
      .select("id, name");

    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id, role");

    const ws: Workspace[] = [];
    const seenIds = new Set<string>();

    if (owned) {
      for (const o of owned) {
        ws.push({ id: o.id, name: o.name, role: "Owner" });
        seenIds.add(o.id);
      }
    }

    if (memberships) {
      for (const m of memberships) {
        if (!seenIds.has(m.workspace_id)) {
          const { data: wsData } = await supabase
            .from("workspaces")
            .select("id, name")
            .eq("id", m.workspace_id)
            .single();
          if (wsData) {
            ws.push({ id: wsData.id, name: wsData.name, role: m.role });
            seenIds.add(wsData.id);
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

    const { error } = await supabase
      .from("workspaces")
      .insert({ name: newName.trim(), owner_id: user.id, roblox_group_id: groupId.trim() || null })
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to create workspace: " + error.message);
    } else {
      toast.success("Workspace created!");
      setDialogOpen(false);
      setNewName("");
      setGroupId("");
      fetchWorkspaces();
    }
    setCreating(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow" />

      <nav className="relative border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-extrabold text-gradient tracking-tight">Fluxcore</span>
          <div className="flex items-center gap-3">
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
            <strong>From 19.07.2026</strong>, a Gamepass (400 Robux) will be needed for premium features to help us host Fluxcore.
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                  <DialogTitle className="text-foreground">Create Workspace</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">Workspace Name</Label>
                    <Input
                      placeholder="e.g. Pastriez Bakery"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-muted border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">Roblox Group ID <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      placeholder="e.g. 12345678"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="bg-muted border-border"
                    />
                  </div>
                  <Button onClick={handleCreate} disabled={creating || !newName.trim()} variant="hero" className="w-full">
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create
                  </Button>
                </div>
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
