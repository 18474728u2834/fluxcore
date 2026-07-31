import { useEffect, useMemo, useState } from "react";

const STAGES = [
  "Waking up server",
  "Setting up a connection",
  "Negotiating secure channel",
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
    }, 900);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex flex-col items-center justify-center">
      {/* gradient wash */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, hsl(var(--primary) / 0.25), transparent 70%), radial-gradient(50% 50% at 80% 100%, hsl(var(--accent) / 0.18), transparent 70%), linear-gradient(180deg, hsl(var(--background)), hsl(var(--background)))",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl border border-border/60 bg-card/60 backdrop-blur flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl -z-10" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {STAGES[stage]}
            <span className="animate-pulse">…</span>
          </p>
          {label && (
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          )}
        </div>

        <div className="w-56 h-1 rounded-full bg-muted/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
            style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="absolute bottom-5 left-0 right-0 z-10 px-6">
        <p className="text-center font-mono text-[10px] leading-relaxed text-muted-foreground/60">
          atom {atomId}
          <span className="mx-2 opacity-40">•</span>
          node {node}
          <span className="mx-2 opacity-40">•</span>
          rev {randomId(6)}
        </p>
      </div>
    </div>
  );
}
