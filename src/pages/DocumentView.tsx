import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, FileText, Loader2, CheckCircle2, PenTool, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Doc {
  id: string; title: string; content: string; doc_type: string;
  signature_type: string; signature_word: string | null;
  auto_assign: boolean; deadline: string | null; created_at: string;
}

export default function DocumentView() {
  const { workspaceId, isOwner } = useWorkspace();
  const { docId } = useParams<{ docId: string }>();
  const { user, robloxUsername } = useAuth();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [signCount, setSignCount] = useState(0);
  const [signers, setSigners] = useState<{ name: string; signed_at: string }[]>([]);
  const [myMemberId, setMyMemberId] = useState("");

  const [signWord, setSignWord] = useState("");
  const [signUsername, setSignUsername] = useState("");
  const [signChecked, setSignChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  // Mark this document as "read" locally so the alert dot disappears
  useEffect(() => {
    if (!docId || !user) return;
    try {
      const key = `fluxcore_doc_read_${user.id}`;
      const raw = localStorage.getItem(key);
      const set: string[] = raw ? JSON.parse(raw) : [];
      if (!set.includes(docId)) {
        set.push(docId);
        localStorage.setItem(key, JSON.stringify(set));
        // Notify other tabs / Documents page
        window.dispatchEvent(new CustomEvent("fluxcore:doc-read", { detail: { docId } }));
      }
    } catch {}
  }, [docId, user]);

  useEffect(() => {
    const load = async () => {
      if (!docId || !user) return;
      const [{ data: d }, { data: m }] = await Promise.all([
        supabase.from("workspace_documents").select("*").eq("id", docId).maybeSingle(),
        supabase.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle(),
      ]);
      setDoc(d as Doc | null);
      setMyMemberId(m?.id || "");

      const { data: sigs } = await supabase.from("document_signatures")
        .select("id, member_id, user_id, signed_at").eq("document_id", docId);
      setSignCount(sigs?.length || 0);
      // Signed if either my member_id matches OR my user_id matches (covers owner)
      setSigned(!!sigs?.find(s => (m?.id && s.member_id === m.id) || s.user_id === user.id));

      // Resolve signer names — members via workspace_members, owner-only sigs use current name fallback
      if (sigs && sigs.length) {
        const memberIds = sigs.map(s => s.member_id).filter(Boolean) as string[];
        let nameMap = new Map<string, string>();
        if (memberIds.length) {
          const { data: mems } = await supabase.from("workspace_members")
            .select("id, roblox_username").in("id", memberIds);
          nameMap = new Map((mems || []).map(x => [x.id, x.roblox_username]));
        }
        setSigners(sigs.map(s => ({
          name: s.member_id
            ? (nameMap.get(s.member_id) || "Unknown")
            : (s.user_id === user.id ? `${robloxUsername || "You"} (Owner)` : "Owner"),
          signed_at: s.signed_at,
        })));
      }
      setLoading(false);
    };
    load();
  }, [docId, user, workspaceId, robloxUsername]);

  const startDraw = (e: React.MouseEvent) => {
    setDrawing(true);
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  };
  const draw = (e: React.MouseEvent) => {
    if (!drawing) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.strokeStyle = "hsl(258 90% 66%)"; ctx.lineWidth = 2;
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke();
  };
  const stopDraw = () => setDrawing(false);
  const clearCanvas = () => canvasRef.current?.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

  const sign = async () => {
    if (!doc || !user) { toast.error("You must be signed in"); return; }
    if (!myMemberId && !isOwner) { toast.error("You must be a workspace member to sign"); return; }
    let sigData = "";
    if (doc.signature_type === "checkbox") {
      if (!signChecked) { toast.error("Tick the acknowledgement box"); return; }
      sigData = "checked";
    }
    if (doc.signature_type === "username") {
      if (signUsername.trim() !== robloxUsername) { toast.error("Type your exact Roblox username"); return; }
      sigData = signUsername.trim();
    }
    if (doc.signature_type === "word") {
      if (signWord.trim() !== doc.signature_word) { toast.error("Word does not match"); return; }
      sigData = signWord.trim();
    }
    if (doc.signature_type === "canvas") {
      const c = canvasRef.current; if (!c) return;
      sigData = c.toDataURL();
      if (sigData.length < 200) { toast.error("Please draw your signature"); return; }
    }
    setSubmitting(true);
    const { error } = await supabase.from("document_signatures").insert({
      document_id: doc.id,
      member_id: myMemberId || null,
      user_id: user.id,
      signature_data: sigData,
    });
    setSubmitting(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Document signed!");
    setSigned(true); setSignCount(c => c + 1);
  };

  if (loading) {
    return <DashboardLayout title="Document"><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div></DashboardLayout>;
  }
  if (!doc) {
    return <DashboardLayout title="Document">
      <div className="text-center py-20 text-muted-foreground">Document not found.</div>
    </DashboardLayout>;
  }

  const isOverdue = doc.deadline && new Date(doc.deadline) < new Date() && !signed;

  return (
    <DashboardLayout title={doc.title}>
      <div className="max-w-4xl mx-auto space-y-6">
        <button onClick={() => navigate(`/w/${workspaceId}/documents`)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Documents
        </button>

        <div className="glass rounded-2xl p-8 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{doc.doc_type}</div>
                <h1 className="text-2xl font-bold text-foreground">{doc.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {signCount} signature{signCount !== 1 ? "s" : ""}</span>
                  {doc.deadline && (
                    <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : ""}`}>
                      <Clock className="w-3 h-3" /> Deadline: {new Date(doc.deadline).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {signed && (
              <span className="text-xs text-success flex items-center gap-1 shrink-0 bg-success/10 rounded-full px-3 py-1">
                <CheckCircle2 className="w-3 h-3" /> Signed
              </span>
            )}
          </div>

          <div className="bg-muted/50 rounded-xl p-6 text-foreground whitespace-pre-wrap leading-relaxed text-base border border-border/40">
            {doc.content}
          </div>
        </div>

        {/* Signing section */}
        {doc.doc_type === "handbook" ? (
          <div className="glass rounded-xl p-5 flex items-center gap-3 text-muted-foreground">
            <FileText className="w-5 h-5" />
            <span className="text-sm">This handbook is for reference only — no signature required.</span>
          </div>
        ) : signed ? (
          <div className="glass rounded-xl p-5 flex items-center gap-3 text-success bg-success/5">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">You have signed this document.</span>
          </div>
        ) : (myMemberId || isOwner) ? (
          <div className="glass rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <PenTool className="w-4 h-4 text-primary" /> Sign this document
            </h2>
            {doc.signature_type === "checkbox" && (
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/40">
                <Checkbox checked={signChecked} onCheckedChange={(c) => setSignChecked(!!c)} />
                <span className="text-sm text-foreground">I acknowledge and agree to this {doc.doc_type}</span>
              </label>
            )}
            {doc.signature_type === "username" && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Type your Roblox username ({robloxUsername}) to sign:</label>
                <Input value={signUsername} onChange={(e) => setSignUsername(e.target.value)} placeholder={robloxUsername || ""} className="bg-muted border-border" />
              </div>
            )}
            {doc.signature_type === "word" && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Type the required word to sign:</label>
                <Input value={signWord} onChange={(e) => setSignWord(e.target.value)} className="bg-muted border-border" />
              </div>
            )}
            {doc.signature_type === "canvas" && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Draw your signature:</label>
                <canvas
                  ref={canvasRef} width={600} height={160}
                  className="border border-border rounded-lg bg-muted w-full cursor-crosshair"
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                />
                <Button variant="ghost" size="sm" onClick={clearCanvas}>Clear</Button>
              </div>
            )}
            <Button variant="hero" className="w-full" onClick={sign} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <PenTool className="w-4 h-4 mr-1" /> Sign Document
            </Button>
          </div>
        ) : (
          <div className="glass rounded-xl p-5 text-sm text-muted-foreground">
            You must be a member of this workspace to sign documents.
          </div>
        )}

        {/* Signers list */}
        {signers.length > 0 && (
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">Signed by ({signers.length})</h3>
            <div className="space-y-2">
              {signers.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(s.signed_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
