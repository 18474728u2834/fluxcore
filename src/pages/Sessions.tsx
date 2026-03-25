import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Plus, Clock, User, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const mockSessions = [
  {
    id: "1",
    title: "Shift Training",
    category: "Training",
    scheduledAt: "Today, 3:00 PM EST",
    duration: 60,
    host: "xDarkSlayer",
    coHost: "RobloxPro2024",
    trainer: null,
    status: "scheduled",
    recurring: "weekly",
  },
  {
    id: "2",
    title: "Interview Session",
    category: "Interview",
    scheduledAt: "Today, 5:00 PM EST",
    duration: 30,
    host: "Admin_Pro",
    coHost: null,
    trainer: null,
    status: "active",
    recurring: null,
  },
  {
    id: "3",
    title: "Staff Meeting",
    category: "Meeting",
    scheduledAt: "Tomorrow, 2:00 PM EST",
    duration: 45,
    host: "xDarkSlayer",
    coHost: "GamerKid99",
    trainer: "CoolBuilder",
    status: "scheduled",
    recurring: "weekly",
  },
  {
    id: "4",
    title: "Patrol Shift",
    category: "Shift",
    scheduledAt: "Yesterday, 6:00 PM EST",
    duration: 120,
    host: "NinjaX",
    coHost: null,
    trainer: null,
    status: "completed",
    recurring: null,
  },
];

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  active: "bg-success/10 text-success",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const categoryColors: Record<string, string> = {
  Training: "bg-warning/10 text-warning",
  Interview: "bg-accent/10 text-accent",
  Meeting: "bg-primary/10 text-primary",
  Shift: "bg-success/10 text-success",
};

export default function Sessions() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <DashboardLayout title="Sessions">
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Schedule and manage team events</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="w-4 h-4 mr-1" /> New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/40 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Schedule Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm">Title</Label>
                  <Input placeholder="e.g. Shift Training" className="bg-muted border-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Category</Label>
                    <Select>
                      <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shift">Shift</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Recurring</Label>
                    <Select>
                      <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="One-time" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">One-time</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Date & Time</Label>
                    <Input type="datetime-local" className="bg-muted border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Duration (min)</Label>
                    <Input type="number" defaultValue={60} className="bg-muted border-border" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Host</Label>
                  <Input placeholder="Username" className="bg-muted border-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Co-Host <span className="text-muted-foreground">(opt)</span></Label>
                    <Input placeholder="Username" className="bg-muted border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Trainer <span className="text-muted-foreground">(opt)</span></Label>
                    <Input placeholder="Username" className="bg-muted border-border" />
                  </div>
                </div>
                <Button variant="hero" className="w-full" onClick={() => setDialogOpen(false)}>
                  Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {mockSessions.map((session) => (
            <div key={session.id} className="glass rounded-xl p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${categoryColors[session.category] || "bg-secondary text-muted-foreground"}`}>
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-sm">{session.title}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[session.status]}`}>
                    {session.status}
                  </span>
                  {session.recurring && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                      {session.recurring}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.scheduledAt}</span>
                  <span>{session.duration}min</span>
                </div>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1 text-foreground">
                    <User className="w-3 h-3 text-primary" /> {session.host}
                  </span>
                  {session.coHost && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3 h-3" /> {session.coHost}
                    </span>
                  )}
                  {session.trainer && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      Trainer: {session.trainer}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
