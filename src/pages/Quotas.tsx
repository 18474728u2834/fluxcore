import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, Plus, Loader2, Trash2, Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface Quota {
  id: string;
  title: string;
  quota_type: string;
  target_value: number;
  period: string;
  role_id: string | null;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  color: string;
}

export default function Quotas() {
  const { workspaceId, isOwner } = useWorkspace();
  const { hasPermission } = usePermissions();
  const canManage = isOwner || hasPermission("manage_members");

  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [quotaType, setQuotaType] = useState("sessions");
  const [targetValue, setTargetValue] = useState("2");
  const [period, setPeriod] = useState("weekly");
  const [roleId, setRoleId] = useState("all");

  const fetchData = async () => {
    const [{ data: q }, { data: r }] = await Promise.all([
      supabase.from("workspace_quotas").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("workspace_roles").select("id, name, color").eq("workspace_id", workspaceId),
    ]);
    setQuotas(q || []);
    setRoles(r || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [workspaceId]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("workspace_quotas").insert({
      workspace_id: workspaceId,
      title: title.trim(),
      quota_type: quotaType,
      target_value: parseInt(targetValue) || 1,
      period,
      role_id: roleId === "all" ? null : roleId,
    });
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Quota created!"); setDialogOpen(false); setTitle(""); fetchData(); }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("workspace_quotas").delete().eq("id", id);
    toast.success("Quota deleted");
    fetchData();
  };

  const getRoleName = (roleId: string | null) => {
    if (!roleId) return "All Members";
    return roles.find(r => r.id === roleId)?.name || "Unknown";
  };

  return (
    <DashboardLayout title="Quotas">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quotas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Set activity requirements for members</p>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> Create Quota</Button>
              </DialogTrigger>
              <DialogContent className="glass border-border/40 max-w-sm">
                <DialogHeader><DialogTitle className="text-foreground">Create Quota</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input placeholder="e.g. Host 2 sessions" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted border-border" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Type</Label>
                      <Select value={quotaType} onValueChange={setQuotaType}>
                        <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sessions">Sessions Hosted</SelectItem>
                          <SelectItem value="minutes">In-Game Minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Target</Label>
                      <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="bg-muted border-border" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Period</Label>
                      <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Applies To</Label>
                      <Select value={roleId} onValueChange={setRoleId}>
                        <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Members</SelectItem>
                          {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="hero" className="w-full" onClick={handleCreate} disabled={creating || !title.trim()}>
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Quota
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : quotas.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No quotas set yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotas.map(q => (
              <div key={q.id} className="glass rounded-xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{q.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {q.quota_type === "sessions" ? <Calendar className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {q.target_value} {q.quota_type === "sessions" ? "sessions" : "minutes"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{q.period}</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{getRoleName(q.role_id)}</span>
                  </div>
                </div>
                {canManage && (
                  <button onClick={() => handleDelete(q.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
