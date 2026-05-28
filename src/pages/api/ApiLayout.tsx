import { useState, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check } from "lucide-react";

export function ApiShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/api" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> All APIs
          </Link>
          <div className="text-xs font-mono text-muted-foreground">v1 · Open Source</div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">{children}</main>
      <footer className="border-t border-border/60 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-xs text-muted-foreground flex items-center justify-between">
          <span>© Fluxcore</span>
          <Link to="/" className="hover:text-foreground transition-colors">fluxcore.works</Link>
        </div>
      </footer>
    </div>
  );
}

export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <div className="absolute top-3 left-4 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{lang}</div>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-2 right-2 h-7 px-2 rounded-md text-[11px] flex items-center gap-1 bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="bg-card/50 border border-border rounded-lg pt-9 pb-4 px-4 text-[12.5px] font-mono text-foreground/90 overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

export function EndpointBadge({ method, url }: { method: string; url: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/30 p-4 font-mono text-sm flex flex-wrap items-center gap-2">
      <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-xs font-bold">{method}</span>
      <span className="text-foreground break-all">{url}</span>
    </div>
  );
}

export function ParamsTable({ rows }: { rows: { param: string; default?: string; desc: ReactNode }[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-card/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2 font-semibold">Param</th>
            <th className="text-left px-4 py-2 font-semibold">Default</th>
            <th className="text-left px-4 py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.param}>
              <td className="px-4 py-3 font-mono text-xs">{r.param}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.default || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
