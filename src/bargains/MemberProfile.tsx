import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BargainsShell, bx } from "./Shell";
import { n3 } from "./ShellV3";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { ArrowLeft, AlertTriangle, ExternalLink, Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useNexusConfig } from "@/hooks/useNexusConfig";
import { useNexusV3Trial } from "@/hooks/useNexusV3";
import { toast } from "sonner";

interface MemberData { id: string; user_id: string | null; roblox_username: string; roblox_user_id: string; role: string; verified: boolean; joined_at: string; birthday_month: number | null; birthday_day: number | null; }
interface MemberLog { id: string; log_type: string; content: string; author_name: string; created_at: string; }
interface ActivityEvent { id: string; event_type: string; created_at: string; event_data: any; }

const TABS = ["Details", "Activity", "Logbook", "Assignments", "Time off"] as const;
type Tab = typeof TABS[number];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function BMemberProfile() {
  const { memberId } = useParams<{ memberId: string }>();
  const { workspaceId, workspace, isOwner } = useWorkspace();
  const { user, robloxUsername } = useAuth();
  const { hasPermission } = usePermissions();
  const { config } = useNexusConfig(workspaceId);
  const { enabled: v3Enabled } = useNexusV3Trial(workspaceId);
  const navigate = useNavigate();
  const canManage = isOwner || hasPermission("manage_members");

  // Nexus UI 3.0 styling — glass cards, rounded corners, workspace accent.
  const v3 = config.version === "v3" && v3Enabled;
  const accent = workspace?.primary_color || "#2f74a8";
  const cardCls = v3 ? "rounded-2xl border" : "rounded-md border";
  const cardSt: any = v3 ? n3.cardStyle : bx.cardStyle;
  const text = v3 ? n3.text : bx.text;
  const textDim = v3 ? n3.textDim : bx.textDim;
  const textMuted = v3 ? n3.textMuted : bx.textMuted;
  const accentColor = v3 ? accent : bx.coral;
  const innerSt: any = v3
    ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }
    : { background: "#141416" };
  const avatarRound = v3 ? "rounded-2xl" : "rounded-md";
  const tabBorder = v3 ? "rgba(255,255,255,0.07)" : "#22222a";
  const actionBtn: any = v3
    ? { background: `${accent}26`, color: accent, border: `1px solid ${accent}55` }
    : { background: "#0d4f4f", color: "#7fd9d9" };
  const fieldSt: any = v3
    ? { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.09)", color: text }
    : { background: "#242427", borderColor: "#2e2e34", color: text };

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
      // Mirror promotion/demotion to the Roblox group via Open Cloud.
      if ((logType === "demotion" || logType === "promotion") && member) {
        const stepAction = logType === "demotion" ? "demote_one" : "promote_one";
        const res = await supabase.functions.invoke("roblox-rank", {
          body: { action: stepAction, workspace_id: workspaceId, roblox_user_id: member.roblox_user_id },
        });
        if (res.data?.success) {
          const newRoleName = res.data.to?.name as string | undefined;
          if (newRoleName) {
            await supabase.from("workspace_members").update({ role: newRoleName }).eq("id", member.id);
            setMember({ ...member, role: newRoleName });
          }
          toast.success(`Log added — ${logType === "demotion" ? "demoted" : "promoted"} to ${newRoleName || "new rank"}`);
        } else {
          toast.warning(`Log saved, but Roblox rank wasn't changed: ${res.data?.error || res.error?.message || "unknown error"}`);
        }
      } else {
        toast.success("Added");
      }
      setLogOpen(false); setLogContent("");
      const { data } = await supabase.from("member_logs").select("*").eq("member_id", memberId).order("created_at", { ascending: false });
      setLogs((data || []) as any);
    }
  };

  if (!member) return <BargainsShell><div className="text-sm" style={{ color: textDim }}>Loading…</div></BargainsShell>;

  const warnings = logs.filter(l => l.log_type === "warning").length;
  const birthday = member.birthday_month && member.birthday_day ? `${MONTHS[member.birthday_month - 1]} ${member.birthday_day}` : "Unknown";

  return (
    <BargainsShell>
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate(`/w/${workspaceId}/members`)} className="flex items-center gap-1.5 text-xs mb-5" style={{ color: textDim }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Members
        </button>

        {/* Header */}
        <div className="relative">
          {v3 && (
            <div className="absolute -inset-2 rounded-3xl blur-2xl opacity-20 pointer-events-none"
              style={{ background: `radial-gradient(50% 90% at 20% 0%, ${accent}, transparent 70%)` }} />
          )}
        <div className={`${cardCls} p-6 flex items-start gap-6 relative`} style={cardSt}>
          <RobloxAvatar username={member.roblox_username} userId={member.roblox_user_id} className={`w-28 h-28 ${avatarRound}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[2rem] font-bold tracking-[-0.03em] leading-none" style={{ color: text }}>{member.roblox_username}</h1>
              <a href={`https://www.roblox.com/users/${member.roblox_user_id}/profile`} target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100"><ExternalLink className="w-4 h-4" style={{ color: textDim }} /></a>
            </div>
            <div className="text-sm mt-1.5" style={{ color: textDim }}>{member.role}</div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-[11px] px-2.5 py-1 ${v3 ? "rounded-lg" : "rounded-md"} font-medium inline-flex items-center gap-1`} style={v3 ? { background: "rgba(255,255,255,0.05)", color: textDim } : { background: "#242427", color: textDim }}>
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
        </div>

        {/* Tabs */}
        <div className="border-b mt-6 flex gap-6" style={{ borderColor: tabBorder }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="pb-3 text-sm font-medium transition-colors"
              style={{
                color: tab === t ? text : textMuted,
                borderBottom: tab === t ? `2px solid ${accentColor}` : "2px solid transparent",
                marginBottom: "-1px",
              }}>{t}</button>
          ))}
        </div>

        {tab === "Details" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            <div className={`${cardCls} p-5`} style={cardSt}>
              <div className="text-sm font-bold mb-4" style={{ color: text }}>Directory profile</div>
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
                    <span className="font-semibold" style={{ color: text }}>{v}</span>
                    <span style={{ color: textMuted }}>· {k}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${cardCls} p-5`} style={cardSt}>
              <div className="text-sm font-bold mb-4" style={{ color: text }}>Quick stats</div>
              <div className="grid grid-cols-2 gap-3">
                <div className={v3 ? "rounded-xl p-4" : "rounded-md p-4"} style={innerSt}>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: text }}>{warnings}</div>
                  <div className="text-xs mt-1" style={{ color: textMuted }}>Warnings</div>
                </div>
                <div className={v3 ? "rounded-xl p-4" : "rounded-md p-4"} style={innerSt}>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: text }}>{activity.length}</div>
                  <div className="text-xs mt-1" style={{ color: textMuted }}>Events</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "Activity" && (
          <div className={`${cardCls} mt-6 overflow-hidden`} style={cardSt}>
            {activity.length === 0 ? (
              <div className="p-10 text-center text-sm" style={{ color: textDim }}>No activity recorded yet.</div>
            ) : activity.map((e, i) => (
              <div key={e.id} className="px-5 py-3 flex items-center gap-3" style={{ borderTop: i === 0 ? "none" : `1px solid ${tabBorder}` }}>
                <div className={v3 ? "w-2 h-2 rounded-full" : "w-2 h-2 rounded-md"} style={{ background: accentColor }} />
                <div className="flex-1 text-sm" style={{ color: text }}>{e.event_type}</div>
                <div className="text-xs" style={{ color: textMuted }}>{new Date(e.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "Logbook" && (
          <div className="mt-6 space-y-3">
            {canManage && (
              <button onClick={() => setLogOpen(true)} className={`h-9 px-4 ${v3 ? "rounded-xl" : "rounded-md"} text-xs font-semibold inline-flex items-center gap-1.5`} style={actionBtn}>
                <Plus className="w-3.5 h-3.5" /> Add log
              </button>
            )}
            <div className={`${cardCls} overflow-hidden`} style={cardSt}>
              {logs.length === 0 ? (
                <div className="p-10 text-center text-sm" style={{ color: textDim }}>No log entries yet.</div>
              ) : logs.map((l, i) => {
                const logPalette =
                  l.log_type === "promotion" ? { bg: "rgba(34,197,94,0.12)", color: bx.success, border: "rgba(34,197,94,0.3)" } :
                  l.log_type === "demotion" ? { bg: "rgba(245,90,74,0.12)", color: bx.coral, border: "rgba(245,90,74,0.3)" } :
                  l.log_type === "warning" ? { bg: "rgba(245,158,11,0.12)", color: bx.warning, border: "rgba(245,158,11,0.3)" } :
                  { bg: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "rgba(59,130,246,0.3)" };
                return (
                  <div key={l.id} className="p-4" style={{ borderTop: i === 0 ? "none" : `1px solid ${tabBorder}` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider" style={{ background: logPalette.bg, color: logPalette.color, border: `1px solid ${logPalette.border}` }}>{l.log_type}</span>
                      <span className="text-xs" style={{ color: textMuted }}>{new Date(l.created_at).toLocaleDateString()} · by {l.author_name}</span>
                      {canManage && (
                        <button
                          onClick={async () => {
                            if (!confirm("Remove this entry?")) return;
                            const { error } = await supabase.from("member_logs").delete().eq("id", l.id);
                            if (error) { alert("Failed to remove: " + error.message); return; }
                            setLogs(logs.filter((x) => x.id !== l.id));
                          }}
                          className="ml-auto text-[#7a7a7e] hover:text-[#f55a4a] transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-sm" style={{ color: text }}>{l.content}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(tab === "Assignments" || tab === "Time off") && (
          <div className={`mt-6 ${cardCls} p-12 text-center text-sm`} style={{ ...cardSt, color: textDim }}>Nothing here yet.</div>
        )}
      </div>

      {logOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className={`w-full max-w-md ${cardCls} p-6 relative`} style={cardSt}>
            <button onClick={() => setLogOpen(false)} className="absolute top-4 right-4 text-[#7a7a7e] hover:text-white"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-bold" style={{ color: text }}>Add log</h2>
            <div className="mt-4 space-y-3">
              <select value={logType} onChange={e => setLogType(e.target.value)} className={`w-full h-10 px-3 ${v3 ? "rounded-xl" : "rounded-md"} border text-sm outline-none`} style={fieldSt}>
                <option value="note">Note</option>
                <option value="promotion">Promotion</option>
                <option value="warning">Warning</option>
                <option value="demotion">Demotion</option>
              </select>
              <textarea value={logContent} onChange={e => setLogContent(e.target.value)} placeholder="Write details..." className={`w-full min-h-[100px] p-3 ${v3 ? "rounded-xl" : "rounded-md"} border text-sm outline-none resize-y`} style={fieldSt} />
              <button onClick={addLog} className={`h-10 w-full ${v3 ? "rounded-xl" : "rounded-md"} text-sm font-semibold`} style={actionBtn}>Add log</button>
            </div>
          </div>
        </div>
      )}
    </BargainsShell>
  );
}
