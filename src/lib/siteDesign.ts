export type SectionType =
  | "hero"
  | "features"
  | "stats"
  | "text"
  | "cta"
  | "faq"
  | "logos"
  | "image";

export interface SectionItem {
  title: string;
  desc: string;
}

export interface Section {
  id: string;
  type: SectionType;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  imageUrl?: string;
  align?: "left" | "center";
  items?: SectionItem[];
}

export interface SiteTheme {
  primary: string;
  background: string;
  foreground: string;
  surface: string;
  radius: number;
  font: "inter" | "dm-sans" | "mono" | "serif";
  density: "compact" | "comfortable" | "spacious";
  gradient: boolean;
}

export interface SiteDesign {
  id: string;
  name: string;
  target: "landing" | "workspace";
  ui_label: string;
  theme: SiteTheme;
  sections: Section[];
  is_active: boolean;
  updated_at?: string;
}

export const DEFAULT_THEME: SiteTheme = {
  primary: "#22d3ee",
  background: "#0b0b0f",
  foreground: "#fafafa",
  surface: "#141416",
  radius: 12,
  font: "inter",
  density: "comfortable",
  gradient: true,
};

export const FONT_STACKS: Record<SiteTheme["font"], string> = {
  inter: "'Inter', system-ui, sans-serif",
  "dm-sans": "'DM Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  serif: "Georgia, 'Times New Roman', serif",
};

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero",
  features: "Feature grid",
  stats: "Stats row",
  text: "Text block",
  cta: "Call to action",
  faq: "FAQ",
  logos: "Logo / trust row",
  image: "Image",
};

export function normalizeTheme(raw: any): SiteTheme {
  const t = raw && typeof raw === "object" ? raw : {};
  const rawFont = typeof t.font === "string" ? t.font : DEFAULT_THEME.font;
  const safeFont: SiteTheme["font"] = ["inter", "dm-sans", "mono", "serif"].includes(rawFont) ? rawFont as SiteTheme["font"] : DEFAULT_THEME.font;
  return {
    primary: typeof t.primary === "string" ? t.primary : DEFAULT_THEME.primary,
    background: typeof t.background === "string" ? t.background : DEFAULT_THEME.background,
    foreground: typeof t.foreground === "string" ? t.foreground : DEFAULT_THEME.foreground,
    surface: typeof t.surface === "string" ? t.surface : DEFAULT_THEME.surface,
    radius: typeof t.radius === "number" ? t.radius : DEFAULT_THEME.radius,
    font: rawFont === "outfit" ? "inter" : safeFont,
    density: ["compact", "comfortable", "spacious"].includes(t.density) ? t.density : DEFAULT_THEME.density,
    gradient: t.gradient !== false,
  };
}

export function normalizeSections(raw: any): Section[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === "object" && SECTION_LABELS[s.type as SectionType])
    .map((s: any, i: number) => ({
      ...s,
      id: typeof s.id === "string" ? s.id : `s${i}-${Math.random().toString(36).slice(2, 8)}`,
      items: Array.isArray(s.items)
        ? s.items.map((it: any) => ({ title: String(it?.title ?? ""), desc: String(it?.desc ?? "") }))
        : [],
    }));
}

export function normalizeDesign(row: any): SiteDesign {
  return {
    id: row.id,
    name: row.name ?? "Untitled design",
    target: row.target === "workspace" ? "workspace" : "landing",
    ui_label: row.ui_label || "Fluxcore",
    theme: normalizeTheme(row.theme),
    sections: normalizeSections(row.sections),
    is_active: !!row.is_active,
    updated_at: row.updated_at,
  };
}

export function newSection(type: SectionType): Section {
  const id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
  switch (type) {
    case "hero":
      return {
        id, type, eyebrow: "Fluxcore", title: "Run your Roblox group like a company",
        subtitle: "Sessions, quotas, activity tracking and ranking — in one workspace.",
        ctaLabel: "Get started", ctaHref: "/login", secondaryLabel: "See pricing", secondaryHref: "/pricing",
        align: "center", items: [],
      };
    case "features":
      return {
        id, type, title: "Everything your staff team needs", subtitle: "",
        items: [
          { title: "Activity tracking", desc: "Live in-game minutes with idle detection." },
          { title: "Sessions", desc: "Schedule shifts, trainings and events." },
          { title: "Quotas", desc: "Automatic checks on time and attendance." },
        ],
      };
    case "stats":
      return { id, type, title: "", items: [{ title: "25+", desc: "Workspaces" }, { title: "99.9%", desc: "Uptime" }] };
    case "text":
      return { id, type, title: "About", body: "Write anything you want here.", align: "left", items: [] };
    case "cta":
      return { id, type, title: "Ready to start?", subtitle: "Free for every Roblox group.", ctaLabel: "Create a workspace", ctaHref: "/login", items: [] };
    case "faq":
      return { id, type, title: "Questions", items: [{ title: "Is it free?", desc: "Yes, Fluxcore is free for everyone." }] };
    case "logos":
      return { id, type, title: "Trusted by teams", items: [{ title: "Shoply", desc: "" }, { title: "Almore", desc: "" }] };
    case "image":
      return { id, type, title: "", imageUrl: "", items: [] };
  }
}
