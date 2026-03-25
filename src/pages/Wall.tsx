import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Pin, Plus, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const mockAnnouncements = [
  {
    id: "1",
    title: "New Training Schedule",
    content: "Starting next week, all training sessions will be held on Saturdays at 3 PM EST. Please update your availability accordingly.",
    author: "xDarkSlayer",
    pinned: true,
    createdAt: "2 hours ago",
  },
  {
    id: "2",
    title: "Welcome New Staff Members",
    content: "Please welcome our newest team members who passed their interviews this week. Make sure to show them around!",
    author: "Admin_Pro",
    pinned: false,
    createdAt: "1 day ago",
  },
  {
    id: "3",
    title: "Server Maintenance Notice",
    content: "The game will undergo scheduled maintenance tonight from 11 PM to 1 AM EST. Activity tracking will be paused during this time.",
    author: "xDarkSlayer",
    pinned: false,
    createdAt: "3 days ago",
  },
];

export default function Wall() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <DashboardLayout title="Wall">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wall</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Announcements & updates for your team</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Post
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/40">
              <DialogHeader>
                <DialogTitle className="text-foreground">New Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="Title" className="bg-muted border-border" />
                <Textarea placeholder="Write your announcement..." className="bg-muted border-border min-h-[120px]" />
                <Button variant="hero" className="w-full" onClick={() => setDialogOpen(false)}>
                  Publish
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {mockAnnouncements.map((post) => (
            <article key={post.id} className="glass rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {post.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                  <h3 className="font-semibold text-foreground text-sm">{post.title}</h3>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {post.createdAt}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{post.content}</p>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-foreground">
                  {post.author.charAt(0)}
                </div>
                <span className="text-xs text-muted-foreground">{post.author}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
