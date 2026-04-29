import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, Plus, Loader2, Trash2, Clock, Calendar, CheckCircle2, XCircle, Users, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

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

interface MemberProgress {
  member_id: string;
  roblox_username: string;
  roblox_user_id: string;
  role_id: string | null;
  current: number;
  target: number;
  completed: boolean;
}

export default function Quotas() {
  const { workspaceId, isOwner, workspace } = useWorkspace();
  const isPremium = !!workspace?.premium;
  const { hasPermission } = usePermissions();
  const { robloxUsername, robloxUserId } = useAuth();
  const canManage = isOwner || hasPermission("manage_members");

  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState(canManage ? "admin" : "my-progress");

  const [title, setTitle] = useState("");
  const [quotaType, setQuotaType] = useState("sessions");
  const [targetValue, setTargetValue] = useState("2");
  const [period, setPeriod] = useState("weekly");
  const [roleId, setRoleId] = useState("all");

  // Admin view
  const [memberProgress, setMemberProgress] = useState<MemberProgress[]>([]);
  const [selectedQuota, setSelectedQuota] = useState<string | null>(null);

  // My progress
  const [myProgress, setMyProgress] = useState<{ quota: Quota; current: number }[]>([]);

  const fetchData = async () => {
    const [{ data: q }, { data: r }] = await Promise.all([
      supabase.from("workspace_quotas").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("workspace_roles").select("id, name, color").eq("workspace_id", workspaceId),
    ]);
    setQuotas(q || []);
    setRoles(r || []);
    setLoading(false);

    // Calculate my progress
    if (robloxUserId && q) {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const progress: { quota: Quota; current: number }[] = [];
      for (const quota of q) {
        const since = quota.period === "weekly" ? weekStart.toISOString() : monthStart.toISOString();
        if (quota.quota_type === "sessions") {
          const { count } = await supabase.from("scheduled_sessions")
            .select("*", { count: "exact", head: true })
            .eq("workspace_id", workspaceId)
            .or(`host_name.eq.${robloxUsername},co_host_name.eq.${robloxUsername},trainer_name.eq.${robloxUsername}`)
            .gte("scheduled_at", since);
          progress.push({ quota, current: count || 0 });
        } else {
          const { data: sessions } = await supabase.from("activity_sessions")
            .select("duration_seconds")
            .eq("workspace_id", workspaceId)
            .eq("roblox_user_id", robloxUserId)
            .gte("joined_at", since);
          const totalMin = Math.round((sessions || []).reduce((s, x) => s + (x.duration_seconds || 0), 0) / 60);
          progress.push({ quota, current: totalMin });
        }
      }
      setMyProgress(progress);
    }
  };

  const fetchMemberProgress = async (quotaId: string) => {
    setSelectedQuota(quotaId);
    const quota = quotas.find(q => q.id === quotaId);
    if (!quota) return;

    const { data: members } = await supabase.from("workspace_members")
      .select("id, roblox_username, roblox_user_id, role_id")
      .eq("workspace_id", workspaceId);

    if (!members) return;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const since = quota.period === "weekly" ? weekStart.toISOString() : monthStart.toISOString();

    const filtered = quota.role_id ? members.filter(m => m.role_id === quota.role_id) : members;
    const progress: MemberProgress[] = [];

    for (const m of filtered) {
      let current = 0;
      if (quota.quota_type === "sessions") {
        const { count } = await supabase.from("scheduled_sessions")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .or(`host_name.eq.${m.roblox_username},co_host_name.eq.${m.roblox_username},trainer_name.eq.${m.roblox_username}`)
          .gte("scheduled_at", since);
        current = count || 0;
      } else {
        const { data: sessions } = await supabase.from("activity_sessions")
          .select("duration_seconds")
          .eq("workspace_id", workspaceId)
          .eq("roblox_user_id", m.roblox_user_id)
          .gte("joined_at", since);
        current = Math.round((sessions || []).reduce((s, x) => s + (x.duration_seconds || 0), 0) / 60);
      }
      progress.push({
        member_id: m.id,
        roblox_username: m.roblox_username,
        roblox_user_id: m.roblox_user_id,
        role_id: m.role_id,
        current,
        target: quota.target_value,
        completed: current >= quota.target_value,
      });
    }
    setMemberProgress(progress.sort((a, b) => (b.completed ? 1 : 0) - (a.completed ? 1 : 0)));
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
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quotas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Activity requirements and progress tracking</p>
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
                      <Label className="text-xs flex items-center gap-1.5">
                        Applies To
                        {!isPremium && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase">Premium</span>}
                      </Label>
                      <Select value={isPremium ? roleId : "all"} onValueChange={(v) => isPremium && setRoleId(v)} disabled={!isPremium}>
                        <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Members</SelectItem>
                          {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {!isPremium && (
                        <p className="text-[10px] text-muted-foreground">
                          Per-role quotas require Premium. <a href="/#/pricing" className="text-primary hover:underline">Upgrade</a>
                        </p>
                      )}
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-secondary/60 border border-border/40">
            {canManage && <TabsTrigger value="admin">Admin View</TabsTrigger>}
            <TabsTrigger value="my-progress">My Progress</TabsTrigger>
          </TabsList>

          {canManage && (
            <TabsContent value="admin">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : quotas.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No quotas set yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {quotas.map(q => (
                      <button key={q.id} onClick={() => fetchMemberProgress(q.id)}
                        className={`w-full glass rounded-xl p-5 text-left transition-colors ${selectedQuota === q.id ? "ring-2 ring-primary" : "hover:bg-secondary/30"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Target className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground text-sm">{q.title}</h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{q.target_value} {q.quota_type === "sessions" ? "sessions" : "minutes"}</span>
                                <span className="px-1.5 py-0.5 rounded bg-secondary">{q.period}</span>
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{getRoleName(q.role_id)}</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedQuota && (
                    <div className="glass rounded-xl p-5 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-foreground text-sm">Member Progress</h3>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {memberProgress.filter(m => m.completed).length}/{memberProgress.length} completed
                        </span>
                      </div>
                      {memberProgress.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No members matched.</p>
                      ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                          {memberProgress.map(m => (
                            <div key={m.member_id} className="p-3 rounded-lg bg-secondary/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {m.completed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                                  <span className="text-sm font-medium text-foreground">{m.roblox_username}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{m.current}/{m.target}</span>
                              </div>
                              <Progress value={Math.min((m.current / m.target) * 100, 100)} className="h-1.5" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="my-progress">
            {myProgress.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No quotas apply to you yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myProgress.map(({ quota, current }) => {
                  const pct = Math.min((current / quota.target_value) * 100, 100);
                  const done = current >= quota.target_value;
                  return (
                    <div key={quota.id} className="glass rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {done ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Target className="w-5 h-5 text-primary" />}
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">{quota.title}</h3>
                            <p className="text-xs text-muted-foreground">{quota.period} · {quota.quota_type === "sessions" ? "Sessions" : "Minutes"}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${done ? "text-success" : "text-foreground"}`}>
                          {current}/{quota.target_value}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                      {done && <p className="text-xs text-success font-medium">Quota completed!</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
