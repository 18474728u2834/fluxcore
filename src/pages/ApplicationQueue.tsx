import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

interface App {
  id: string;
  roblox_user_id: string;
  roblox_username: string;
  answers: any;
  auto_score: number;
  status: "pending" | "accepted" | "denied";
  review_note: string | null;
  created_at: string;
}

export default function ApplicationQueue() {
  const { formId } = useParams();
  const { workspaceId } = useWorkspace();
  const { hasPermission, isOwner } = usePermissions();
  const canReview = isOwner || hasPermission("manage_applications");
  const [apps, setApps] = useState<App[]>([]);
  const [filter, setFilter] = useState<"pending" | "accepted" | "denied">("pending");
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!formId) return;
    const { data: f } = await supabase.from("application_forms" as any).select("*").eq("id", formId).maybeSingle();
    setForm(f);
    const { data } = await supabase.from("applications" as any)
      .select("*").eq("form_id", formId).eq("status", filter).order("created_at", { ascending: false });
    setApps((data as any) || []);
  };

  useEffect(() => { load(); }, [formId, filter]);

  const review = async (id: string, status: "accepted" | "denied", note: string, applicant: App) => {
    setBusy(id);
    const { error } = await supabase.from("applications" as any)
      .update({ status, review_note: note, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); setBusy(null); return; }

    if (status === "accepted" && form?.auto_rank_on_accept && form?.target_role_id) {
      try {
        await supabase.functions.invoke("roblox-rank", {
          body: { workspace_id: workspaceId, action: "promote", target_username: applicant.roblox_username, target_role_id: form.target_role_id },
        });
      } catch (e: any) {
        toast.error("Auto-rank failed: " + e.message);
      }
    }
    if (form?.notify_webhook) {
      try {
        await fetch(form.notify_webhook, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: `Application ${status}: **${applicant.roblox_username}** for *${form.title}*` }),
        });
      } catch {}
    }
    toast.success(`Application ${status}`);
    setBusy(null);
    load();
  };

  return (
    <DashboardLayout title="Application Queue">
      <div className="max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold">{form?.title || "Application Queue"}</h1>
        <div className="flex gap-2">
          {(["pending", "accepted", "denied"] as const).map(s => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "secondary"} onClick={() => setFilter(s)}>{s}</Button>
          ))}
        </div>
        {apps.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center text-sm text-muted-foreground">No {filter} applications.</div>
        ) : apps.map(a => <AppCard key={a.id} app={a} onReview={review} busy={busy === a.id} canReview={canReview} />)}
      </div>
    </DashboardLayout>
  );
}

function AppCard({ app, onReview, busy, canReview }: { app: App; onReview: (id: string, status: "accepted" | "denied", note: string, a: App) => void; busy: boolean; canReview: boolean }) {
  const [note, setNote] = useState("");
  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{app.roblox_username} <span className="text-xs text-muted-foreground">#{app.roblox_user_id}</span></p>
          <p className="text-xs text-muted-foreground">Score: {app.auto_score} · {new Date(app.created_at).toLocaleString()}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{app.status}</span>
      </div>
      <div className="space-y-2 text-sm">
        {Object.entries(app.answers || {}).map(([k, v]) => (
          <div key={k} className="border-l-2 border-primary/40 pl-3">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="whitespace-pre-wrap">{String(v)}</p>
          </div>
        ))}
      </div>
      {app.status === "pending" && canReview && (
        <div className="space-y-2">
          <Textarea placeholder="Review note (optional)" value={note} onChange={e => setNote(e.target.value)} className="min-h-[60px]" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onReview(app.id, "accepted", note, app)} disabled={busy}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Accept
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onReview(app.id, "denied", note, app)} disabled={busy}>
              <X className="w-3 h-3 mr-1" /> Deny
            </Button>
          </div>
        </div>
      )}
      {app.review_note && <p className="text-xs text-muted-foreground italic">Note: {app.review_note}</p>}
    </div>
  );
}
