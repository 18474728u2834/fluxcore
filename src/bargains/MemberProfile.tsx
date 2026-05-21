import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BargainsShell, bx } from "./Shell";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { ArrowLeft, AlertTriangle, ExternalLink, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface MemberData { id: string; user_id: string | null; roblox_username: string; roblox_user_id: string; role: string; verified: boolean; joined_at: string; birthday_month: number | null; birthday_day: number | null; }
interface MemberLog { id: string; log_type: string; content: string; author_name: string; created_at: string; }
interface ActivityEvent { id: string; event_type: string; created_at: string; event_data: any; }

const TABS = ["Details", "Activity", "Logbook", "Assignments", "Time off"] as const;
type Tab = typeof TABS[number];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function BMemberProfile() {
  const { memberId } = useParams<{ memberId: string }>();
  const { workspaceId, isOwner } = useWorkspace();
  const { user, robloxUsername } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const canManage = isOwner || hasPermission("manage_members");

  const [member, setMember] = useState<MemberData | null>(null);
  const [logs, setLogs] = useState<MemberLog[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [tab, setTab] = useState<Tab>("Details");

  const [logOpen, setLogOpen] = useState(false);
  const [logType, setLogType] = useState("note");
  const [logContent, setLogContent] = useState("");

  useEffect(() => {
    if (!memberId) return;
    (async () => {
      const { data: m } = await supabase.from("workspace_members").select("*").eq("id", memberId).maybeSingle();
      if (!m) { navigate(`/w/${workspaceId}/members`); return; }
      let merged: any = { ...m };
      if ((m as any).user_id) {
        const { data: bd } = await supabase.from("user_birthdays")
          .select("birthday_month, birthday_day").eq("user_id", (m as any).user_id).maybeSingle();
        if (bd) merged.birthday_month = bd.birthday_month, merged.birthday_day = bd.birthday_day;
      }
      setMember(merged as any);
      const [{ data: l }, { data: ev }] = await Promise.all([
        supabase.from("member_logs").select("*").eq("member_id", memberId).order("created_at", { ascending: false }),
        supabase.from("activity_events").select("*").eq("workspace_id", workspaceId).eq("roblox_user_id", (m as any).roblox_user_id).order("created_at", { ascending: false }).limit(50),
      ]);
      setLogs((l || []) as any);
      setActivity((ev || []) as any);
    })();
  }, [memberId, workspaceId]);

  const addLog = async () => {
    if (!logContent.trim() || !user || !memberId) return;
    const { error } = await supabase.from("member_logs").insert({
      workspace_id: workspaceId, member_id: memberId, author_id: user.id,
      author_name: robloxUsername || "Unknown", log_type: logType, content: logContent.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Added"); setLogOpen(false); setLogContent("");
      const { data } = await supabase.from("member_logs").select("*").eq("member_id", memberId).order("created_at", { ascending: false });
      setLogs((data || []) as any);
    }
  };

  if (!member) return <BargainsShell><div className="text-sm" style={{ color: bx.textDim }}>Loading…</div></BargainsShell>;

  const warnings = logs.filter(l => l.log_type === "warning").length;
  const birthday = member.birthday_month && member.birthday_day ? `${MONTHS[member.birthday_month - 1]} ${member.birthday_day}` : "Unknown";

  return (
    <BargainsShell>
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate(`/w/${workspaceId}/members`)} className="flex items-center gap-1.5 text-xs mb-5" style={{ color: bx.textDim }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Members
        </button>

        {/* Header */}
        <div className="rounded-md border p-6 flex items-start gap-6" style={bx.cardStyle}>
          <RobloxAvatar username={member.roblox_username} userId={member.roblox_user_id} className="w-28 h-28 rounded-md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[2rem] font-bold tracking-[-0.03em] leading-none" style={{ color: bx.text }}>{member.roblox_username}</h1>
              <a href={`https://www.roblox.com/users/${member.roblox_user_id}/profile`} target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100"><ExternalLink className="w-4 h-4" style={{ color: bx.textDim }} /></a>
            </div>
            <div className="text-sm mt-1.5" style={{ color: bx.textDim }}>{member.role}</div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[11px] px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1" style={{ background: "#242427", color: bx.textDim }}>
                Joined {new Date(member.joined_at).toLocaleDateString()}
              </span>
              {warnings > 0 && (
                <span className="text-[11px] px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <AlertTriangle className="w-3 h-3" /> {warnings} warning{warnings !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mt-6 flex gap-6" style={{ borderColor: "#22222a" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="pb-3 text-sm font-medium transition-colors"
              style={{
                color: tab === t ? bx.text : bx.textMuted,
                borderBottom: tab === t ? "2px solid #f55a4a" : "2px solid transparent",
                marginBottom: "-1px",
              }}>{t}</button>
          ))}
        </div>

        {tab === "Details" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            <div className="rounded-md border p-5" style={bx.cardStyle}>
              <div className="text-sm font-bold mb-4" style={{ color: bx.text }}>Directory profile</div>
              <div className="space-y-3 text-sm">
                {[
                  ["Roblox ID", member.roblox_user_id],
                  ["Username", member.roblox_username],
                  ["Role", member.role],
                  ["Birthday", birthday],
                  ["Joined", new Date(member.joined_at).toLocaleDateString()],
                  ["Status", member.verified ? "Verified" : "Unverified"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: bx.text }}>{v}</span>
                    <span style={{ color: bx.textMuted }}>· {k}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border p-5" style={bx.cardStyle}>
              <div className="text-sm font-bold mb-4" style={{ color: bx.text }}>Quick stats</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md p-4" style={{ background: "#141416" }}>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: bx.text }}>{warnings}</div>
                  <div className="text-xs mt-1" style={{ color: bx.textMuted }}>Warnings</div>
                </div>
                <div className="rounded-md p-4" style={{ background: "#141416" }}>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: bx.text }}>{activity.length}</div>
                  <div className="text-xs mt-1" style={{ color: bx.textMuted }}>Events</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "Activity" && (
          <div className="rounded-md border mt-6 overflow-hidden" style={bx.cardStyle}>
            {activity.length === 0 ? (
              <div className="p-10 text-center text-sm" style={{ color: bx.textDim }}>No activity recorded yet.</div>
            ) : activity.map((e, i) => (
              <div key={e.id} className="px-5 py-3 flex items-center gap-3" style={{ borderTop: i === 0 ? "none" : "1px solid #22222a" }}>
                <div className="w-2 h-2 rounded-md" style={{ background: bx.coral }} />
                <div className="flex-1 text-sm" style={{ color: bx.text }}>{e.event_type}</div>
                <div className="text-xs" style={{ color: bx.textMuted }}>{new Date(e.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "Logbook" && (
          <div className="mt-6 space-y-3">
            {canManage && (
              <button onClick={() => setLogOpen(true)} className="h-9 px-4 rounded-md text-xs font-semibold inline-flex items-center gap-1.5" style={{ background: "#0d4f4f", color: "#7fd9d9" }}>
                <Plus className="w-3.5 h-3.5" /> Add log
              </button>
            )}
            <div className="rounded-md border overflow-hidden" style={bx.cardStyle}>
              {logs.length === 0 ? (
                <div className="p-10 text-center text-sm" style={{ color: bx.textDim }}>No log entries yet.</div>
              ) : logs.map((l, i) => (
                <div key={l.id} className="p-4" style={{ borderTop: i === 0 ? "none" : "1px solid #22222a" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider" style={{ background: "rgba(245,90,74,0.12)", color: bx.coral }}>{l.log_type}</span>
                    <span className="text-xs" style={{ color: bx.textMuted }}>{new Date(l.created_at).toLocaleDateString()} · by {l.author_name}</span>
                  </div>
                  <div className="text-sm" style={{ color: bx.text }}>{l.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(tab === "Assignments" || tab === "Time off") && (
          <div className="mt-6 rounded-md border p-12 text-center text-sm" style={{ ...bx.cardStyle, color: bx.textDim }}>Nothing here yet.</div>
        )}
      </div>

      {logOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-md border p-6 relative" style={bx.cardStyle}>
            <button onClick={() => setLogOpen(false)} className="absolute top-4 right-4 text-[#7a7a7e] hover:text-white"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-bold" style={{ color: bx.text }}>Add log</h2>
            <div className="mt-4 space-y-3">
              <select value={logType} onChange={e => setLogType(e.target.value)} className="w-full h-10 px-3 rounded-md border text-sm outline-none" style={{ background: "#242427", borderColor: "#2e2e34", color: bx.text }}>
                <option value="note">Note</option>
                <option value="promotion">Promotion</option>
                <option value="warning">Warning</option>
                <option value="demotion">Demotion</option>
              </select>
              <textarea value={logContent} onChange={e => setLogContent(e.target.value)} placeholder="Write details..." className="w-full min-h-[100px] p-3 rounded-md border text-sm outline-none resize-y" style={{ background: "#242427", borderColor: "#2e2e34", color: bx.text }} />
              <button onClick={addLog} className="h-10 w-full rounded-md text-sm font-semibold" style={{ background: "#0d4f4f", color: "#7fd9d9" }}>Add log</button>
            </div>
          </div>
        </div>
      )}
    </BargainsShell>
  );
}
