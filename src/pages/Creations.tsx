import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import { ArrowLeft, Download, ImageIcon, Loader2 } from "lucide-react";

type Creation = {
  id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
};

const prettySize = (bytes?: number | null) => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

export default function Creations() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Creation[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Creations · Fluxcore";
    (async () => {
      const { data } = await supabase
        .from("creations")
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      const rows = (data as Creation[]) || [];
      setItems(rows);
      const map: Record<string, string> = {};
      await Promise.all(rows.map(async (r) => {
        if (!r.image_path) return;
        const { data: s } = await supabase.storage.from("creations").createSignedUrl(r.image_path, 3600);
        if (s?.signedUrl) map[r.id] = s.signedUrl;
      }));
      setCovers(map);
      setLoading(false);
    })();
  }, []);

  const download = async (c: Creation) => {
    if (!c.file_path) return;
    const { data } = await supabase.storage.from("creations").createSignedUrl(c.file_path, 3600, { download: c.file_name || true });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Wordmark />
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight">Creations</h1>
          <p className="text-muted-foreground">
            Files, kits and resources built by the Fluxcore team. Free to download and use in your group.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">Nothing published yet — check back soon.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <article key={c.id} className="rounded-xl border border-border bg-card/40 backdrop-blur overflow-hidden flex flex-col">
                <div className="aspect-video bg-muted/30 flex items-center justify-center overflow-hidden">
                  {covers[c.id] ? (
                    <img src={covers[c.id]} alt={`${c.name} preview`} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-5 space-y-3 flex-1 flex flex-col">
                  <h2 className="text-lg font-semibold leading-tight">{c.name}</h2>
                  {c.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">{c.description}</p>}
                  {c.file_path && (
                    <div className="pt-2 space-y-2">
                      <p className="text-xs text-muted-foreground">{c.file_name} · {prettySize(c.file_size)}</p>
                      <Button size="sm" className="w-full" onClick={() => download(c)}>
                        <Download className="w-4 h-4 mr-2" /> Download
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
