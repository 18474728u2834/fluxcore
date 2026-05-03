import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UIVersion = "classic" | "minimal";

interface UIVersionContextType {
  version: UIVersion;
  setVersion: (v: UIVersion) => Promise<void>;
  loading: boolean;
}

const UIVersionContext = createContext<UIVersionContextType | undefined>(undefined);

const LS_KEY = "fluxcore-ui-version";

export function UIVersionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [version, setVersionState] = useState<UIVersion>(() => {
    if (typeof window === "undefined") return "classic";
    return (localStorage.getItem(LS_KEY) as UIVersion) || "classic";
  });
  const [loading, setLoading] = useState(false);

  // Apply to <html> data attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-ui", version);
    localStorage.setItem(LS_KEY, version);
  }, [version]);

  // Load from DB when user logs in
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    supabase
      .from("user_preferences")
      .select("ui_version")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data?.ui_version === "classic" || data?.ui_version === "minimal") {
          setVersionState(data.ui_version);
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
