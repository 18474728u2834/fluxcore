import { FONT_STACKS, type Section, type SiteDesign, type SiteTheme } from "@/lib/siteDesign";
import { Link } from "react-router-dom";

const PAD: Record<SiteTheme["density"], string> = {
  compact: "py-10",
  comfortable: "py-16",
  spacious: "py-24",
};

function Cta({ label, href, theme, primary }: { label?: string; href?: string; theme: SiteTheme; primary?: boolean }) {
  if (!label) return null;
  const style = primary
    ? { background: theme.primary, color: theme.background, borderRadius: theme.radius }
    : { border: `1px solid ${theme.foreground}33`, color: theme.foreground, borderRadius: theme.radius };
  const cls = "inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-85";
  const to = href || "#";
  if (/^https?:/i.test(to)) {
    return <a href={to} className={cls} style={style}>{label}</a>;
  }
  return <Link to={to} className={cls} style={style}>{label}</Link>;
}

function SectionView({ s, theme }: { s: Section; theme: SiteTheme }) {
  const pad = PAD[theme.density];
  const card = {
    background: theme.surface,
    border: `1px solid ${theme.foreground}1a`,
    borderRadius: theme.radius,
  } as const;
  const muted = { color: `${theme.foreground}99` };
  const center = s.align !== "left";

  switch (s.type) {
    case "hero":
      return (
        <section className={`${pad} px-6`} style={theme.gradient ? { background: `radial-gradient(90rem 40rem at 50% -10%, ${theme.primary}22, transparent 70%)` } : undefined}>
          <div className={`mx-auto max-w-5xl ${center ? "text-center" : ""}`}>
            {s.eyebrow && <div className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: theme.primary }}>{s.eyebrow}</div>}
            {s.title && <h1 className="text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight">{s.title}</h1>}
            {s.subtitle && <p className="mt-5 text-base sm:text-lg max-w-2xl mx-auto" style={muted}>{s.subtitle}</p>}
            <div className={`mt-8 flex flex-wrap gap-3 ${center ? "justify-center" : ""}`}>
              <Cta label={s.ctaLabel} href={s.ctaHref} theme={theme} primary />
              <Cta label={s.secondaryLabel} href={s.secondaryHref} theme={theme} />
            </div>
            {s.imageUrl && (
              <img src={s.imageUrl} alt={s.title || "Preview"} loading="lazy" className="mt-12 w-full object-cover" style={{ borderRadius: theme.radius, border: `1px solid ${theme.foreground}1a` }} />
            )}
          </div>
        </section>
      );

    case "features":
      return (
        <section className={`${pad} px-6`}>
          <div className="mx-auto max-w-6xl">
            {s.title && <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{s.title}</h2>}
            {s.subtitle && <p className="mt-2 text-sm" style={muted}>{s.subtitle}</p>}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(s.items || []).map((it, i) => (
                <div key={i} className="p-5" style={card}>
                  <div className="text-sm font-semibold">{it.title}</div>
                  <p className="mt-1.5 text-sm" style={muted}>{it.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "stats":
      return (
        <section className={`${pad} px-6`}>
          <div className="mx-auto max-w-5xl grid gap-4 grid-cols-2 sm:grid-cols-4">
            {(s.items || []).map((it, i) => (
              <div key={i} className="p-5 text-center" style={card}>
                <div className="text-2xl font-bold" style={{ color: theme.primary }}>{it.title}</div>
                <div className="text-xs mt-1" style={muted}>{it.desc}</div>
              </div>
            ))}
          </div>
        </section>
      );

    case "text":
      return (
        <section className={`${pad} px-6`}>
          <div className={`mx-auto max-w-3xl ${center ? "text-center" : ""}`}>
            {s.title && <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>}
            {s.body && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line" style={muted}>{s.body}</p>}
          </div>
        </section>
      );

    case "cta":
      return (
        <section className={`${pad} px-6`}>
          <div className="mx-auto max-w-4xl p-10 text-center" style={{ ...card, background: theme.gradient ? `linear-gradient(135deg, ${theme.primary}22, ${theme.surface})` : theme.surface }}>
            {s.title && <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{s.title}</h2>}
            {s.subtitle && <p className="mt-2 text-sm" style={muted}>{s.subtitle}</p>}
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              <Cta label={s.ctaLabel} href={s.ctaHref} theme={theme} primary />
              <Cta label={s.secondaryLabel} href={s.secondaryHref} theme={theme} />
            </div>
          </div>
        </section>
      );

    case "faq":
      return (
        <section className={`${pad} px-6`}>
          <div className="mx-auto max-w-3xl">
            {s.title && <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>}
            <div className="mt-6 space-y-3">
              {(s.items || []).map((it, i) => (
                <div key={i} className="p-5" style={card}>
                  <div className="text-sm font-semibold">{it.title}</div>
                  <p className="mt-1.5 text-sm" style={muted}>{it.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "logos":
      return (
        <section className={`${pad} px-6`}>
          <div className="mx-auto max-w-5xl text-center">
            {s.title && <div className="text-xs uppercase tracking-[0.2em]" style={muted}>{s.title}</div>}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {(s.items || []).map((it, i) => (
                <span key={i} className="text-lg font-semibold opacity-70">{it.title}</span>
              ))}
            </div>
          </div>
        </section>
      );

    case "image":
      return (
        <section className={`${pad} px-6`}>
          <div className="mx-auto max-w-5xl">
            {s.imageUrl && (
              <img src={s.imageUrl} alt={s.title || "Section image"} loading="lazy" className="w-full object-cover" style={{ borderRadius: theme.radius, border: `1px solid ${theme.foreground}1a` }} />
            )}
            {s.title && <p className="mt-3 text-xs text-center" style={muted}>{s.title}</p>}
          </div>
        </section>
      );

    default:
      return null;
  }
}

export function SiteDesignRenderer({ design, className = "" }: { design: SiteDesign; className?: string }) {
  const theme = design.theme;
  return (
    <div
      className={className}
      style={{
        background: theme.background,
        color: theme.foreground,
        fontFamily: FONT_STACKS[theme.font],
        minHeight: "100%",
      }}
    >
      {design.sections.map((s) => (
        <SectionView key={s.id} s={s} theme={theme} />
      ))}
    </div>
  );
}
