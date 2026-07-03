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

// Only Nexus UI is supported. Legacy classic/minimal have been removed.
export function UIVersionProvider({ children }: { children: ReactNode }) {
  const version: UIVersion = "nexus";
  const setVersion = useCallback(async (_v: UIVersion) => {}, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-ui", "nexus");
    try { localStorage.setItem("fluxcore-ui-version", "nexus"); } catch {}
  }, []);

  return (
    <UIVersionContext.Provider value={{ version, setVersion, loading: false }}>
      {children}
    </UIVersionContext.Provider>
  );
}

export function useUIVersion() {
  const ctx = useContext(UIVersionContext);
  if (!ctx) throw new Error("useUIVersion must be used within UIVersionProvider");
  return ctx;
}
