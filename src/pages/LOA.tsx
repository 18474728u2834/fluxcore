import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Plus, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface LOARequest {
  id: string; reason: string; start_date: string; end_date: string;
  status: string; reviewed_by: string | null; created_at: string;
  member_id: string; user_id: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  denied: "bg-destructive/10 text-destructive",
};

export default function LOA() {
  const { workspaceId, isOwner } = useWorkspace();
  const { user, robloxUsername } = useAuth();
  const { hasPermission } = usePermissions();
  const canManage = isOwner || hasPermission("manage_members");

  const [requests, setRequests] = useState<LOARequest[]>([]);
  const [myMemberId, setMyMemberId] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    const [{ data: reqs }, { data: member }] = await Promise.all([
      supabase.from("loa_requests").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", user?.id).maybeSingle(),
    ]);
    setRequests(reqs || []);
    setMyMemberId(member?.id || "");
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [workspaceId]);

  const handleCreate = async () => {
    if (!reason.trim() || !startDate || !endDate || !user || !myMemberId) return;
    setCreating(true);
    const { error } = await supabase.from("loa_requests").insert({
      workspace_id: workspaceId, member_id: myMemberId, user_id: user.id,
      reason: reason.trim(), start_date: startDate, end_date: endDate,
    });
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("LOA request submitted!"); setDialogOpen(false); setReason(""); setStartDate(""); setEndDate(""); fetchData(); }
    setCreating(false);
  };

  const handleReview = async (id: string, status: string) => {
    const { error } = await supabase.from("loa_requests").update({ status, reviewed_by: robloxUsername || "Admin" }).eq("id", id);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success(`Request ${status}`); fetchData(); }
  };

  return (
    <DashboardLayout title="Leave of Absence">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leave of Absence</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Request or manage time off</p>
          </div>
          {myMemberId && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> Request LOA</Button>
              </DialogTrigger>
              <DialogContent className="glass border-border/40 max-w-sm">
                <DialogHeader><DialogTitle className="text-foreground">Request Leave of Absence</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <Textarea placeholder="Reason for leave..." value={reason} onChange={(e) => setReason(e.target.value)} className="bg-muted border-border min-h-[80px]" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Start Date</Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-muted border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">End Date</Label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-muted border-border" />
                    </div>
                  </div>
                  <Button variant="hero" className="w-full" onClick={handleCreate} disabled={creating || !reason.trim() || !startDate || !endDate}>
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No LOA requests yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="glass rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[req.status]}`}>
                      {req.status}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {canManage && req.status === "pending" && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-success" onClick={() => handleReview(req.id, "approved")}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleReview(req.id, "denied")}>
                        <XCircle className="w-3 h-3 mr-1" /> Deny
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-foreground">{req.reason}</p>
                <div className="text-xs text-muted-foreground">
                  {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
                  {req.reviewed_by && <span className="ml-2">• Reviewed by {req.reviewed_by}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
