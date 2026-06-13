import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "./useWorkspace";
import { useAuth } from "./useAuth";

export interface ActiveDepartment {
  id: string;
  slug: string;
  name: string;
  primary_color: string | null;
  icon: string | null;
  hero_image_url: string | null;
  description: string | null;
  isLead: boolean;
  isMember: boolean;
}

interface DepartmentContextValue {
  department: ActiveDepartment | null;
  loading: boolean;
  /**
   * Append department scoping to a Supabase query builder.
   * - Inside a department: filters by department_id.
   * - In the main workspace view: filters department_id IS NULL.
   */
  scope: <Q extends { eq: (...a: any) => any; is: (...a: any) => any }>(q: Q) => Q;
  /** Value to set on inserted rows so they belong to the active scope. */
  newRowDepartmentId: string | null;
}

const DepartmentContext = createContext<DepartmentContextValue>({
  department: null,
  loading: false,
  scope: (q) => q,
  newRowDepartmentId: null,
});

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const { deptSlug } = useParams<{ deptSlug: string }>();
  const { workspaceId, isOwner } = useWorkspace();
  const { user } = useAuth();
  const [department, setDepartment] = useState<ActiveDepartment | null>(null);
  const [loading, setLoading] = useState<boolean>(!!deptSlug);

  useEffect(() => {
    if (!deptSlug || !workspaceId) {
      setDepartment(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: d } = await supabase
        .from("departments")
        .select("id, name, slug, primary_color, icon, hero_image_url, description, workspace_id")
        .eq("workspace_id", workspaceId)
        .eq("slug", deptSlug)
        .maybeSingle();
      if (cancelled) return;
      if (!d) { setDepartment(null); setLoading(false); return; }

      let isLead = isOwner;
      let isMember = isOwner;
      if (!isOwner && user) {
        const { data: wm } = await supabase
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("user_id", user.id)
          .maybeSingle();
        const memberId = (wm as any)?.id;
        if (memberId) {
          const [{ data: dm }, { data: dl }] = await Promise.all([
            supabase.from("department_members").select("id").eq("department_id", (d as any).id).eq("member_id", memberId).maybeSingle(),
            supabase.from("department_leads").select("id").eq("department_id", (d as any).id).eq("member_id", memberId).maybeSingle(),
          ]);
          isMember = !!dm || !!dl;
          isLead = !!dl;
        }
      }

      if (cancelled) return;
      setDepartment({
        id: (d as any).id,
        slug: (d as any).slug,
        name: (d as any).name,
        primary_color: (d as any).primary_color,
        icon: (d as any).icon,
        hero_image_url: (d as any).hero_image_url,
        description: (d as any).description,
        isLead,
        isMember,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [deptSlug, workspaceId, isOwner, user?.id]);

  const value = useMemo<DepartmentContextValue>(() => {
    const deptId = department?.id ?? null;
    return {
      department,
      loading,
      newRowDepartmentId: deptId,
      scope: (q: any) => (deptId ? q.eq("department_id", deptId) : q.is("department_id", null)),
    };
  }, [department, loading]);

  return <DepartmentContext.Provider value={value}>{children}</DepartmentContext.Provider>;
}

export function useDepartment() {
  return useContext(DepartmentContext);
}
