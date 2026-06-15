import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Heart, Plus, Loader2, Trash2, Sparkles, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Kudo {
  id: string;
  from_name: string;
  to_name: string;
  to_member_id: string;
  from_user_id: string;
  message: string;
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
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Kudos() {
  const { workspaceId, isOwner } = useWorkspace();
  const { user, robloxUsername } = useAuth();
  const [kudos, setKudos] = useState<Kudo[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toMemberId, setToMemberId] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState("");
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchAll = async () => {
    const [{ data: k }, { data: m }] = await Promise.all([
      supabase
        .from("kudos")
        .select("id,from_name,to_name,to_member_id,from_user_id,message,created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("workspace_members")
        .select("id,roblox_username,user_id")
        .eq("workspace_id", workspaceId)
        .order("roblox_username"),
    ]);
    setKudos((k as any) || []);
    setMembers((m as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!workspaceId) return;
    fetchAll();
    const channel = supabase
      .channel(`kudos-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kudos", filter: `workspace_id=eq.${workspaceId}` },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  // Spotlight: top recipient in last 7 days
  const spotlight = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const counts = new Map<string, { name: string; count: number }>();
    for (const k of kudos) {
      if (new Date(k.created_at).getTime() < since) continue;
      const cur = counts.get(k.to_member_id) || { name: k.to_name, count: 0 };
      cur.count += 1;
      cur.name = k.to_name;
      counts.set(k.to_member_id, cur);
    }
    let top: { name: string; count: number } | null = null;
    for (const v of counts.values()) {
      if (!top || v.count > top.count) top = v;
    }
    return top;
  }, [kudos]);

  const handlePost = async () => {
    if (!toMemberId || !message.trim() || !user) return;
    const toMember = members.find((m) => m.id === toMemberId);
    if (!toMember) return;
    setPosting(true);
    const { data: myMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    const { error } = await supabase.from("kudos").insert({
      workspace_id: workspaceId,
      from_user_id: user.id,
      from_member_id: (myMember as any)?.id ?? null,
      to_member_id: toMember.id,
      from_name: robloxUsername || "Unknown",
      to_name: toMember.roblox_username || "Member",
      message: message.trim().slice(0, 500),
    });
    setPosting(false);
    if (error) {
      toast.error("Failed to post: " + error.message);
      return;
    }
    toast.success("Kudos sent!");
    setDialogOpen(false);
    setMessage("");
    setToMemberId("");
    setMemberSearch("");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("kudos").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
  };

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const others = members.filter((m) => m.user_id !== user?.id);
    return q
      ? others.filter((m) => (m.roblox_username || "").toLowerCase().includes(q))
      : others.slice(0, 30);
  }, [members, memberSearch, user?.id]);

  return (
    <DashboardLayout title="Kudos">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" /> Kudos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Recognise teammates for the great work they do.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Give Kudos
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/40">
              <DialogHeader>
                <DialogTitle className="text-foreground">Send Kudos</DialogTitle>
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
                        onClick={() => setToMemberId(m.id)}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                          toMemberId === m.id
                            ? "bg-primary/15 text-primary"
                            : "hover:bg-secondary/60 text-foreground"
                        }`}
                      >
                        {m.roblox_username || "—"}
                      </button>
                    ))
                  )}
                </div>
                <Textarea
                  placeholder="Why are they awesome?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  className="bg-muted border-border min-h-[110px]"
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground text-right">{message.length}/500</p>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handlePost}
                  disabled={posting || !toMemberId || !message.trim()}
                >
                  {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Send
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {spotlight && (
          <div className="glass rounded-xl p-4 flex items-center gap-3 border border-primary/30">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary/80 font-semibold">
                Staff Spotlight · last 7 days
              </p>
              <p className="text-sm text-foreground font-semibold">
                {spotlight.name}{" "}
                <span className="text-muted-foreground font-normal">
                  · {spotlight.count} kudos
                </span>
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-primary/60 ml-auto" />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : kudos.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No kudos yet — be the first to recognise a teammate.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {kudos.map((k) => {
              const canDelete = isOwner || k.from_user_id === user?.id;
              return (
                <article key={k.id} className="glass rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{k.from_name}</span>
                      <span className="text-muted-foreground"> recognised </span>
                      <span className="font-semibold text-primary">{k.to_name}</span>
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground">{timeAgo(k.created_at)}</span>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(k.id)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {k.message}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
