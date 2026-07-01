import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  robloxUsername: string | null;
  robloxUserId: string | null;
  signOut: () => Promise<void>;
  setSessionFromToken: (tokenHash: string, email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_INIT_TIMEOUT_MS = 8_000;

function getCachedSessionFromStorage(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(import.meta.env.VITE_SUPABASE_URL);
    const projectRef = url.hostname.split(".")[0];
    const raw = window.localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const cached = parsed?.currentSession ?? parsed?.session ?? parsed;
    return cached?.access_token && cached?.user ? (cached as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const applySession = (nextSession: Session | null) => {
      if (!alive) return;
      setSession((prev) => (prev?.access_token === nextSession?.access_token ? prev : nextSession));
      setUser((prev) => {
        const nextUser = nextSession?.user ?? null;
        if (prev?.id === nextUser?.id) return prev;
        return nextUser;
      });
      setLoading(false);
    };

    const initTimeout = window.setTimeout(() => {
      // Mobile browsers can leave auth restoration waiting forever after app wake.
      // Fall back to the persisted session so protected pages don't spin forever.
      applySession(getCachedSessionFromStorage());
    }, AUTH_INIT_TIMEOUT_MS);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        window.clearTimeout(initTimeout);
        applySession(session);
      })
      .catch(() => {
        window.clearTimeout(initTimeout);
        applySession(getCachedSessionFromStorage());
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Skip no-op updates (TOKEN_REFRESHED with same user) so downstream
      // effects that depend on `user` don't re-run on every token refresh.
      applySession(nextSession);
    });

    return () => {
      alive = false;
      window.clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const robloxUsername = user?.user_metadata?.roblox_username ?? null;
  const robloxUserId = user?.user_metadata?.roblox_user_id ?? null;

  const setSessionFromToken = async (tokenHash: string, email: string) => {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, robloxUsername, robloxUserId, signOut, setSessionFromToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
