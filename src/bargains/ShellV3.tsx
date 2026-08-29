import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home, Clock, FileText, Briefcase, Users, Grid3x3, Settings, LogOut,
  Search, Calendar, Target, Megaphone, Heart, ArrowUp, ClipboardList,
  Menu, X, ChevronDown, Sparkles, Loader2,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useNexusConfig } from "@/hooks/useNexusConfig";
import { useLexicon } from "@/hooks/useLexicon";
import { isPortalHost } from "@/lib/sso";
import { DemoBanner } from "@/components/DemoBanner";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";


const NAV = [
  { to: "dashboard",    icon: Home,          label: "Dashboard" },
  { to: "activity",     icon: Clock,         label: "Activity" },
  { to: "documents",    icon: FileText,      label: "Documents" },
  { to: "loa",          icon: Briefcase,     label: "LOA" },
  { to: "members",      icon: Users,         label: "Members" },
  { to: "sessions",     icon: Calendar,      label: "Sessions" },
  { to: "quotas",       icon: Target,        label: "Quotas" },
  { to: "wall",         icon: Megaphone,     label: "Wall" },
  { to: "kudos",        icon: Heart,         label: "Kudos" },
  { to: "promotions",   icon: ArrowUp,       label: "Promotions" },
  { to: "applications", icon: ClipboardList, label: "Applications" },
  { to: "staff",        icon: Grid3x3,       label: "Blacklist" },
];

/** Nexus UI 3.0 — invite-only trial shell. Same information, softer surfaces,
 *  floating sidebar, ambient accent light and a calmer top bar. */
export function ShellV3({ children }: { children: ReactNode }) {
  const { workspace, workspaceId } = useWorkspace();
  const { config } = useNexusConfig(workspaceId);
  const { t } = useLexicon(workspaceId);
  const { signOut, robloxUsername, robloxUserId } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [people, setPeople] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const base = `/w/${workspaceId}`;
  const accent = workspace?.primary_color || "#2f74a8";
  const initials = (workspace?.name || "").trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "·";

  // Workspace (Roblox group) icon, cached in localStorage
  const [groupIcon, setGroupIcon] = useState<string | null>(() => {
    const gid = workspace?.roblox_group_id;
    if (!gid || typeof window === "undefined") return null;
    return localStorage.getItem(`fluxcore-group-icon-${gid}`);
  });
  useEffect(() => {
    const gid = workspace?.roblox_group_id;
    if (!gid) { setGroupIcon(null); return; }
    const key = `fluxcore-group-icon-${gid}`;
    const cached = localStorage.getItem(key);
    if (cached) { setGroupIcon(cached); return; }
    fetch(`${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/roblox-group-icon?groupIds=${gid}`)
      .then(r => r.json())
      .then(j => {
        const img = j?.data?.[0]?.imageUrl;
        if (img) { setGroupIcon(img); try { localStorage.setItem(key, img); } catch { /* ignore */ } }
      })
      .catch(() => {});
  }, [workspace?.roblox_group_id]);

  const navItems = useMemo(
    () => NAV
      .filter(n => n.to === "dashboard" || !config.hiddenNav.includes(n.to))
      .map(n => ({ ...n, label: t(n.label) })),
    [config.hiddenNav, t],
  );

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 1) return [];
    return navItems.filter(n => n.label.toLowerCase().includes(s)).slice(0, 5);
  }, [q, navItems]);

  // People search (debounced)
  useEffect(() => {
    const s = q.trim();
    if (!workspaceId || s.length < 2) { setPeople([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("workspace_members")
        .select("id, roblox_username, roblox_user_id, role")
        .eq("workspace_id", workspaceId)
        .ilike("roblox_username", `%${s}%`)
        .limit(6);
      setPeople(data || []);
      setSearching(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [q, workspaceId]);

  useEffect(() => { setDrawer(false); }, [pathname]);

  // ⌘K / Ctrl+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") { setQ(""); searchRef.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);



  const Rail = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ to, icon: Icon, label }) => {
        const active = pathname.startsWith(`${base}/${to}`);
        return (
          <NavLink
            key={to}
            to={`${base}/${to}`}
            className="group relative flex items-center gap-3 h-10 px-3 rounded-xl text-[13px] font-medium transition-all"
            style={{
              background: active ? `${accent}26` : "transparent",
              color: active ? "#ffffff" : "#93939b",
              boxShadow: active ? `inset 0 0 0 1px ${accent}40` : undefined,
            }}
          >
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all"
              style={{ height: active ? 18 : 0, background: accent }}
            />
            <Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.7} />
            <span className={mobile ? "" : "truncate"}>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen w-full flex font-nexus3 relative" style={{ background: "#0b0b0d", color: "#f5f5f7" }}>
      <DemoBanner />
      <style>{`
        .font-nexus3, .font-nexus3 * {
          font-family: 'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif;
          letter-spacing: -0.012em;
        }
        .font-nexus3 *::-webkit-scrollbar { width: 8px; height: 8px; }
        .font-nexus3 *::-webkit-scrollbar-thumb { background: #26262b; border-radius: 999px; }
        .n3-glass { background: rgba(20,20,24,0.72); backdrop-filter: blur(18px); border: 1px solid rgba(255,255,255,0.07); }
        .n3-side {
          background:
            linear-gradient(168deg, hsl(258 90% 66% / 0.32) 0%, hsl(275 70% 58% / 0.16) 48%, rgba(20,20,24,0.62) 100%),
            rgba(20,20,24,0.55);
          backdrop-filter: blur(22px);
          border: 1px solid rgba(255,255,255,0.09);
        }
      `}</style>

      {/* ambient accent light */}
      <div
        className="pointer-events-none fixed -top-40 left-1/3 w-[900px] h-[520px] rounded-full opacity-[0.16]"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 65%)`, filter: "blur(40px)" }}
      />

      {/* Floating sidebar — desktop */}
      <aside className="hidden md:flex w-[248px] shrink-0 p-3">
        <div className="n3-side rounded-2xl w-full flex flex-col p-3 sticky top-3 h-[calc(100vh-24px)]">
          <button
            onClick={() => navigate(`${base}/dashboard`)}
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ background: accent }}>
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold truncate">{workspace?.name || "Workspace"}</span>
              <span className="block text-[11px] text-white/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Nexus 3.0
              </span>
            </span>
          </button>

          <div className="my-3 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          <div className="flex-1 overflow-y-auto pr-1">
            <Rail />
          </div>

          <div className="pt-2 mt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <NavLink to={`${base}/settings`} className="flex items-center gap-3 h-10 px-3 rounded-xl text-[13px] text-white/60 hover:bg-white/5">
              <Settings className="w-[17px] h-[17px]" strokeWidth={1.7} /> Settings
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 px-3 md:px-5 pt-3">
          <div className="n3-glass rounded-2xl h-14 flex items-center gap-3 px-3">
            <button onClick={() => setDrawer(true)} className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <input
                ref={searchRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => { setFocused(false); setQ(""); }, 150)}
                placeholder="Search pages or people…"
                className="w-full h-9 pl-9 pr-16 rounded-xl text-[13px] outline-none transition-colors"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${focused ? `${accent}66` : "rgba(255,255,255,0.07)"}`,
                  boxShadow: focused ? `0 0 0 3px ${accent}1f` : undefined,
                  color: "#e9e9ee",
                }}
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center h-5 px-1.5 rounded-md text-[10px] font-medium text-white/35"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}>⌘K</kbd>

              {focused && q.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-11 rounded-2xl overflow-hidden n3-glass z-50 shadow-2xl">
                  {results.length > 0 && (
                    <>
                      <div className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-white/30 font-semibold">Pages</div>
                      {results.map(r => (
                        <button
                          key={r.to}
                          onMouseDown={e => { e.preventDefault(); navigate(`${base}/${r.to}`); setQ(""); }}
                          className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-white/5 flex items-center gap-2.5"
                        >
                          <r.icon className="w-4 h-4 text-white/45" strokeWidth={1.7} /> {r.label}
                        </button>
                      ))}
                    </>
                  )}

                  {(people.length > 0 || searching) && (
                    <div className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-white/30 font-semibold flex items-center gap-2">
                      People {searching && <Loader2 className="w-3 h-3 animate-spin" />}
                    </div>
                  )}
                  {people.map(p => (
                    <button
                      key={p.id}
                      onMouseDown={e => { e.preventDefault(); navigate(`${base}/members/${p.id}`); setQ(""); }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2.5"
                    >
                      <RobloxAvatar username={p.roblox_username || "?"} userId={p.roblox_user_id || ""} className="w-7 h-7 rounded-lg shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] truncate">{p.roblox_username || "Unknown"}</span>
                        <span className="block text-[11px] text-white/35 truncate">{p.role || "Member"}</span>
                      </span>
                    </button>
                  ))}

                  {!searching && results.length === 0 && people.length === 0 && (
                    <div className="px-3 py-4 text-[12px] text-white/35">No matches for “{q.trim()}”</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1" />

            <div className="relative">
              <button onClick={() => setMenu(m => !m)} className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-xl hover:bg-white/5 text-[13px]">
                <RobloxAvatar
                  username={robloxUsername || "?"}
                  userId={robloxUserId || ""}
                  className="w-7 h-7 rounded-lg shrink-0"
                />
                <span className="hidden sm:inline max-w-[120px] truncate">{robloxUsername || "Account"}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>

              {menu && (
                <div className="absolute right-0 top-11 w-56 rounded-xl overflow-hidden n3-glass z-50 py-1">
                  {!isPortalHost() && (
                    <button onClick={() => { navigate("/workspaces"); setMenu(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-white/5">Switch workspace</button>
                  )}
                  <button onClick={() => { navigate(`${base}/settings`); setMenu(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-white/5">Workspace settings</button>
                  <div className="my-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                  <button onClick={async () => { await signOut(); navigate("/login"); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-white/5 text-[#f55a4a] flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-8 relative">{children}</main>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className={cn("relative w-72 max-w-[85%] h-full p-3")}>
            <div className="n3-side rounded-2xl h-full flex flex-col p-3">
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="text-sm font-semibold truncate">{workspace?.name || "Workspace"}</span>
                <button onClick={() => setDrawer(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto"><Rail mobile /></div>
              <NavLink to={`${base}/settings`} className="flex items-center gap-3 h-10 px-3 rounded-xl text-[13px] text-white/60 hover:bg-white/5">
                <Settings className="w-[17px] h-[17px]" strokeWidth={1.7} /> Settings
              </NavLink>
              <button onClick={async () => { await signOut(); navigate("/login"); }} className="flex items-center gap-3 h-10 px-3 rounded-xl text-[13px] text-[#f55a4a]">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Shared V3 surface tokens */
export const n3 = {
  card: "rounded-2xl border",
  cardStyle: { background: "rgba(20,20,24,0.72)", borderColor: "rgba(255,255,255,0.07)" } as const,
  text: "#f5f5f7",
  textDim: "#a1a1a9",
  textMuted: "#75757e",
};
