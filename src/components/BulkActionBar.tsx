import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, Trash2, AlertTriangle, ShieldAlert, ShieldCheck, Tag } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type BulkAction = "promote" | "demote" | "assign_role" | "warn" | "remove";

interface Role { id: string; name: string; color: string }

interface Props {
  selectedCount: number;
  roles: Role[];
  canManage: boolean;
  onClear: () => void;
  onRun: (action: BulkAction, payload?: { roleId?: string; reason?: string }) => Promise<void>;
}

export function BulkActionBar({ selectedCount, roles, canManage, onClear, onRun }: Props) {
  const [confirm, setConfirm] = useState<BulkAction | null>(null);
  const [running, setRunning] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [reason, setReason] = useState("");

  if (selectedCount === 0) return null;

  const run = async (action: BulkAction, payload?: any) => {
    setRunning(true);
    try { await onRun(action, payload); } finally {
      setRunning(false);
      setConfirm(null);
      setAssignOpen(false);
      setWarnOpen(false);
      setReason("");
      setRoleId("");
    }
  };

  const destructive = confirm === "remove";

  return (
    <>
      <div className="sticky bottom-4 z-30 mx-auto max-w-3xl">
        <div className="glass border border-primary/40 rounded-xl shadow-2xl shadow-primary/10 px-4 py-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground mr-1">
            {selectedCount} selected
          </span>
          {canManage && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={running}
                onClick={() => setConfirm("promote")}>
                <ShieldCheck className="w-3 h-3 mr-1" /> Promote
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={running}
                onClick={() => setConfirm("demote")}>
                <ShieldAlert className="w-3 h-3 mr-1" /> Demote
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={running || roles.length === 0}
                onClick={() => setAssignOpen(true)}>
                <Tag className="w-3 h-3 mr-1" /> Assign Role
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={running}
                onClick={() => setWarnOpen(true)}>
                <AlertTriangle className="w-3 h-3 mr-1" /> Warn
              </Button>
              <Button size="sm" variant="destructive" className="h-8 text-xs" disabled={running}
                onClick={() => setConfirm("remove")}>
                <Trash2 className="w-3 h-3 mr-1" /> Remove
              </Button>
            </>
          )}
          <div className="flex-1" />
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClear} disabled={running}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
          {running && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>
      </div>

      <AlertDialog open={!!confirm && confirm !== "assign_role" && confirm !== "warn"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="glass border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "promote" && `Promote ${selectedCount} member${selectedCount === 1 ? "" : "s"}?`}
              {confirm === "demote" && `Demote ${selectedCount} member${selectedCount === 1 ? "" : "s"}?`}
              {confirm === "remove" && `Remove ${selectedCount} member${selectedCount === 1 ? "" : "s"} from this workspace?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "remove"
                ? "They'll lose access immediately. You can re-invite them later."
                : "This will move each member one step in their Roblox group rank."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={running}
              onClick={(e) => { e.preventDefault(); confirm && run(confirm); }}
              className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {running && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="glass border-border/40 max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign role to {selectedCount} member{selectedCount === 1 ? "" : "s"}</DialogTitle>
          </DialogHeader>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Pick a workspace role" /></SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                    {r.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)} disabled={running}>Cancel</Button>
            <Button onClick={() => run("assign_role", { roleId })} disabled={running || !roleId}>
              {running && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={warnOpen} onOpenChange={setWarnOpen}>
        <DialogContent className="glass border-border/40 max-w-sm">
          <DialogHeader>
            <DialogTitle>Warn {selectedCount} member{selectedCount === 1 ? "" : "s"}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for warning (visible on member profile)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-muted border-border min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWarnOpen(false)} disabled={running}>Cancel</Button>
            <Button onClick={() => run("warn", { reason: reason.trim() })} disabled={running || !reason.trim()}>
              {running && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Issue warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
