import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SessionRow {
  id: string;
  roblox_username: string;
  roblox_user_id: string;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number | null;
  message_count: number | null;
  idle_seconds: number | null;
  server_id: string | null;
  discarded: boolean | null;
}

function fmtDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function csvEscape(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function SessionManager() {
  const { workspaceId, isOwner } = useWorkspace();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SessionRow | null>(null);
  const [editJoin, setEditJoin] = useState("");
  const [editLeft, setEditLeft] = useState("");
  const [editDuration, setEditDuration] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("activity_sessions")
      .select("id, roblox_username, roblox_user_id, joined_at, left_at, duration_seconds, message_count, idle_seconds, server_id, discarded")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: false })
      .limit(500);
    setSessions((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  const exportCsv = () => {
    const headers = [
      "id", "username", "user_id", "joined_at", "left_at", "duration_seconds",
      "duration_minutes", "message_count", "idle_seconds", "server_id", "discarded",
    ];
    const rows = sessions.map((s) => [
      s.id,
      s.roblox_username,
      s.roblox_user_id,
      s.joined_at,
      s.left_at || "",
      s.duration_seconds ?? "",
      s.duration_seconds != null ? Math.round(s.duration_seconds / 60) : "",
      s.message_count ?? 0,
      s.idle_seconds ?? 0,
      s.server_id || "",
      s.discarded ? "yes" : "no",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxcore-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sessions.length} sessions`);
  };

  const exportEventsCsv = async () => {
    const { data } = await supabase
      .from("activity_events")
      .select("created_at, event_type, roblox_username, roblox_user_id, event_data")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(2000);
    const headers = ["created_at", "event_type", "username", "user_id", "data"];
    const rows = (data || []).map((e: any) => [
      e.created_at, e.event_type, e.roblox_username || "", e.roblox_user_id, JSON.stringify(e.event_data || {}),
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxcore-events-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} events`);
  };

  const openEdit = (s: SessionRow) => {
    setEditing(s);
    setEditJoin(fmtDateTimeLocal(s.joined_at));
    setEditLeft(fmtDateTimeLocal(s.left_at));
    setEditDuration(s.duration_seconds != null ? String(Math.round(s.duration_seconds / 60)) : "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const joinedIso = editJoin ? new Date(editJoin).toISOString() : editing.joined_at;
    const leftIso = editLeft ? new Date(editLeft).toISOString() : null;
    let duration = parseInt(editDuration);
    if (Number.isNaN(duration)) {
      duration = leftIso ? Math.max(0, Math.floor((new Date(leftIso).getTime() - new Date(joinedIso).getTime()) / 1000)) : 0;
    } else {
      duration = duration * 60;
    }
    const { error } = await supabase
      .from("activity_sessions")
      .update({ joined_at: joinedIso, left_at: leftIso, duration_seconds: duration })
      .eq("id", editing.id)
      .eq("workspace_id", workspaceId);
    if (error) {
      toast.error("Update failed: " + error.message);
    } else {
      toast.success("Session updated");
      setEditing(null);
      load();
    }
    setSaving(false);
  };

  const remove = async (s: SessionRow) => {
    if (!confirm(`Delete session for ${s.roblox_username}? This cannot be undone.`)) return;
    const { error } = await supabase.from("activity_sessions").delete().eq("id", s.id).eq("workspace_id", workspaceId);
    if (error) toast.error("Delete failed: " + error.message);
    else {
      toast.success("Session deleted");
      load();
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <Download className="w-3 h-3 mr-1" /> Export sessions CSV
        </Button>
        <Button variant="secondary" size="sm" onClick={exportEventsCsv}>
          <Download className="w-3 h-3 mr-1" /> Export events CSV
        </Button>
        <span className="text-xs text-muted-foreground">{sessions.length} sessions loaded (most recent 500)</span>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground">Manage Sessions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Owners can edit or delete sessions to fix tracker mistakes.</p>
        </div>
        <div className="divide-y divide-border/40 max-h-[480px] overflow-y-auto">
          {sessions.map((s) => {
            const dur = s.duration_seconds != null
              ? `${Math.floor(s.duration_seconds / 60)}m`
              : (!s.left_at ? "live" : "—");
            return (
              <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                    {s.roblox_username}
                    {s.discarded && <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">DISCARDED</span>}
                    {!s.left_at && !s.discarded && <span className="text-[9px] px-1.5 py-0.5 rounded bg-success/20 text-success">LIVE</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(s.joined_at).toLocaleString()} · {dur}
                  </p>
                </div>
                {isOwner && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(s)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
          {sessions.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No sessions recorded yet.</p>
          )}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit session — {editing?.roblox_username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Joined at</Label>
              <Input type="datetime-local" value={editJoin} onChange={(e) => setEditJoin(e.target.value)} className="bg-muted border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Left at (blank = still active)</Label>
              <Input type="datetime-local" value={editLeft} onChange={(e) => setEditLeft(e.target.value)} className="bg-muted border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration (minutes) — leave blank to auto-calculate</Label>
              <Input type="number" min={0} value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="bg-muted border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
            <Button variant="hero" size="sm" onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
