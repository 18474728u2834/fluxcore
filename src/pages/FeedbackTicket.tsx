import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bug, Lightbulb, Send, Loader2, Clock, CheckCircle2, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Ticket {
  id: string; user_id: string; roblox_username: string; type: string;
  title: string; description: string; status: string; created_at: string;
}
interface Message {
  id: string; ticket_id: string; user_id: string; roblox_username: string;
  content: string; created_at: string;
}

const ADMIN_USERNAME = "Novavoff";
const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  under_research: { label: "Under Research", color: "bg-primary/10 text-primary border-primary/20", icon: FlaskConical },
  resolved: { label: "Resolved", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
};

export default function FeedbackTicket() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user, robloxUsername, loading: authLoading } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const isAdmin = robloxUsername === ADMIN_USERNAME;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!ticketId) return;
    const load = async () => {
      const [{ data: t }, { data: msgs }] = await Promise.all([
        supabase.from("feedback_tickets").select("*").eq("id", ticketId).maybeSingle(),
        supabase.from("feedback_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
      ]);
      setTicket(t as Ticket | null);
      setMessages((msgs as Message[]) || []);
      setLoading(false);
    };
    load();
  }, [ticketId, user, authLoading]);

  const refreshMessages = async () => {
    const { data } = await supabase.from("feedback_messages").select("*").eq("ticket_id", ticketId!).order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
  };

  const send = async () => {
    if (!newMessage.trim() || !user || !robloxUsername || !ticket) return;
    setSending(true);
    const { error } = await supabase.from("feedback_messages").insert({
      ticket_id: ticket.id, user_id: user.id, roblox_username: robloxUsername, content: newMessage.trim(),
    });
    setSending(false);
    if (error) { toast.error("Failed to send"); return; }
    setNewMessage("");
    refreshMessages();
  };

  const updateStatus = async (s: string) => {
    if (!ticket) return;
    const { error } = await supabase.from("feedback_tickets").update({ status: s, updated_at: new Date().toISOString() }).eq("id", ticket.id);
    if (error) toast.error("Failed");
    else { toast.success(`Status: ${s}`); setTicket({ ...ticket, status: s }); }
  };

  if (loading || authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  }
  if (!ticket) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Ticket not found.</div>;
  }
  const sc = statusConfig[ticket.status] || statusConfig.open;
  const StatusIcon = sc.icon;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate("/feedback")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/")} className="text-lg font-extrabold text-gradient tracking-tight">Fluxcore</button>
          <span className="text-sm text-muted-foreground">Ticket</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="glass rounded-2xl p-8 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ticket.type === "bug" ? "bg-destructive/10" : "bg-warning/10"}`}>
                {ticket.type === "bug" ? <Bug className="w-6 h-6 text-destructive" /> : <Lightbulb className="w-6 h-6 text-warning" />}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{ticket.type === "bug" ? "Bug Report" : "Feature Request"}</div>
                <h1 className="text-2xl font-bold text-foreground">{ticket.title}</h1>
                <div className="text-xs text-muted-foreground mt-2">
                  by <span className="text-foreground font-medium">{ticket.roblox_username}</span> · {new Date(ticket.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            <Badge variant="outline" className={`shrink-0 ${sc.color}`}>
              <StatusIcon className="w-3 h-3 mr-1" />{sc.label}
            </Badge>
          </div>

          <div className="bg-muted/50 rounded-xl p-6 text-foreground whitespace-pre-wrap leading-relaxed border border-border/40">
            {ticket.description}
          </div>

          {isAdmin && (
            <div className="flex gap-2 pt-2 border-t border-border/40">
              <span className="text-xs text-muted-foreground self-center mr-2">Set status:</span>
              {["open", "under_research", "resolved"].map(s => (
                <Button key={s} size="sm" variant={ticket.status === s ? "default" : "ghost"} onClick={() => updateStatus(s)} className="capitalize text-xs">
                  {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Discussion ({messages.length})</h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No messages yet — start the discussion.</p>
            ) : messages.map(m => (
              <div key={m.id} className="bg-secondary/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{m.roblox_username}</span>
                  {m.roblox_username === ADMIN_USERNAME && (
                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">Admin</Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Input
              placeholder="Add a message..." value={newMessage} maxLength={1000}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              className="bg-muted border-border flex-1"
            />
            <Button variant="hero" onClick={send} disabled={sending || !newMessage.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
