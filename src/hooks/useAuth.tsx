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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Skip no-op updates (TOKEN_REFRESHED with same user) so downstream
      // effects that depend on `user` don't re-run on every token refresh.
      setSession((prev) => (prev?.access_token === nextSession?.access_token ? prev : nextSession));
      setUser((prev) => {
        const nextUser = nextSession?.user ?? null;
        if (prev?.id === nextUser?.id) return prev;
        return nextUser;
      });
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
