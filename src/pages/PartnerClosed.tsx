import { ShieldAlert } from "lucide-react";

interface Props {
  name: string;
  reason?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
}

export default function PartnerClosed({ name, reason, accentColor, logoUrl }: Props) {
  const accent = accentColor || "#ef4444";
  return (
    <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-6">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="w-20 h-20 rounded-2xl mx-auto opacity-50 grayscale" />
        ) : (
          <div className="w-20 h-20 rounded-2xl mx-auto bg-white/5 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10" style={{ color: accent }} />
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Staff Portal Closed</p>
          <h1 className="text-3xl font-bold">{name} Staff Portal Closed</h1>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">Reason</p>
          <p className="text-white/80 whitespace-pre-wrap">{reason || "No reason provided."}</p>
        </div>
        <p className="text-xs text-white/30">
          This portal has been disabled by Fluxcore staff. For inquiries, contact support at fluxcore.works.
        </p>
      </div>
    </div>
  );
}
