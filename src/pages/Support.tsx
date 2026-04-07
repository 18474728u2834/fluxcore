import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, MessageSquare, CheckCircle2, Clock, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
}

interface Message {
  id: string;
  roblox_username: string;
  content: string;
  created_at: string;
}

export default function Support() {
  const { user, robloxUsername } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    setTickets((data as any[]) || []);
    setLoading(false);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages((data as any[]) || []);
  };

  useEffect(() => { fetchTickets(); }, []);

  useEffect(() => {
    if (selectedTicket) fetchMessages(selectedTicket.id);
  }, [selectedTicket?.id]);

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim() || !user) return;
    setCreating(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      roblox_username: robloxUsername || "Unknown",
      subject: subject.trim(),
      message: message.trim(),
    } as any);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Ticket created!"); setDialogOpen(false); setSubject(""); setMessage(""); fetchTickets(); }
    setCreating(false);
  };

  const handleReply = async () => {
    if (!reply.trim() || !selectedTicket || !user) return;
    setSendingReply(true);
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      roblox_username: robloxUsername || "Unknown",
      content: reply.trim(),
    } as any);
    if (error) toast.error("Failed: " + error.message);
    else { setReply(""); fetchMessages(selectedTicket.id); }
    setSendingReply(false);
  };

  const statusIcon = (s: string) => s === "open" ? <Clock className="w-3 h-3 text-warning" /> : <CheckCircle2 className="w-3 h-3 text-success" />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Support Center</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Need help? Create a support ticket and our team will assist you.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> New Ticket</Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/40 max-w-md">
              <DialogHeader><DialogTitle className="text-foreground">Create Support Ticket</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-muted border-border" />
                <Textarea placeholder="Describe your issue..." value={message} onChange={(e) => setMessage(e.target.value)} className="bg-muted border-border min-h-[120px]" />
                <Button variant="hero" className="w-full" onClick={handleCreate} disabled={creating || !subject.trim() || !message.trim()}>
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit Ticket
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {selectedTicket ? (
          <div className="space-y-4">
            <button onClick={() => setSelectedTicket(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to tickets
            </button>
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                {statusIcon(selectedTicket.status)}
                <h2 className="font-semibold text-foreground">{selectedTicket.subject}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{selectedTicket.status}</span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedTicket.message}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(selectedTicket.created_at).toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className="glass rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary">{m.roblox_username}</span>
                    <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-foreground">{m.content}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input placeholder="Type a reply..." value={reply} onChange={(e) => setReply(e.target.value)} className="bg-muted border-border"
                onKeyDown={(e) => e.key === "Enter" && handleReply()} />
              <Button variant="hero" size="sm" onClick={handleReply} disabled={sendingReply || !reply.trim()}>
                {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tickets yet. Create one to get help!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => (
              <button key={t.id} onClick={() => setSelectedTicket(t)} className="w-full glass rounded-xl p-5 text-left hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  {statusIcon(t.status)}
                  <h3 className="font-semibold text-foreground text-sm">{t.subject}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize ml-auto">{t.status}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{t.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(t.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
