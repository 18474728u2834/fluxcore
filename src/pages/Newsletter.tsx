import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setError("Please enter a valid email.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: trimmed, source: "newsletter_page" } as any);
    setBusy(false);
    if (err && !/duplicate|unique/i.test(err.message)) {
      setError(err.message);
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card/40 backdrop-blur p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Fluxcore Newsletter</h1>
            <p className="text-xs text-muted-foreground">Occasional product updates. No spam.</p>
          </div>
        </div>

        {done ? (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="w-5 h-5" />
            You're subscribed. Thanks!
          </div>
        ) : (
          <form onSubmit={subscribe} className="space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Subscribe
            </Button>
            <p className="text-xs text-muted-foreground">
              You can unsubscribe any time using the link at the bottom of our emails.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
