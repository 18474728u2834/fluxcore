import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Loader2, Ban, UserX, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface Blacklisted {
  id: string; roblox_username: string; roblox_user_id: string;
  reason: string | null; blacklisted_at: string;
}

export default function Staff() {
  const { workspaceId, isOwner } = useWorkspace();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canManage = isOwner || hasPermission("manage_members");

  const [blacklist, setBlacklist] = useState<Blacklisted[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [blUsername, setBlUsername] = useState("");
  const [blUserId, setBlUserId] = useState("");
  const [blReason, setBlReason] = useState("");

  const fetchBlacklist = async () => {
    const { data } = await supabase.from("workspace_blacklist").select("*").eq("workspace_id", workspaceId).order("blacklisted_at", { ascending: false });
    setBlacklist(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBlacklist(); }, [workspaceId]);

  const handleBlacklist = async () => {
    if (!blUsername.trim() || !blUserId.trim() || !user) return;
    setAdding(true);
    const { error } = await supabase.from("workspace_blacklist").insert({
      workspace_id: workspaceId, roblox_username: blUsername.trim(),
      roblox_user_id: blUserId.trim(), reason: blReason.trim() || null, blacklisted_by: user.id,
    });
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success(`${blUsername} blacklisted`);
      // Also remove from members if they exist
      await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("roblox_user_id", blUserId.trim());
      setDialogOpen(false); setBlUsername(""); setBlUserId(""); setBlReason(""); fetchBlacklist();
    }
    setAdding(false);
  };

  const removeBlacklist = async (id: string) => {
    await supabase.from("workspace_blacklist").delete().eq("id", id);
    toast.success("Removed from blacklist");
    fetchBlacklist();
  };

  return (
    <DashboardLayout title="Staff Management">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Blacklist & termination management</p>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm"><Ban className="w-4 h-4 mr-1" /> Blacklist User</Button>
              </DialogTrigger>
              <DialogContent className="glass border-border/40 max-w-sm">
                <DialogHeader><DialogTitle className="text-foreground">Blacklist User</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="bg-destructive/10 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">This will remove the user and prevent them from rejoining via invite.</p>
                  </div>
                  <Input placeholder="Roblox Username" value={blUsername} onChange={(e) => setBlUsername(e.target.value)} className="bg-muted border-border" />
                  <Input placeholder="Roblox User ID" value={blUserId} onChange={(e) => setBlUserId(e.target.value)} className="bg-muted border-border" />
                  <Textarea placeholder="Reason (optional)" value={blReason} onChange={(e) => setBlReason(e.target.value)} className="bg-muted border-border" />
                  <Button variant="destructive" className="w-full" onClick={handleBlacklist} disabled={adding || !blUsername.trim() || !blUserId.trim()}>
                    {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm Blacklist
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="glass rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
            <Shield className="w-4 h-4 text-destructive" />
            <h3 className="font-semibold text-foreground text-sm">Blacklisted Users</h3>
            <span className="text-xs text-muted-foreground ml-auto">{blacklist.length} total</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
          ) : blacklist.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">No blacklisted users.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {blacklist.map(bl => (
                <div key={bl.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <UserX className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{bl.roblox_username}</p>
                    <p className="text-xs text-muted-foreground">{bl.reason || "No reason"} • {new Date(bl.blacklisted_at).toLocaleDateString()}</p>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => removeBlacklist(bl.id)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
