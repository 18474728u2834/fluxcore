import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string; label: string; help_text: string | null;
  type: "short_text" | "long_text" | "choice" | "roblox_username" | "age" | "timezone";
  options: string[]; required: boolean;
}

export default function Apply() {
  const { formId } = useParams();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [robloxUsername, setRobloxUsername] = useState("");
  const [robloxUserId, setRobloxUserId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_public_form" as any, { _form_id: formId });
      if (error || !data) { setForm(null); setLoading(false); return; }
      setForm(data);
      setLoading(false);
    })();
  }, [formId]);

  const verifyRoblox = async () => {
    if (!robloxUsername.trim()) return;
    setVerifying(true);
    try {
      const res = await fetch(`https://users.roblox.com/v1/usernames/users`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [robloxUsername.trim()], excludeBannedUsers: true }),
      });
      const j = await res.json();
      const u = j.data?.[0];
      if (!u) { toast.error("Roblox user not found"); setVerifying(false); return; }
      setRobloxUserId(String(u.id));
      setRobloxUsername(u.name);
      setVerified(true);
      toast.success("Identified as " + u.name);
    } catch {
      toast.error("Couldn't reach Roblox. Try again.");
    }
    setVerifying(false);
  };

  const submit = async () => {
    if (!verified) { toast.error("Verify your Roblox username first."); return; }
    for (const q of (form.questions as Question[])) {
      if (q.required && !answers[q.id]) { toast.error(`"${q.label}" is required`); return; }
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_application" as any, {
      _form_id: formId, _roblox_user_id: robloxUserId, _roblox_username: robloxUsername, _answers: answers,
    });
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    setDone(String(data));
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!form) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass rounded-xl p-10 text-center max-w-md">
        <h1 className="text-xl font-bold mb-2">Form not available</h1>
        <p className="text-sm text-muted-foreground">This application form is closed or doesn't exist.</p>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="glass rounded-xl p-10 text-center max-w-md space-y-3">
        <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
        <h1 className="text-xl font-bold">Application submitted</h1>
        <p className="text-sm text-muted-foreground">Reference: <code className="text-primary">{done.slice(0, 8)}</code>. The team will review your application soon.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-3xl font-bold">{form.title}</h1>
          {form.description && <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{form.description}</p>}
        </div>

        <div className="glass rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-sm">Identify yourself</h2>
          <div className="flex gap-2">
            <Input placeholder="Your Roblox username" value={robloxUsername} disabled={verified} onChange={e => setRobloxUsername(e.target.value)} />
            {!verified && <Button onClick={verifyRoblox} disabled={verifying}>{verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}</Button>}
            {verified && <span className="text-sm text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Verified</span>}
          </div>
        </div>

        {verified && (
          <div className="glass rounded-xl p-5 space-y-4">
            {(form.questions as Question[]).map(q => (
              <div key={q.id} className="space-y-1.5">
                <label className="text-sm font-medium">{q.label}{q.required && <span className="text-destructive ml-1">*</span>}</label>
                {q.help_text && <p className="text-xs text-muted-foreground">{q.help_text}</p>}
                {q.type === "long_text" ? (
                  <Textarea value={answers[q.id] || ""} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} className="min-h-[100px]" />
                ) : q.type === "choice" ? (
                  <select className="w-full bg-background border border-border rounded-md h-9 px-2 text-sm" value={answers[q.id] || ""} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}>
                    <option value="">— Select —</option>
                    {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input type={q.type === "age" ? "number" : "text"} value={answers[q.id] || ""} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
                )}
              </div>
            ))}
            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit application"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
