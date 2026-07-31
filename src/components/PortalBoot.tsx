import { useEffect, useMemo, useState } from "react";

const STAGES = [
  "Waking up server",
  "Setting up a connection",
  "Negotiating secure channel",
  "Verifying workspace integrity",
  "Loading configuration",
  "Mounting partner assets",
  "Resolving member permissions",
  "Loading workspace",
];

function randomId(len: number) {
  const chars = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

interface PortalBootProps {
  label?: string;
}

/**
 * Fake "booting up" screen shown while a partner portal resolves.
 * Purely cosmetic — the atom / node ids are generated client-side.
 */
export default function PortalBoot({ label }: PortalBootProps) {
  const [stage, setStage] = useState(0);
  const atomId = useMemo(() => `${randomId(8)}-${randomId(4)}-${randomId(4)}-${randomId(12)}`, []);
  const node = useMemo(() => `eu-fra-${Math.floor(Math.random() * 9) + 1}`, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 1200);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex flex-col items-center justify-center">
      {/* black gradient wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 60% at 50% -10%, hsl(210 15% 12%), transparent 60%), radial-gradient(60% 50% at 50% 110%, hsl(220 20% 8%), transparent 55%), linear-gradient(180deg, #000000, #08090a 60%, #000000)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center w-full max-w-md">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/5 backdrop-blur flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-primary/15 blur-2xl -z-10" />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-white/90">
            {STAGES[stage]}
            <span className="animate-pulse">…</span>
          </p>
          {label && (
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">{label}</p>
          )}
        </div>

        <div className="w-full max-w-xs h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
            style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
          />
        </div>

        <div className="text-center font-mono text-[10px] leading-relaxed text-white/25">
          <span>atom {atomId}</span>
          <span className="mx-2 opacity-50">•</span>
          <span>node {node}</span>
        </div>
      </div>

      <div className="absolute bottom-5 left-0 right-0 z-10 px-6">
        <p className="text-center font-mono text-[10px] leading-relaxed text-white/20">
          rev {randomId(6)}
          <span className="mx-2 opacity-40">•</span>
          secure channel established
          <span className="mx-2 opacity-40">•</span>
          fluxcore {randomId(4)}
        </p>
      </div>
    </div>
  );
}

