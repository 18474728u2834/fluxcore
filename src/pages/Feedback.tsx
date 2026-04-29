import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Bug, Lightbulb, Send, Loader2, MessageSquare,
  Search, Clock, CheckCircle2, FlaskConical,
} from "lucide-react";

interface Ticket {
  id: string;
  user_id: string;
  roblox_username: string;
  type: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  user_id: string;
  roblox_username: string;
  content: string;
  created_at: string;
}

const ADMIN_USERNAME = "Novavoff";
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_HOUR = 2;

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  under_research: { label: "Under Research", color: "bg-primary/10 text-primary border-primary/20", icon: FlaskConical },
  resolved: { label: "Resolved", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
};

export default function Feedback() {
  const navigate = useNavigate();
  const { user, loading: authLoading, robloxUsername } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<"bug" | "feature">("bug");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "bug" | "feature">("all");
  const [search, setSearch] = useState("");

  // Detail view
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const isAdmin = robloxUsername === ADMIN_USERNAME;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchTickets();
  }, [user, authLoading]);

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feedback_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    setTickets((data as any[]) || []);
    setLoading(false);
  };

  const checkRateLimit = (): boolean => {
    const key = `fluxcore_feedback_${user?.id}`;
    const stored = localStorage.getItem(key);
    const timestamps: number[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_MS);
    return recent.length < MAX_PER_HOUR;
  };

  const recordSubmission = () => {
    const key = `fluxcore_feedback_${user?.id}`;
    const stored = localStorage.getItem(key);
    const timestamps: number[] = stored ? JSON.parse(stored) : [];
    timestamps.push(Date.now());
    localStorage.setItem(key, JSON.stringify(timestamps.slice(-10)));
  };

  const handleSubmit = async () => {
    if (!newTitle.trim() || !newDesc.trim() || !user || !robloxUsername) return;
    if (!checkRateLimit()) {
      toast.error("Rate limit reached. You can submit 2 tickets per hour.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("feedback_tickets").insert({
      user_id: user.id,
      roblox_username: robloxUsername,
      type: newType,
      title: newTitle.trim(),
      description: newDesc.trim(),
    } as any);

    if (error) {
      toast.error("Failed to submit: " + error.message);
    } else {
      toast.success("Ticket submitted!");
      recordSubmission();
      setNewTitle("");
      setNewDesc("");
      setCreating(false);
      fetchTickets();
    }
    setSubmitting(false);
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("feedback_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages((data as any[]) || []);
    setLoadingMsgs(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !robloxUsername || !selectedTicket) return;
    setSendingMsg(true);
    const { error } = await supabase.from("feedback_messages").insert({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      roblox_username: robloxUsername,
      content: newMessage.trim(),
    } as any);

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
      // Refresh messages
      const { data } = await supabase
        .from("feedback_messages")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });
      setMessages((data as any[]) || []);
    }
    setSendingMsg(false);
  };

  const updateStatus = async (ticketId: string, status: string) => {
    // Use service role via edge function for admin actions
    // For now, direct update (only works for ticket creator due to RLS)
    // Admin updates would need an edge function
    const { error } = await supabase
      .from("feedback_tickets")
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Status updated to ${status}`);
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    }
  };

  const filtered = tickets.filter((t) => {
    if (filter !== "all" && t.type !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/")} className="text-lg font-extrabold text-gradient tracking-tight">Fluxcore</button>
          <span className="text-sm text-muted-foreground">Feedback</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bug Reports & Feature Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">Help us improve Fluxcore — max 2 submissions per hour</p>
          </div>
          <Button variant="hero" onClick={() => setCreating(true)}>
            <Send className="w-4 h-4 mr-1" /> Submit
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted border-border"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "bug", "feature"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f === "bug" && <Bug className="w-3 h-3 mr-1" />}
                {f === "feature" && <Lightbulb className="w-3 h-3 mr-1" />}
                {f === "all" ? "All" : f === "bug" ? "Bugs" : "Features"}
              </Button>
            ))}
          </div>
        </div>

        {/* Ticket List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-semibold">No tickets yet</p>
            <p className="text-sm text-muted-foreground">Be the first to submit feedback!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const sc = statusConfig[t.status] || statusConfig.open;
              const StatusIcon = sc.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate(`/feedback/${t.id}`)}
                  className="w-full glass-hover rounded-xl p-4 text-left flex items-center gap-4"
                >
                  <div className="shrink-0">
                    {t.type === "bug" ? (
                      <Bug className="w-5 h-5 text-destructive" />
                    ) : (
                      <Lightbulb className="w-5 h-5 text-warning" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{t.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      by {t.roblox_username} · {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={sc.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {sc.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogContent className="glass border-border/40">
            <DialogHeader>
              <DialogTitle className="text-foreground">Submit Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                <Button
                  variant={newType === "bug" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setNewType("bug")}
                >
                  <Bug className="w-3 h-3 mr-1" /> Bug Report
                </Button>
                <Button
                  variant={newType === "feature" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setNewType("feature")}
                >
                  <Lightbulb className="w-3 h-3 mr-1" /> Feature Request
                </Button>
              </div>
              <Input
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-muted border-border"
                maxLength={200}
              />
              <Textarea
                placeholder="Describe the issue or feature..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="bg-muted border-border min-h-[120px]"
                maxLength={2000}
              />
              <Button
                variant="hero"
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting || !newTitle.trim() || !newDesc.trim()}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="glass border-border/40 max-w-lg max-h-[80vh] flex flex-col">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    {selectedTicket.type === "bug" ? (
                      <Bug className="w-4 h-4 text-destructive" />
                    ) : (
                      <Lightbulb className="w-4 h-4 text-warning" />
                    )}
                    <DialogTitle className="text-foreground text-sm">{selectedTicket.title}</DialogTitle>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={statusConfig[selectedTicket.status]?.color}>
                      {statusConfig[selectedTicket.status]?.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      by {selectedTicket.roblox_username}
                    </span>
                  </div>
                </DialogHeader>

                <div className="bg-muted rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>

                {/* Admin controls */}
                {isAdmin && (
                  <div className="flex gap-2">
                    {["open", "under_research", "resolved"].map((s) => (
                      <Button
                        key={s}
                        variant={selectedTicket.status === s ? "default" : "ghost"}
                        size="sm"
                        onClick={() => updateStatus(selectedTicket.id, s)}
                        className="capitalize text-xs"
                      >
                        {s.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px] max-h-[300px]">
                  {loadingMsgs ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className="bg-secondary/50 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground">{m.roblox_username}</span>
                          {m.roblox_username === ADMIN_USERNAME && (
                            <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">Admin</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{m.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Message input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="bg-muted border-border flex-1"
                    maxLength={1000}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <Button variant="hero" size="sm" onClick={sendMessage} disabled={sendingMsg || !newMessage.trim()}>
                    {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
