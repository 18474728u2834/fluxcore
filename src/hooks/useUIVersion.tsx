import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UIVersion = "classic" | "minimal" | "nexus";

interface UIVersionContextType {
  version: UIVersion;
  setVersion: (v: UIVersion) => Promise<void>;
  loading: boolean;
}

const UIVersionContext = createContext<UIVersionContextType | undefined>(undefined);

const LS_KEY = "fluxcore-ui-version";
const DEFAULT_VERSION: UIVersion = "classic";

function isValid(v: any): v is UIVersion {
  return v === "classic" || v === "minimal" || v === "nexus";
}

export function UIVersionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [version, setVersionState] = useState<UIVersion>(() => {
    if (typeof window === "undefined") return DEFAULT_VERSION;
    const stored = localStorage.getItem(LS_KEY);
    return isValid(stored) ? stored : DEFAULT_VERSION;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-ui", version);
    localStorage.setItem(LS_KEY, version);
  }, [version]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const stored = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (isValid(stored)) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    supabase
      .from("user_preferences")
      .select("ui_version")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (isValid(data?.ui_version)) {
          setVersionState(data!.ui_version as UIVersion);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const setVersion = useCallback(
    async (v: UIVersion) => {
      setVersionState(v);
      try { localStorage.setItem(LS_KEY, v); } catch {}
      if (!user) return;
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, ui_version: v }, { onConflict: "user_id" });
    },
    [user]
  );

  return (
    <UIVersionContext.Provider value={{ version, setVersion, loading }}>
      {children}
    </UIVersionContext.Provider>
  );
}

export function useUIVersion() {
  const ctx = useContext(UIVersionContext);
  if (!ctx) throw new Error("useUIVersion must be used within UIVersionProvider");
  return ctx;
}
