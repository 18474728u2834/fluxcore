import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X, ClipboardList, Check } from "lucide-react";
import { bx } from "@/bargains/Shell";
import { useLexicon } from "@/hooks/useLexicon";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  workspaceId: string;
  session: { id: string; title: string; route_number?: string | null };
  occursAt: Date;
  onClose: () => void;
}

/**
 * Crew wishlist — staff tell the dispatcher whether they can attend a given
 * departure and which positions they'd like. The dispatcher still has the final
 * say; this is only a preference list.
 */
export function CrewWishlistDialog({ workspaceId, session, occursAt, onClose }: Props) {
  const { crew } = useLexicon(workspaceId);
  const { user, robloxUsername } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [availability, setAvailability] = useState<"available" | "maybe" | "unavailable">("available");
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      const [{ data: ws }, { data: mine }, { data: member }] = await Promise.all([
        supabase.from("workspaces").select("dispatch_roles").eq("id", workspaceId).maybeSingle(),
        supabase.from("session_crew_preferences" as any)
          .select("availability, preferred_roles, note")
          .eq("session_id", session.id)
          .eq("occurrence_at", occursAt.toISOString())
          .eq("user_id", user.id).maybeSingle(),
        supabase.from("workspace_members").select("id")
          .eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle(),
      ]);
      const dr = (ws as any)?.dispatch_roles;
      setRoles(Array.isArray(dr) && dr.length ? dr : (crew?.defaults ?? ["Pilot", "First Officer", "Cabin Crew", "Ground Crew"]));
      setMemberId((member as any)?.id ?? null);
      if (mine) {
        setAvailability(((mine as any).availability || "available") as any);
        setPicked(Array.isArray((mine as any).preferred_roles) ? (mine as any).preferred_roles : []);
        setNote((mine as any).note || "");
      }
      setLoading(false);
    })();
  }, [workspaceId, session.id, occursAt, user?.id]);

  const toggleRole = (r: string) =>
    setPicked(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  const save = async () => {
    if (!user || !robloxUsername) { toast.error("Verify your Roblox account first"); return; }
    setSaving(true);
    const { error } = await supabase.from("session_crew_preferences" as any).upsert({
      workspace_id: workspaceId,
      session_id: session.id,
      occurrence_at: occursAt.toISOString(),
      user_id: user.id,
      member_id: memberId,
      roblox_username: robloxUsername,
      availability,
      preferred_roles: availability === "unavailable" ? [] : picked,
      note: note.trim() || null,
    } as any, { onConflict: "session_id,occurrence_at,user_id" });
    setSaving(false);
    if (error) { toast.error("Couldn't save your preferences"); return; }
    toast.success("Sent to the dispatcher");
    onClose();
  };

  const OPTIONS: { key: typeof availability; label: string }[] = [
    { key: "available", label: "I can attend" },
    { key: "maybe", label: "Maybe" },
    { key: "unavailable", label: "Can't attend" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-md border p-6 relative max-h-[88vh] overflow-y-auto" style={bx.cardStyle}>
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: bx.textDim }} aria-label="Close">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4" style={{ color: bx.coral }} />
          <h2 className="text-lg font-bold" style={{ color: bx.text }}>Crew wishlist</h2>
        </div>
        <p className="text-xs mt-1" style={{ color: bx.textDim }}>
          {session.route_number ? `${session.route_number} · ` : ""}{session.title} — {occursAt.toLocaleString()}
        </p>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: bx.coral }} /></div>
        ) : (
          <>
            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>Availability</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {OPTIONS.map(o => (
                  <button key={o.key} onClick={() => setAvailability(o.key)}
                    className="h-9 rounded-md text-xs font-semibold border transition"
                    style={{
                      background: availability === o.key ? bx.coral : "#141416",
                      borderColor: availability === o.key ? bx.coral : bx.borderColor,
                      color: availability === o.key ? "#fff" : bx.textDim,
                    }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {availability !== "unavailable" && (
              <div className="mt-5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>
                  {crew?.positionsLabel ?? "Crew positions"} you'd like
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roles.map(r => {
                    const on = picked.includes(r);
                    return (
                      <button key={r} onClick={() => toggleRole(r)}
                        className="h-8 px-3 rounded-md text-xs font-medium border inline-flex items-center gap-1.5 transition"
                        style={{
                          background: on ? "#1f1f24" : "#141416",
                          borderColor: on ? bx.coral : bx.borderColor,
                          color: on ? bx.text : bx.textDim,
                        }}>
                        {on && <Check className="w-3 h-3" style={{ color: bx.coral }} />}{r}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] mt-2" style={{ color: bx.textMuted }}>
                  Pick as many as you're happy with — the dispatcher makes the final call.
                </p>
              </div>
            )}

            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: bx.textDim }}>Note (optional)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                placeholder="Anything the dispatcher should know"
                className="mt-1.5 w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
                style={{ background: "#141416", border: `1px solid ${bx.borderColor}`, color: bx.text }} />
            </div>

            <button onClick={save} disabled={saving}
              className="mt-5 w-full h-10 rounded-md text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: bx.coral, color: "#fff" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save preferences
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default CrewWishlistDialog;
