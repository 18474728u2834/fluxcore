import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  roblox_group_id: string | null;
  verified_official: boolean;
  premium: boolean;
}

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;

export function WorkspaceMarquee() {
  const [items, setItems] = useState<(Workspace & { icon?: string })[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("public-workspaces");
        if (error || !data?.workspaces) return;
        const list: Workspace[] = data.workspaces;
        if (!alive || list.length === 0) return;

        // Fetch group icons in one batched request
        const groupIds = list.map((w) => w.roblox_group_id).filter(Boolean).join(",");
        let iconMap: Record<string, string> = {};
        try {
          const r = await fetch(
            `${SUPABASE_URL}/functions/v1/roblox-group-icon?groupIds=${groupIds}`,
          );
          const j = await r.json();
          for (const it of j?.data || []) {
            if (it?.targetId && it?.imageUrl) iconMap[String(it.targetId)] = it.imageUrl;
          }
        } catch {}

        if (!alive) return;
        setItems(
          list.map((w) => ({
            ...w,
            icon: w.roblox_group_id ? iconMap[w.roblox_group_id] : undefined,
          })),
        );
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  // Duplicate the list so the marquee loops seamlessly
  const loop = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden py-2"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div className="flex gap-3 animate-marquee whitespace-nowrap" style={{ width: "max-content" }}>
        {loop.map((w, i) => (
          <div
            key={`${w.id}-${i}`}
            className="group flex items-center gap-2.5 px-4 py-2 rounded-full border border-border/40 bg-card/40 backdrop-blur-sm hover:border-primary/40 hover:bg-card/60 transition-all shrink-0"
          >
            {w.icon ? (
              <img
                src={w.icon}
                alt=""
                loading="lazy"
                className="w-6 h-6 rounded-md object-cover ring-1 ring-border/40"
              />
            ) : (
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary/40 to-violet-500/40 ring-1 ring-border/40" />
            )}
            <span className="text-[13px] font-semibold text-foreground/90">
              {w.name}
            </span>
            {w.verified_official && (
              <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
