import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pin, Plus, Clock, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_name: string;
  pinned: boolean;
  created_at: string;
  author_id: string;
}

export default function Wall() {
  const { workspaceId, isOwner } = useWorkspace();
  const { user, robloxUsername } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [posting, setPosting] = useState(false);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
    const channel = supabase
      .channel(`announcements-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements", filter: `workspace_id=eq.${workspaceId}` }, () => {
        fetchAnnouncements();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  const handlePost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    setPosting(true);
    const { error } = await supabase.from("announcements").insert({
      workspace_id: workspaceId,
      title: title.trim(),
      content: content.trim(),
      pinned,
      author_id: user.id,
      author_name: robloxUsername || "Unknown",
    });
    if (error) {
      toast.error("Failed to post: " + error.message);
    } else {
      toast.success("Posted!");
      setDialogOpen(false);
      setTitle("");
      setContent("");
      setPinned(false);
    }
    setPosting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else fetchAnnouncements();
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <DashboardLayout title="Wall">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wall</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Announcements & updates for your team</p>
          </div>
          {isOwner && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> Post</Button>
              </DialogTrigger>
              <DialogContent className="glass border-border/40">
                <DialogHeader>
                  <DialogTitle className="text-foreground">New Announcement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted border-border" />
                  <Textarea placeholder="Write your announcement..." value={content} onChange={(e) => setContent(e.target.value)} className="bg-muted border-border min-h-[120px]" />
                  <div className="flex items-center gap-2">
                    <Switch checked={pinned} onCheckedChange={setPinned} />
                    <Label className="text-sm text-muted-foreground">Pin this post</Label>
                  </div>
                  <Button variant="hero" className="w-full" onClick={handlePost} disabled={posting || !title.trim() || !content.trim()}>
                    {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Publish
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : announcements.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((post) => (
              <article key={post.id} className="glass rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {post.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                    <h3 className="font-semibold text-foreground text-sm">{post.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeAgo(post.created_at)}
                    </span>
                    {isOwner && (
                      <button onClick={() => handleDelete(post.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{post.content}</p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-foreground">
                    {post.author_name.charAt(0)}
                  </div>
                  <span className="text-xs text-muted-foreground">{post.author_name}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
