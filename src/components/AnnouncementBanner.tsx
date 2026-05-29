import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, X, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
}

export function AnnouncementBanner() {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Announcement[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!workspaceId || !user) return;
    let cancelled = false;

    const load = async () => {
      const [{ data: pinned }, { data: dismissed }] = await Promise.all([
        supabase
          .from("announcements")
          .select("id, title, content, author_name, created_at")
          .eq("workspace_id", workspaceId)
          .eq("pinned", true)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("dismissed_announcements")
          .select("announcement_id")
          .eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const dismissedIds = new Set((dismissed || []).map((d: any) => d.announcement_id));
      setItems((pinned || []).filter((a) => !dismissedIds.has(a.id)));
      setIndex(0);
    };

    load();
    return () => { cancelled = true; };
  }, [workspaceId, user?.id]);

  const dismiss = async (id: string) => {
    if (!user) return;
    setItems((prev) => prev.filter((a) => a.id !== id));
    setIndex(0);
    await supabase
      .from("dismissed_announcements")
      .insert({ user_id: user.id, announcement_id: id });
  };

  if (items.length === 0) return null;
  const current = items[index];
  if (!current) return null;

  return (
    <div
      className="mb-5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-1"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
        <Megaphone className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-bold text-foreground text-sm truncate">{current.title}</p>
          <span className="text-[10px] text-muted-foreground shrink-0">
            by {current.author_name}
          </span>
          {items.length > 1 && (
            <span className="text-[10px] text-muted-foreground/70 ml-auto shrink-0">
              {index + 1}/{items.length}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
          {current.content}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => navigate(`/w/${workspaceId}/wall`)}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Read more <ChevronRight className="w-3 h-3" />
          </button>
          {items.length > 1 && (
            <button
              onClick={() => setIndex((i) => (i + 1) % items.length)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Next
            </button>
          )}
        </div>
      </div>
      <button
        onClick={() => dismiss(current.id)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0"
        aria-label="Dismiss"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
