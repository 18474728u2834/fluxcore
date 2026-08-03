import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { toast } from "sonner";
import { Loader2, Radio, Send, X, Search } from "lucide-react";
import { bx } from "@/bargains/Shell";

interface Member { id: string; roblox_username: string; discord_user_id?: string | null; }

interface Props {
  workspaceId: string;
  session: { id: string; title: string; route_number?: string | null };
  occursAt: Date;
  onClose: () => void;
}

export function CrewDispatchDialog({ workspaceId, session, occursAt, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({}); // username -> crew role
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [discordIds, setDiscordIds] = useState<Record<string, string>>({}); // member id -> discord user id

  useEffect(() => {
    (async () => {
      const [{ data: ms }, { data: ws }, { data: existing }, { data: auth }] = await Promise.all([
        supabase.from("workspace_members").select("id, roblox_username, discord_user_id")
          .eq("workspace_id", workspaceId).order("roblox_username"),
        supabase.from("workspaces").select("dispatch_roles").eq("id", workspaceId).maybeSingle(),
        supabase.from("session_crew_assignments").select("roblox_username, crew_role")
          .eq("session_id", session.id).eq("occurrence_at", occursAt.toISOString()),
        supabase.auth.getUser(),
      ]);
      let list = ((ms as any[]) || []) as Member[];

      // The workspace owner may not have a member row — let them assign themselves too.
      const uid = auth?.user?.id;
      if (uid) {
        const { data: me } = await supabase.from("verified_users")
          .select("roblox_username, discord_user_id").eq("user_id", uid).maybeSingle();
        const myName = (me as any)?.roblox_username as string | undefined;
        if (myName && !list.some(m => m.roblox_username.toLowerCase() === myName.toLowerCase())) {
          list = [{ id: `self:${uid}`, roblox_username: myName, discord_user_id: (me as any)?.discord_user_id || null }, ...list];
        }
      }

      setMembers(list);
      setDiscordIds(Object.fromEntries(list.map(m => [m.id, m.discord_user_id || ""])));
      const dr = (ws as any)?.dispatch_roles;
      setRoles(Array.isArray(dr) && dr.length ? dr : ["Pilot", "First Officer", "Cabin Crew", "Ground Crew"]);
      const map: Record<string, string> = {};
      for (const row of ((existing as any[]) || [])) map[row.roblox_username] = row.crew_role;
      setPicks(map);
      setLoading(false);
    })();
  }, [workspaceId, session.id, occursAt]);


  const saveDiscordId = async (m: Member) => {
    const value = (discordIds[m.id] || "").trim();
    if (value === (m.discord_user_id || "")) return;
    if (m.id.startsWith("self:")) {
      // No member row (owner) — keep the ID for this dispatch only.
      setMembers(ms => ms.map(x => x.id === m.id ? { ...x, discord_user_id: value || null } : x));
      return;
    }
    const { error } = await supabase.from("workspace_members")
      .update({ discord_user_id: value || null } as any).eq("id", m.id);
    if (error) { toast.error("Couldn't save that Discord ID"); return; }
    setMembers(ms => ms.map(x => x.id === m.id ? { ...x, discord_user_id: value || null } : x));
    toast.success(`Discord ID saved for ${m.roblox_username}`);
  };



  const setPick = async (m: Member, role: string) => {
    if (!role) {
      setPicks(p => { const n = { ...p }; delete n[m.roblox_username]; return n; });
      await supabase.from("session_crew_assignments").delete()
        .eq("session_id", session.id)
        .eq("occurrence_at", occursAt.toISOString())
        .eq("roblox_username", m.roblox_username);
      return;
    }
    setPicks(p => ({ ...p, [m.roblox_username]: role }));
  };

  const dispatchNow = async () => {
    const assignments = members
      .filter(m => picks[m.roblox_username])
      .map(m => ({ roblox_username: m.roblox_username, member_id: m.id, crew_role: picks[m.roblox_username] }));
    if (!assignments.length) { toast.error("Assign at least one crew position first"); return; }

    setSending(true);
    const { data, error } = await supabase.functions.invoke("dispatch-crew", {
      body: { workspace_id: workspaceId, session_id: session.id, occurrence_at: occursAt.toISOString(), assignments, notify: true },
    });
    setSending(false);

    if (error) { toast.error("Dispatch failed. Check your permissions and try again."); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }

    const results: any[] = (data as any)?.results || [];
    const notified = results.filter(r => r.notified).length;
    toast.success(`Crew dispatched — ${results.length} assigned, ${notified} DM'd on Discord`);
    onClose();
  };

  const shown = members.filter(m => m.roblox_username.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-md border p-6 relative max-h-[88vh] overflow-y-auto" style={bx.cardStyle}>
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: bx.textDim }} aria-label="Close">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4" style={{ color: bx.coral }} />
          <h2 className="text-lg font-bold" style={{ color: bx.text }}>Crew dispatch</h2>
        </div>
        <p className="text-xs mt-1" style={{ color: bx.textDim }}>
          {session.route_number ? `${session.route_number} · ` : ""}{session.title} — {occursAt.toLocaleString()}
        </p>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: bx.coral }} /></div>
        ) : (
          <>
            <div className="relative mt-4">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: bx.textMuted }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members"
                className="w-full h-9 pl-8 pr-3 rounded-md text-sm outline-none"
                style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
            </div>

            <div className="mt-3 space-y-1.5">
              {shown.length === 0 && (
                <p className="text-xs py-6 text-center" style={{ color: bx.textMuted }}>No members found.</p>
              )}
              {shown.map(m => (
                <div key={m.id} className="py-1.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <RobloxAvatar username={m.roblox_username} className="w-7 h-7 rounded-md flex-shrink-0" />
                    <span className="text-xs font-medium flex-1 truncate" style={{ color: bx.text }}>{m.roblox_username}</span>
                    <select
                      value={picks[m.roblox_username] || ""}
                      onChange={(e) => setPick(m, e.target.value)}
                      className="h-8 px-2 rounded-md text-xs outline-none"
                      style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }}>
                      <option value="">Unassigned</option>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {picks[m.roblox_username] && (
                    <input
                      value={discordIds[m.id] ?? ""}
                      onChange={(e) => setDiscordIds(d => ({ ...d, [m.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                      onBlur={() => saveDiscordId(m)}
                      placeholder="Discord user ID (optional)"
                      inputMode="numeric"
                      className="w-full h-8 px-2 ml-9 rounded-md text-[11px] outline-none"
                      style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text, width: "calc(100% - 2.25rem)" }} />
                  )}
                </div>
              ))}
            </div>

            <button onClick={dispatchNow} disabled={sending}
              className="mt-5 w-full h-10 rounded-md text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: bx.coral, color: "#fff" }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Dispatch & notify on Discord
            </button>
            <p className="text-[11px] mt-2 text-center" style={{ color: bx.textMuted }}>
              A member's own linked Discord account is used first. Otherwise the Discord ID you set here is DM'd, as long as that user shares the server the Fluxcore bot is in.
            </p>

          </>
        )}
      </div>
    </div>
  );
}

export default CrewDispatchDialog;
