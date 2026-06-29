import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [step, setStep] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_form" as any, { _form_id: formId });
      if (error) console.error("get_public_form", error);
      setForm(error ? null : data);
      setLoading(false);
    })();
  }, [formId]);

  const questions: Question[] = useMemo(() => (form?.questions || []) as Question[], [form]);
  const total = questions.length;
  const current = questions[step];

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

  const canAdvance = () => {
    if (!current) return false;
    if (current.required && !(answers[current.id] || "").trim()) {
      toast.error(`"${current.label}" is required`);
      return false;
    }
    return true;
  };

  const next = () => { if (canAdvance()) setStep(s => Math.min(s + 1, total - 1)); };
  const back = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    for (const q of questions) {
      if (q.required && !(answers[q.id] || "").trim()) {
        toast.error(`"${q.label}" is required`);
        // jump to the missing one
        const idx = questions.findIndex(x => x.id === q.id);
        if (idx >= 0) setStep(idx);
        return;
      }
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
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
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

        {!verified ? (
          <div className="glass rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-sm">Identify yourself</h2>
            <div className="flex gap-2">
              <Input placeholder="Your Roblox username" value={robloxUsername} onChange={e => setRobloxUsername(e.target.value)} />
              <Button onClick={verifyRoblox} disabled={verifying}>{verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}</Button>
            </div>
          </div>
        ) : (
          <div className="glass rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Question {step + 1} of {total}</span>
              <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {robloxUsername}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / Math.max(1, total)) * 100}%` }} />
            </div>

            {current && (
              <div className="space-y-2">
                <label className="text-base font-semibold block">
                  {current.label}{current.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {current.help_text && <p className="text-xs text-muted-foreground">{current.help_text}</p>}
                {current.type === "long_text" ? (
                  <Textarea
                    autoFocus
                    value={answers[current.id] || ""}
                    onChange={e => setAnswers({ ...answers, [current.id]: e.target.value })}
                    className="min-h-[140px]"
                  />
                ) : current.type === "choice" ? (
                  <select
                    autoFocus
                    className="w-full bg-background border border-border rounded-md h-10 px-2 text-sm"
                    value={answers[current.id] || ""}
                    onChange={e => setAnswers({ ...answers, [current.id]: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {current.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input
                    autoFocus
                    type={current.type === "age" ? "number" : "text"}
                    value={answers[current.id] || ""}
                    onChange={e => setAnswers({ ...answers, [current.id]: e.target.value })}
                  />
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={back} disabled={step === 0}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              {step < total - 1 ? (
                <Button onClick={next}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
              ) : (
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit application"}
                </Button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">You can go back to any previous question at any time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
