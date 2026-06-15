import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X, ArrowUp, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface Nomination {
  id: string;
  nominee_name: string;
  nominator_name: string;
  nominee_member_id: string;
  nominator_user_id: string;
  reason: string;
  suggested_rank: string | null;
  status: string;
  decided_by_name: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

interface Member {
  id: string;
  roblox_username: string | null;
  user_id: string;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Promotions() {
  const { workspaceId, isOwner } = useWorkspace();
  const { user, robloxUsername } = useAuth();
  const { hasPermission } = usePermissions();
  const isReviewer = isOwner || hasPermission("promote_members") || hasPermission("manage_members");

  const [noms, setNoms] = useState<Nomination[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "decided" | "mine">("pending");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nomineeId, setNomineeId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [reason, setReason] = useState("");
  const [suggested, setSuggested] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchAll = async () => {
    const [{ data: n }, { data: m }] = await Promise.all([
      supabase
        .from("promotion_nominations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("workspace_members")
        .select("id,roblox_username,user_id")
        .eq("workspace_id", workspaceId)
        .order("roblox_username"),
    ]);
    setNoms((n as any) || []);
    setMembers((m as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!workspaceId) return;
    fetchAll();
    const channel = supabase
      .channel(`promo-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promotion_nominations", filter: `workspace_id=eq.${workspaceId}` },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const others = members.filter((m) => m.user_id !== user?.id);
    return q
      ? others.filter((m) => (m.roblox_username || "").toLowerCase().includes(q))
      : others.slice(0, 30);
  }, [members, memberSearch, user?.id]);

  const visible = useMemo(() => {
    if (tab === "pending") return noms.filter((n) => n.status === "pending");
    if (tab === "decided") return noms.filter((n) => n.status !== "pending");
    return noms.filter((n) => n.nominator_user_id === user?.id);
  }, [noms, tab, user?.id]);

  const handleSubmit = async () => {
    if (!nomineeId || !reason.trim() || !user) return;
    const nominee = members.find((m) => m.id === nomineeId);
    if (!nominee) return;
    setPosting(true);
    const { data: myMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    const { error } = await supabase.from("promotion_nominations").insert({
      workspace_id: workspaceId,
      nominee_member_id: nominee.id,
      nominator_user_id: user.id,
      nominator_member_id: (myMember as any)?.id ?? null,
      nominee_name: nominee.roblox_username || "Member",
      nominator_name: robloxUsername || "Unknown",
      reason: reason.trim().slice(0, 800),
      suggested_rank: suggested.trim() || null,
    });
    setPosting(false);
    if (error) {
      toast.error("Failed to submit: " + error.message);
      return;
    }
    toast.success("Nomination submitted!");
    setDialogOpen(false);
    setReason("");
    setSuggested("");
    setNomineeId("");
    setMemberSearch("");
  };

  const decide = async (id: string, status: "approved" | "declined") => {
    const { error } = await supabase
      .from("promotion_nominations")
      .update({
        status,
        decided_by: user?.id,
        decided_by_name: robloxUsername || "Reviewer",
        decided_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(status === "approved" ? "Approved" : "Declined");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("promotion_nominations").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
  };

  return (
    <DashboardLayout title="Promotions">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-primary" /> Promotion Hints
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Nominate teammates for promotion. Leads review the queue.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Nominate
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/40">
              <DialogHeader>
                <DialogTitle className="text-foreground">Nominate for Promotion</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="Search teammate..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="bg-muted border-border"
                />
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border/40 bg-muted/40 p-1">
                  {filteredMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">No members found.</p>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setNomineeId(m.id)}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                          nomineeId === m.id
                            ? "bg-primary/15 text-primary"
                            : "hover:bg-secondary/60 text-foreground"
                        }`}
                      >
                        {m.roblox_username || "—"}
                      </button>
                    ))
                  )}
                </div>
                <Input
                  placeholder="Suggested rank (optional)"
                  value={suggested}
                  onChange={(e) => setSuggested(e.target.value.slice(0, 80))}
                  className="bg-muted border-border"
                />
                <Textarea
                  placeholder="Why do they deserve a promotion?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 800))}
                  className="bg-muted border-border min-h-[120px]"
                  maxLength={800}
                />
                <p className="text-[10px] text-muted-foreground text-right">{reason.length}/800</p>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={posting || !nomineeId || !reason.trim()}
                >
                  {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit nomination
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-1 border-b border-border/40">
          {(["pending", "decided", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "mine" ? "My nominations" : t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">Nothing here yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((n) => {
              const statusColor =
                n.status === "approved"
                  ? "text-success bg-success/10"
                  : n.status === "declined"
                  ? "text-destructive bg-destructive/10"
                  : "text-primary bg-primary/10";
              const canRemove =
                isOwner ||
                hasPermission("manage_members") ||
                (n.status === "pending" && n.nominator_user_id === user?.id);
              return (
                <article key={n.id} className="glass rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold text-primary">{n.nominee_name}</span>
                        {n.suggested_rank && (
                          <span className="text-muted-foreground"> → {n.suggested_rank}</span>
                        )}
                      </p>
                      <span
                        className={`text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${statusColor}`}
                      >
                        {n.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {n.reason}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-muted-foreground">
                      Nominated by <span className="text-foreground">{n.nominator_name}</span>
                      {n.decided_by_name && n.status !== "pending" && (
                        <>
                          {" · "}
                          {n.status} by{" "}
                          <span className="text-foreground">{n.decided_by_name}</span>
                        </>
                      )}
                    </p>
                    <div className="flex items-center gap-1">
                      {isReviewer && n.status === "pending" && (
                        <>
                          <button
                            onClick={() => decide(n.id, "approved")}
                            className="px-2 py-1 rounded text-[11px] font-medium text-success hover:bg-success/10 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => decide(n.id, "declined")}
                            className="px-2 py-1 rounded text-[11px] font-medium text-destructive hover:bg-destructive/10 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Decline
                          </button>
                        </>
                      )}
                      {canRemove && (
                        <button
                          onClick={() => remove(n.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
