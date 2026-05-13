import { useEffect, useState, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Ban, LifeBuoy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type BlacklistEntry = { reason: string | null; created_at: string };

export function BlacklistGate({ children }: { children: ReactNode }) {
  const { user, loading, robloxUserId, signOut } = useAuth();
  const location = useLocation();
  const [entry, setEntry] = useState<BlacklistEntry | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    if (loading) return;
    if (!user || !robloxUserId) {
      setEntry(null);
      setChecked(true);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("fluxcore_blacklist")
        .select("reason, created_at")
        .eq("roblox_user_id", robloxUserId)
        .maybeSingle();
      if (!alive) return;
      setEntry((data as BlacklistEntry) || null);
      setChecked(true);
    })();
    return () => { alive = false; };
  }, [user, loading, robloxUserId]);

  if (!checked || !entry) return <>{children}</>;

  // Allow only support-related routes (under HashRouter the path is in location.pathname)
  const allowed = ["/support", "/terms", "/privacy", "/login", "/auth/callback"];
  if (allowed.some((p) => location.pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-6 rounded-2xl border border-destructive/30 bg-card/40 backdrop-blur p-8">
        <div className="w-14 h-14 mx-auto rounded-full bg-destructive/15 flex items-center justify-center">
          <Ban className="w-7 h-7 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Blacklisted from Fluxcore &amp; RetailPro</h1>
          <p className="text-sm text-muted-foreground">
            Your Roblox account has been banned from using the Fluxcore platform.
            You no longer have access to any workspace, dashboard, or feature.
          </p>
        </div>

        {entry.reason && (
          <div className="text-left rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Reason</div>
            <div className="text-sm">{entry.reason}</div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Think this is wrong? Open a support ticket and a Fluxcore staff member will review your case.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild className="gap-2">
            <Link to="/support">
              <LifeBuoy className="w-4 h-4" />
              Open a support ticket
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => signOut()}>
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Blacklisted on {new Date(entry.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
