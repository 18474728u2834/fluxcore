import { DashboardLayout } from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Loader2, CheckCircle2, Clock, PenTool, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Doc {
  id: string; title: string; content: string; doc_type: string;
  signature_type: string; signature_word: string | null; auto_assign: boolean;
  deadline: string | null; created_at: string;
}
interface Sig { id: string; document_id: string; member_id: string | null; user_id: string; signed_at: string; }

export default function Documents() {
  const { workspaceId, isOwner } = useWorkspace();
  const navigate = useNavigate();
  const { user, robloxUsername } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [sigs, setSigs] = useState<Sig[]>([]);
  const [myMemberId, setMyMemberId] = useState<string>("");
  const [readDocs, setReadDocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"policy" | "handbook">("policy");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [docType, setDocType] = useState("policy");
  const [sigType, setSigType] = useState("checkbox");
  const [sigWord, setSigWord] = useState("");
  const [autoAssign, setAutoAssign] = useState(false);
  const [deadline, setDeadline] = useState("");

  // Signing
  const [signWord, setSignWord] = useState("");
  const [signUsername, setSignUsername] = useState("");
  const [signChecked, setSignChecked] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  const fetchData = async () => {
    const [{ data: docsData }, { data: sigsData }, { data: memberData }] = await Promise.all([
      supabase.from("workspace_documents").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("document_signatures").select("*"),
      supabase.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", user?.id).maybeSingle(),
    ]);
    setDocs(docsData || []);
    setSigs(sigsData || []);
    setMyMemberId(memberData?.id || "");
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [workspaceId]);

  // Load locally-tracked "read" docs and refresh when DocumentView marks one
  useEffect(() => {
    if (!user) return;
    const key = `fluxcore_doc_read_${user.id}`;
    const refresh = () => {
      try {
        const raw = localStorage.getItem(key);
        setReadDocs(new Set(raw ? JSON.parse(raw) : []));
      } catch { setReadDocs(new Set()); }
    };
    refresh();
    const onRead = () => refresh();
    window.addEventListener("fluxcore:doc-read", onRead);
    window.addEventListener("storage", onRead);
    return () => {
      window.removeEventListener("fluxcore:doc-read", onRead);
      window.removeEventListener("storage", onRead);
    };
  }, [user]);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    setCreating(true);
    const { error } = await supabase.from("workspace_documents").insert({
      workspace_id: workspaceId, title: title.trim(), content: content.trim(),
      doc_type: docType, signature_type: sigType,
      signature_word: sigType === "word" ? sigWord.trim() : null,
      auto_assign: autoAssign,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      created_by: user.id,
    });
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Document created!"); setDialogOpen(false); resetForm(); fetchData(); }
    setCreating(false);
  };

  const resetForm = () => { setTitle(""); setContent(""); setSigWord(""); setDeadline(""); };

  const hasSigned = (docId: string) => sigs.some(s => s.document_id === docId && (
    (myMemberId && s.member_id === myMemberId) || (user && s.user_id === user.id)
  ));
  const isRead = (docId: string) => readDocs.has(docId);

  const signDocument = async (doc: Doc) => {
    if (!myMemberId || !user) { toast.error("You must be a member"); return; }
    let sigData = "";
    if (doc.signature_type === "checkbox" && !signChecked) { toast.error("Check the box"); return; }
    if (doc.signature_type === "username") {
      if (signUsername !== robloxUsername) { toast.error("Type your exact username"); return; }
      sigData = signUsername;
    }
    if (doc.signature_type === "word") {
      if (signWord !== doc.signature_word) { toast.error("Type the correct word"); return; }
      sigData = signWord;
    }
    if (doc.signature_type === "canvas") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      sigData = canvas.toDataURL();
    }
    const { error } = await supabase.from("document_signatures").insert({
      document_id: doc.id, member_id: myMemberId, user_id: user.id, signature_data: sigData || "signed",
    });
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Document signed!"); setViewDoc(null); fetchData(); }
  };

  // Canvas drawing
  const startDraw = (e: React.MouseEvent) => {
    setDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const draw = (e: React.MouseEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = "hsl(258 90% 66%)";
    ctx.lineWidth = 2;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  const stopDraw = () => setDrawing(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isHandbook = (doc: Doc) => doc.doc_type?.toLowerCase() === "handbook";
  const filtered = docs.filter(d => tab === "handbook" ? isHandbook(d) : !isHandbook(d));
  const unsignedCount = docs.filter(d => !isHandbook(d) && d.auto_assign && !hasSigned(d.id) && !isRead(d.id)).length;

  return (
    <DashboardLayout title="Documents">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Documents
              {unsignedCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unsignedCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Policies & Handbooks</p>
          </div>
          {isOwner && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> Create</Button>
              </DialogTrigger>
              <DialogContent className="glass border-border/40 max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-foreground">Create Document</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted border-border" />
                  <Textarea placeholder="Content..." value={content} onChange={(e) => setContent(e.target.value)} className="bg-muted border-border min-h-[120px]" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Type</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="policy">Policy</SelectItem>
                          <SelectItem value="handbook">Handbook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Signature Method</Label>
                      <Select value={sigType} onValueChange={setSigType}>
                        <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="username">Type Username</SelectItem>
                          <SelectItem value="canvas">Draw Signature</SelectItem>
                          <SelectItem value="word">Special Word</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {sigType === "word" && (
                    <Input placeholder="Secret word to type" value={sigWord} onChange={(e) => setSigWord(e.target.value)} className="bg-muted border-border" />
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs">Deadline (optional)</Label>
                    <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-muted border-border" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
                    <Label className="text-sm text-muted-foreground">Auto-assign to all members</Label>
                  </div>
                  <Button variant="hero" className="w-full" onClick={handleCreate} disabled={creating || !title.trim() || !content.trim()}>
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Document
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/40 rounded-lg p-1">
          <button onClick={() => setTab("policy")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "policy" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Policies
          </button>
          <button onClick={() => setTab("handbook")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "handbook" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Handbooks
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No {tab === "policy" ? "policies" : "handbooks"} yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(doc => {
              const signed = hasSigned(doc.id);
              const sigCount = sigs.filter(s => s.document_id === doc.id).length;
              const isOverdue = doc.deadline && new Date(doc.deadline) < new Date() && !signed;

              return (
                <div
                  key={doc.id}
                  onClick={() => navigate(`/w/${workspaceId}/documents/${doc.id}`)}
                  className={`glass rounded-xl p-5 cursor-pointer hover:bg-secondary/30 transition-colors ${isOverdue ? "border-l-2 border-l-destructive" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground text-sm">{doc.title}</h3>
                      {doc.auto_assign && !signed && !isRead(doc.id) && (
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {signed ? (
                        <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Signed</span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><PenTool className="w-3 h-3" /> Unsigned</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{doc.content}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span>{sigCount} signature{sigCount !== 1 ? "s" : ""}</span>
                    {doc.deadline && (
                      <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : ""}`}>
                        <Clock className="w-3 h-3" /> {new Date(doc.deadline).toLocaleDateString()}
                      </span>
                    )}
                    {doc.auto_assign && <span className="text-primary">Auto-assigned</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View/Sign Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => { if (!open) { setViewDoc(null); setSignChecked(false); setSignUsername(""); setSignWord(""); } }}>
        <DialogContent className="glass border-border/40 max-w-lg max-h-[85vh] overflow-y-auto">
          {viewDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> {viewDoc.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="bg-muted rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                  {viewDoc.content}
                </div>

                {hasSigned(viewDoc.id) ? (
                  <div className="flex items-center gap-2 text-success bg-success/10 rounded-lg p-3">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">You have signed this document</span>
                  </div>
                ) : viewDoc.doc_type === "handbook" ? (
                  <div className="flex items-center gap-2 text-muted-foreground bg-muted rounded-lg p-3">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">This handbook is for reference only — no signature required.</span>
                  </div>
                ) : myMemberId ? (
                  <div className="border-t border-border/40 pt-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sign this document</p>

                    {viewDoc.signature_type === "checkbox" && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={signChecked} onCheckedChange={(c) => setSignChecked(!!c)} />
                        <span className="text-sm text-foreground">I acknowledge and agree to this {viewDoc.doc_type}</span>
                      </label>
                    )}

                    {viewDoc.signature_type === "username" && (
                      <Input placeholder="Type your Roblox username" value={signUsername} onChange={(e) => setSignUsername(e.target.value)} className="bg-muted border-border" />
                    )}

                    {viewDoc.signature_type === "word" && (
                      <Input placeholder="Type the required word" value={signWord} onChange={(e) => setSignWord(e.target.value)} className="bg-muted border-border" />
                    )}

                    {viewDoc.signature_type === "canvas" && (
                      <div className="space-y-2">
                        <canvas
                          ref={canvasRef}
                          width={400} height={120}
                          className="border border-border rounded-lg bg-muted w-full cursor-crosshair"
                          onMouseDown={startDraw}
                          onMouseMove={draw}
                          onMouseUp={stopDraw}
                          onMouseLeave={stopDraw}
                        />
                        <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-xs">Clear</Button>
                      </div>
                    )}

                    <Button variant="hero" className="w-full" onClick={() => signDocument(viewDoc)}>
                      <PenTool className="w-4 h-4 mr-1" /> Sign Document
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
