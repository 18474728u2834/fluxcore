import { DashboardLayout } from "@/components/DashboardLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { ArrowLeft, Clock, AlertTriangle, TrendingUp, TrendingDown, MessageSquare, Loader2, Plus, Trash2, ExternalLink, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface MemberData {
  id: string;
  roblox_username: string;
  roblox_user_id: string;
  role: string;
  verified: boolean;
  joined_at: string;
}

interface MemberLog {
  id: string;
  log_type: string;
  content: string;
  author_name: string;
  created_at: string;
}

interface ActivityEvent {
  id: string;
  event_type: string;
  created_at: string;
  event_data: any;
  roblox_username: string | null;
}

const logTypeColors: Record<string, string> = {
  promotion: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  note: "bg-primary/10 text-primary",
  demotion: "bg-destructive/10 text-destructive",
};

export default function MemberProfile() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { workspaceId, isOwner } = useWorkspace();
  const { user, robloxUsername } = useAuth();
  const { hasPermission } = usePermissions();
  const canManage = isOwner || hasPermission("manage_members");

  const [member, setMember] = useState<MemberData | null>(null);
  const [logs, setLogs] = useState<MemberLog[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [avatar, setAvatar] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"profile" | "logs" | "activity">("profile");

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logType, setLogType] = useState("note");
  const [logContent, setLogContent] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!memberId) return;
    const fetchAll = async () => {
      const { data: m } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("id", memberId)
        .single();
      if (!m) { navigate(`/w/${workspaceId}/members`); return; }
      setMember(m);

      // Avatar
      try {
        const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${m.roblox_user_id}&size=150x150&format=Png&isCircular=true`);
        const json = await res.json();
        if (json?.data?.[0]?.imageUrl) setAvatar(json.data[0].imageUrl);
      } catch {}

      // Logs
      const { data: logsData } = await supabase
        .from("member_logs")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });
      setLogs(logsData || []);

      // Activity events
      const { data: events } = await supabase
        .from("activity_events")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("roblox_user_id", m.roblox_user_id)
        .order("created_at", { ascending: false })
        .limit(50);
      setActivity(events || []);

      setLoading(false);
    };
    fetchAll();
  }, [memberId, workspaceId]);

  const addLog = async () => {
    if (!logContent.trim() || !user || !memberId) return;
    setPosting(true);
    const { error } = await supabase.from("member_logs").insert({
      workspace_id: workspaceId,
      member_id: memberId,
      author_id: user.id,
      author_name: robloxUsername || "Unknown",
      log_type: logType,
      content: logContent.trim(),
    });
    if (error) toast.error("Failed: " + error.message);
    else {
      // Mirror the log to Roblox: a "demotion" or "promotion" entry triggers
      // a one-rank step in the Roblox group via Open Cloud.
      if ((logType === "demotion" || logType === "promotion") && member) {
        const stepAction = logType === "demotion" ? "demote_one" : "promote_one";
        const res = await supabase.functions.invoke("roblox-rank", {
          body: { action: stepAction, workspace_id: workspaceId, roblox_user_id: member.roblox_user_id },
        });
        if (res.data?.success) {
          toast.success(`Log added — ${member.roblox_username} moved to ${res.data.to?.name || "new rank"}`);
        } else {
          toast.warning(`Log saved, but Roblox rank wasn't changed: ${res.data?.error || res.error?.message || "unknown error"}`);
        }
      } else {
        toast.success("Log added");
      }
      setLogDialogOpen(false);
      setLogContent("");
      const { data } = await supabase.from("member_logs").select("*").eq("member_id", memberId).order("created_at", { ascending: false });
      setLogs(data || []);
    }
    setPosting(false);
  };

  const deleteLog = async (logId: string) => {
    await supabase.from("member_logs").delete().eq("id", logId);
    setLogs(logs.filter(l => l.id !== logId));
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return (
      <DashboardLayout title="Member Profile">
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      </DashboardLayout>
    );
  }

  if (!member) return null;

  return (
    <DashboardLayout title={member.roblox_username}>
      <div className="space-y-6 max-w-3xl">
        <button onClick={() => navigate(`/w/${workspaceId}/members`)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Members
        </button>

        {/* Profile Header */}
        <div className="glass rounded-xl p-6 flex items-center gap-5">
          <RobloxAvatar
            username={member.roblox_username}
            userId={member.roblox_user_id}
            className="w-16 h-16 rounded-full"
          />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{member.roblox_username}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{member.role}</span>
              {member.verified && <span className="text-success text-xs">✓ Verified</span>}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Joined {new Date(member.joined_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/40 rounded-lg p-1">
          {(["profile", "logs", "activity"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "profile" ? "Profile" : t === "logs" ? "Logs" : "Activity"}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <RobloxPanel
            member={member}
            avatar={avatar}
            logs={logs}
            activityCount={activity.length}
          />
        )}

        {/* Logs Tab */}
        {tab === "logs" && (
          <div className="space-y-3">
            {canManage && (
              <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Log</Button>
                </DialogTrigger>
                <DialogContent className="glass border-border/40 max-w-sm">
                  <DialogHeader><DialogTitle className="text-foreground">Add Log Entry</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Select value={logType} onValueChange={setLogType}>
                      <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="promotion">Promotion Hint</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="demotion">Demotion</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea placeholder="Write details..." value={logContent} onChange={(e) => setLogContent(e.target.value)} className="bg-muted border-border min-h-[80px]" />
                    <Button variant="hero" className="w-full" onClick={addLog} disabled={posting || !logContent.trim()}>
                      {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add Log
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {logs.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground">No log entries yet.</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="glass rounded-xl p-4 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${logTypeColors[log.log_type] || "bg-secondary text-muted-foreground"}`}>
                    {log.log_type === "warning" ? <AlertTriangle className="w-4 h-4" /> :
                     log.log_type === "promotion" ? <TrendingUp className="w-4 h-4" /> :
                     <MessageSquare className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${logTypeColors[log.log_type] || "bg-secondary text-muted-foreground"}`}>
                        {log.log_type}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(log.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{log.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">by {log.author_name}</p>
                  </div>
                  {isOwner && (
                    <button onClick={() => deleteLog(log.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Activity Tab */}
        {tab === "activity" && (
          <div className="space-y-2">
            {activity.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              </div>
            ) : (
              activity.map(evt => (
                <div key={evt.id} className="glass rounded-lg p-3 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{evt.event_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(evt.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function RobloxPanel({ member, avatar, logs, activityCount }: {
  member: MemberData; avatar: string; logs: MemberLog[]; activityCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const copyId = () => {
    navigator.clipboard.writeText(member.roblox_user_id);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const rankHistory = logs
    .filter(l => l.log_type === "promotion" || l.log_type === "demotion")
    .slice(0, 6);
  const warnings = logs.filter(l => l.log_type === "warning").length;
  const fmt = (d: string) => new Date(d).toLocaleDateString();

  return (
    <div className="space-y-4">
      {/* Roblox identity card */}
      <div className="glass rounded-xl p-5 space-y-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-start gap-4">
          {avatar ? (
            <img src={avatar} alt={member.roblox_username} className="w-20 h-20 rounded-2xl border border-border/40 bg-secondary/40" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-secondary/40 flex items-center justify-center text-2xl font-bold text-muted-foreground">
              {member.roblox_username.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Roblox</p>
            <h2 className="text-lg font-bold text-foreground truncate">@{member.roblox_username}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/15 text-primary">{member.role}</span>
              {member.verified && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-success/15 text-success">Verified</span>}
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Joined {fmt(member.joined_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          <a
            href={`https://www.roblox.com/users/${member.roblox_user_id}/profile`}
            target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 bg-muted/50 hover:bg-muted text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Roblox
          </a>
          <button
            onClick={copyId}
            className="flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 bg-muted/50 hover:bg-muted text-foreground transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : `ID ${member.roblox_user_id}`}
          </button>
          <a
            href={`https://www.roblox.com/messages/compose?recipientId=${member.roblox_user_id}`}
            target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 bg-muted/50 hover:bg-muted text-foreground transition-colors col-span-2 sm:col-span-1"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Message
          </a>
        </div>

        {/* Quick stats strip */}
        <div className="relative grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
          <Stat label="Warnings" value={warnings} tone={warnings > 0 ? "warn" : "muted"} />
          <Stat label="Events" value={activityCount} />
          <Stat label="Rank moves" value={rankHistory.length} />
        </div>
      </div>

      {/* Rank history timeline */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Rank history</h3>
          <span className="text-[11px] text-muted-foreground">{rankHistory.length} recent</span>
        </div>
        {rankHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">No promotions or demotions logged yet.</p>
        ) : (
          <ol className="relative border-l border-border/40 ml-1 space-y-3">
            {rankHistory.map((log) => {
              const up = log.log_type === "promotion";
              return (
                <li key={log.id} className="pl-4 relative">
                  <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full flex items-center justify-center ${up ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                    {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  </span>
                  <p className="text-sm text-foreground">{log.content}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">by {log.author_name} · {fmt(log.created_at)}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warn" | "muted" }) {
  const color = tone === "warn" ? "text-warning" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="text-center">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
