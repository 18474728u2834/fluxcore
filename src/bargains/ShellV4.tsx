import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home, Clock, FileText, Briefcase, Users, Grid3x3, Settings, LogOut,
  Search, Calendar, Target, Megaphone, Heart, ArrowUp, ClipboardList,
  Menu, X, ChevronDown, Loader2, PanelLeftClose, PanelLeft, CornerDownLeft,
  Star, Inbox, Zap, Bell, Radio, ArrowRight,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useNexusConfig } from "@/hooks/useNexusConfig";
import { useLexicon } from "@/hooks/useLexicon";
import { useWorkspacePulse, untilLabel } from "@/hooks/useWorkspacePulse";
import { isPortalHost } from "@/lib/sso";
import { DemoBanner } from "@/components/DemoBanner";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; icon: any; label: string };

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { to: "dashboard", icon: Home, label: "Dashboard" },
      { to: "activity", icon: Clock, label: "Activity" },
      { to: "wall", icon: Megaphone, label: "Wall" },
    ],
  },
  {
    title: "People",
    items: [
      { to: "members", icon: Users, label: "Members" },
      { to: "kudos", icon: Heart, label: "Kudos" },
      { to: "promotions", icon: ArrowUp, label: "Promotions" },
      { to: "applications", icon: ClipboardList, label: "Applications" },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "sessions", icon: Calendar, label: "Sessions" },
      { to: "quotas", icon: Target, label: "Quotas" },
      { to: "loa", icon: Briefcase, label: "LOA" },
      { to: "documents", icon: FileText, label: "Documents" },
      { to: "staff", icon: Grid3x3, label: "Blacklist" },
    ],
  },
];

const RECENTS_MAX = 4;

/**
 * Nexus UI 4.0 — early access.
 *
 * What makes it a new version, not a reskin:
 *  - Pinned pages and automatic recents at the top of the rail
 *  - A live inbox: who is in game, what is waiting on a decision, what is next
 *  - A real command palette with actions, pages and people, keyboard driven
 *  - A collapsible rail and a quiet chrome so page content carries the colour
 */
export function ShellV4({ children }: { children: ReactNode }) {
  const { workspace, workspaceId } = useWorkspace();
  const { config } = useNexusConfig(workspaceId);
  const { t } = useLexicon(workspaceId);
  const { signOut, robloxUsername, robloxUserId } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pulse = useWorkspacePulse(workspaceId);

  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [inbox, setInbox] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("fluxcore-n4-rail") === "collapsed"; } catch { return false; }
  });
  const [palette, setPalette] = useState(false);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const base = `/w/${workspaceId}`;
  const accent = workspace?.primary_color || "#2f74a8";
  const initials = (workspace?.name || "").trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "·";

  // ---- pins + recents -------------------------------------------------------
  const pinKey = `fluxcore-n4-pins-${workspaceId || "x"}`;
  const recentKey = `fluxcore-n4-recent-${workspaceId || "x"}`;
  const [pins, setPins] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      setPins(JSON.parse(localStorage.getItem(pinKey) || "[]"));
      setRecents(JSON.parse(localStorage.getItem(recentKey) || "[]"));
    } catch { /* ignore */ }
  }, [pinKey, recentKey]);

  const togglePin = useCallback((to: string) => {
    setPins(prev => {
      const next = prev.includes(to) ? prev.filter(p => p !== to) : [...prev, to].slice(-6);
      try { localStorage.setItem(pinKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [pinKey]);

  // ---- group icon -----------------------------------------------------------
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

  const groups = useMemo(
    () => GROUPS
      .map(g => ({
        ...g,
        items: g.items
          .filter(n => n.to === "dashboard" || !config.hiddenNav.includes(n.to))
          .map(n => ({ ...n, label: t(n.label) })),
      }))
      .filter(g => g.items.length > 0),
    [config.hiddenNav, t],
  );

  const flatNav = useMemo(() => groups.flatMap(g => g.items), [groups]);
  const byKey = useMemo(() => Object.fromEntries(flatNav.map(n => [n.to, n])), [flatNav]);

  const currentKey = useMemo(() => pathname.replace(`${base}/`, "").split("/")[0], [pathname, base]);
  const current = byKey[currentKey]?.label || t("Settings");

  // remember recents
  useEffect(() => {
    if (!currentKey || !byKey[currentKey]) return;
    setRecents(prev => {
      const next = [currentKey, ...prev.filter(r => r !== currentKey)].slice(0, RECENTS_MAX);
      try { localStorage.setItem(recentKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [currentKey, byKey, recentKey]);

  // ---- palette data ---------------------------------------------------------
  const actions = useMemo(() => ([
    { key: "act-session", label: `New ${t("Session").toLowerCase()}`, hint: "Schedule", icon: Calendar, run: () => navigate(`${base}/sessions?new=1`) },
    { key: "act-wall", label: "Post to the Wall", hint: "Announce", icon: Megaphone, run: () => navigate(`${base}/wall`) },
    { key: "act-kudos", label: "Give kudos", hint: "Praise", icon: Heart, run: () => navigate(`${base}/kudos`) },
    { key: "act-loa", label: `Review ${t("LOA")} requests`, hint: pulse.loaPending ? `${pulse.loaPending} waiting` : "Approvals", icon: Briefcase, run: () => navigate(`${base}/loa`) },
    { key: "act-settings", label: "Workspace settings", hint: "Configure", icon: Settings, run: () => navigate(`${base}/settings`) },
    { key: "act-rail", label: "Collapse the sidebar", hint: "Layout", icon: PanelLeftClose, run: () => toggleRail() },
    { key: "act-signout", label: "Sign out", hint: "Account", icon: LogOut, run: async () => { await signOut(); navigate("/login"); } },
  ]), [base, t, pulse.loaPending]); // eslint-disable-line react-hooks/exhaustive-deps

  const actionResults = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return actions.slice(0, 3);
    return actions.filter(a => a.label.toLowerCase().includes(s)).slice(0, 5);
  }, [q, actions]);

  const pageResults = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return (pins.length ? pins : recents).map(k => byKey[k]).filter(Boolean).slice(0, 5) as NavItem[];
    return flatNav.filter(n => n.label.toLowerCase().includes(s)).slice(0, 6);
  }, [q, flatNav, pins, recents, byKey]);

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
    }, 200);
    return () => clearTimeout(timer);
  }, [q, workspaceId]);

  useEffect(() => { setDrawer(false); setPalette(false); setInbox(false); }, [pathname]);
  useEffect(() => { setCursor(0); }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(p => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") { e.preventDefault(); toggleRail(); }
      if (e.key === "Escape") { setPalette(false); setInbox(false); }
      if (e.key === "i" && !typing && !e.metaKey && !e.ctrlKey && !palette) setInbox(v => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (palette) { setQ(""); setTimeout(() => inputRef.current?.focus(), 20); }
  }, [palette]);

  function toggleRail() {
    setCollapsed(c => {
      try { localStorage.setItem("fluxcore-n4-rail", c ? "open" : "collapsed"); } catch { /* ignore */ }
      return !c;
    });
  }

  type Row =
    | { kind: "action"; key: string; item: (typeof actions)[number] }
    | { kind: "page"; key: string; item: NavItem }
    | { kind: "person"; key: string; item: any };

  const rows: Row[] = useMemo(() => [
    ...actionResults.map(a => ({ kind: "action" as const, key: a.key, item: a })),
    ...pageResults.map(p => ({ kind: "page" as const, key: `p-${p.to}`, item: p })),
    ...people.map(p => ({ kind: "person" as const, key: `u-${p.id}`, item: p })),
  ], [actionResults, pageResults, people]);

  const runRow = (row: Row) => {
    setPalette(false);
    if (row.kind === "action") row.item.run();
    else if (row.kind === "page") navigate(`${base}/${row.item.to}`);
    else navigate(`${base}/members/${row.item.id}`);
  };

  const inboxCount = pulse.loaPending + pulse.promotionsPending;

  // ---- rail -----------------------------------------------------------------
  const RailLink = ({ item, mini, showPin = true }: { item: NavItem; mini: boolean; showPin?: boolean }) => {
    const active = pathname.startsWith(`${base}/${item.to}`);
    const Icon = item.icon;
    return (
      <div className="group/nav relative">
        <NavLink
          to={`${base}/${item.to}`}
          title={mini ? item.label : undefined}
          className={`relative flex items-center ${mini ? "justify-center px-0" : "gap-3 px-3 pr-8"} h-9 rounded-lg text-[13px] font-medium transition-colors`}
          style={{ background: active ? "rgba(255,255,255,0.06)" : "transparent", color: active ? "#ffffff" : "#8b8b94" }}
        >
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full transition-all"
            style={{ height: active ? 16 : 0, background: accent }} />
          <Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.7} style={active ? { color: accent } : undefined} />
          {!mini && <span className="truncate">{item.label}</span>}
        </NavLink>
        {!mini && showPin && (
          <button
            onClick={() => togglePin(item.to)}
            aria-label={pins.includes(item.to) ? `Unpin ${item.label}` : `Pin ${item.label}`}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center transition-opacity ${
              pins.includes(item.to) ? "opacity-100" : "opacity-0 group-hover/nav:opacity-100"
            }`}
          >
            <Star className="w-3.5 h-3.5" strokeWidth={1.8}
              style={{ color: pins.includes(item.to) ? accent : "rgba(255,255,255,0.35)", fill: pins.includes(item.to) ? accent : "transparent" }} />
          </button>
        )}
      </div>
    );
  };

  const Rail = ({ mobile = false }: { mobile?: boolean }) => {
    const mini = collapsed && !mobile;
    const pinned = pins.map(k => byKey[k]).filter(Boolean) as NavItem[];
    const recent = recents.map(k => byKey[k]).filter(Boolean).filter(n => !pins.includes(n.to)).slice(0, 3) as NavItem[];
    return (
      <nav className="flex flex-col gap-5">
        {pinned.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {!mini && <span className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">Pinned</span>}
            {pinned.map(item => <RailLink key={`pin-${item.to}`} item={item} mini={mini} />)}
          </div>
        )}
        {!mini && recent.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">Recent</span>
            {recent.map(item => <RailLink key={`rec-${item.to}`} item={item} mini={mini} />)}
          </div>
        )}
        {groups.map(g => (
          <div key={g.title} className="flex flex-col gap-0.5">
            {!mini && <span className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">{g.title}</span>}
            {g.items.map(item => <RailLink key={item.to} item={item} mini={mini} />)}
          </div>
        ))}
      </nav>
    );
  };

  return (
    <div className="min-h-screen w-full flex font-nexus4 relative" style={{ background: "#08080a", color: "#f2f2f5" }}>
      <DemoBanner />
      <style>{`
        .font-nexus4, .font-nexus4 * {
          font-family: 'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif;
          letter-spacing: -0.014em;
        }
        .font-nexus4 *::-webkit-scrollbar { width: 7px; height: 7px; }
        .font-nexus4 *::-webkit-scrollbar-thumb { background: #222228; border-radius: 999px; }
        .n4-panel { background: rgba(17,17,20,0.88); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); }
        .n4-in { animation: n4in .15s ease-out; }
        .n4-slide { animation: n4slide .18s cubic-bezier(.2,.8,.3,1); }
        @keyframes n4in { from { opacity: 0; transform: translateY(-4px) scale(.99); } to { opacity: 1; transform: none; } }
        @keyframes n4slide { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-56 left-1/4 w-[780px] h-[480px] rounded-full opacity-[0.13]"
          style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 65%)`, filter: "blur(60px)" }} />
        <div className="absolute bottom-[-220px] right-[-120px] w-[620px] h-[420px] rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`, filter: "blur(70px)" }} />
      </div>

      {/* Desktop rail */}
      <aside className={`hidden md:flex shrink-0 flex-col transition-[width] duration-200 ${collapsed ? "w-[68px]" : "w-[240px]"} border-r`}
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(10,10,12,0.7)", backdropFilter: "blur(18px)" }}>
        <div className="sticky top-0 h-screen flex flex-col p-3">
          <button
            onClick={() => navigate(`${base}/dashboard`)}
            className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5 px-2"} py-2 rounded-lg hover:bg-white/5 transition-colors text-left`}
          >
            {groupIcon ? (
              <img src={groupIcon} alt={workspace?.name || "Workspace"} className="w-8 h-8 rounded-lg object-cover shrink-0"
                style={{ boxShadow: `0 0 0 1px ${accent}40` }} />
            ) : (
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ background: accent }}>
                {initials}
              </span>
            )}
            {!collapsed && (
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold truncate">{workspace?.name || "Workspace"}</span>
                <span className="block text-[10px] text-white/35">Nexus 4.0</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setPalette(true)}
            className={`mt-3 flex items-center ${collapsed ? "justify-center" : "gap-2 px-2.5"} h-9 rounded-lg text-[12.5px] text-white/45 transition-colors hover:text-white/70`}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Search className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            {!collapsed && (<><span className="flex-1 text-left">Search or jump…</span><kbd className="text-[10px] text-white/30">⌘K</kbd></>)}
          </button>

          <div className="flex-1 overflow-y-auto pr-0.5 mt-5"><Rail /></div>

          <div className="pt-2 mt-2 border-t space-y-0.5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <NavLink to={`${base}/settings`}
              className={`flex items-center ${collapsed ? "justify-center" : "gap-3 px-3"} h-9 rounded-lg text-[13px] text-white/55 hover:bg-white/5`}>
              <Settings className="w-[17px] h-[17px]" strokeWidth={1.7} />{!collapsed && "Settings"}
            </NavLink>
            <button onClick={toggleRail}
              className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3 px-3"} h-9 rounded-lg text-[13px] text-white/40 hover:bg-white/5`}>
              {collapsed ? <PanelLeft className="w-[17px] h-[17px]" strokeWidth={1.7} /> : <><PanelLeftClose className="w-[17px] h-[17px]" strokeWidth={1.7} /> Collapse</>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="sticky top-0 z-30 h-14 flex items-center gap-2 px-3 md:px-6 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(8,8,10,0.72)", backdropFilter: "blur(18px)" }}>
          <button onClick={() => setDrawer(true)} className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex items-center gap-2 text-[13px]">
            <span className="hidden sm:inline text-white/30 truncate">{workspace?.name || "Workspace"}</span>
            <span className="hidden sm:inline text-white/20">/</span>
            <span className="font-semibold truncate">{current}</span>
          </div>

          <div className="flex-1" />

          {/* live presence pill */}
          <span className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-full text-[12px]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)" }}>
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </span>
            {pulse.staffInGame} in game
          </span>

          <button onClick={() => setPalette(true)} className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5" aria-label="Search">
            <Search className="w-[18px] h-[18px]" />
          </button>

          <button onClick={() => setInbox(v => !v)} className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5" aria-label="Open inbox">
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
            {inboxCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                style={{ background: accent }}>{inboxCount > 9 ? "9+" : inboxCount}</span>
            )}
          </button>

          <div className="relative">
            <button onClick={() => setMenu(m => !m)} className="flex items-center gap-2 h-9 pl-1.5 pr-2 rounded-lg hover:bg-white/5 text-[13px]">
              <RobloxAvatar username={robloxUsername || "?"} userId={robloxUserId || ""} className="w-7 h-7 rounded-lg shrink-0" />
              <span className="hidden sm:inline max-w-[120px] truncate">{robloxUsername || "Account"}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-40" />
            </button>

            {menu && (
              <div className="absolute right-0 top-11 w-56 rounded-xl overflow-hidden n4-panel n4-in z-50 py-1 shadow-2xl">
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
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-7 pb-20 md:pb-10 relative">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>

      {/* Inbox side panel */}
      {inbox && (
        <div className="fixed inset-0 z-[55] flex justify-end" onMouseDown={() => setInbox(false)}>
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative w-[360px] max-w-[88%] h-full p-3" onMouseDown={e => e.stopPropagation()}>
            <div className="n4-panel n4-slide rounded-2xl h-full flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-4 h-14 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <Inbox className="w-4 h-4" style={{ color: accent }} />
                <span className="text-[14px] font-semibold flex-1">Today</span>
                <button onClick={() => setInbox(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center gap-1.5 text-[20px] font-semibold">
                      {pulse.staffInGame}
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-[10.5px] uppercase tracking-wider text-white/35 mt-0.5">In game now</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="text-[20px] font-semibold">{inboxCount}</div>
                    <div className="text-[10.5px] uppercase tracking-wider text-white/35 mt-0.5">Waiting on you</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-white/25 px-1">Approvals</div>
                  {[
                    { label: `${t("LOA")} requests`, count: pulse.loaPending, to: "loa", icon: Briefcase },
                    { label: "Promotion nominations", count: pulse.promotionsPending, to: "promotions", icon: ArrowUp },
                  ].map(r => (
                    <button key={r.to} onClick={() => navigate(`${base}/${r.to}`)}
                      className="w-full flex items-center gap-2.5 px-3 h-11 rounded-xl text-[13px] hover:bg-white/5"
                      style={{ background: "rgba(255,255,255,0.03)" }}>
                      <r.icon className="w-4 h-4 text-white/45" strokeWidth={1.7} />
                      <span className="flex-1 text-left">{r.label}</span>
                      <span className="text-[12px] font-semibold" style={{ color: r.count ? accent : "rgba(255,255,255,0.3)" }}>{r.count}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white/25" />
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-white/25 px-1">Coming up</div>
                  {pulse.upcoming.length === 0 && (
                    <div className="px-3 py-4 rounded-xl text-[12.5px] text-white/35" style={{ background: "rgba(255,255,255,0.03)" }}>
                      Nothing scheduled yet.
                    </div>
                  )}
                  {pulse.upcoming.map(s => (
                    <button key={s.id} onClick={() => navigate(`${base}/sessions`)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium truncate flex-1">{s.title}</span>
                        <span className="text-[11px] shrink-0" style={{ color: accent }}>{untilLabel(s.scheduled_at)}</span>
                      </div>
                      <div className="text-[11px] text-white/35 mt-0.5 truncate">
                        {new Date(s.scheduled_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                        {s.host_name ? ` · ${s.host_name}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 h-9 flex items-center border-t text-[10.5px] text-white/25" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                Press I to open this panel · refreshes every minute
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Command palette */}
      {palette && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" onMouseDown={() => setPalette(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-xl rounded-2xl overflow-hidden n4-panel n4-in shadow-2xl" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 h-14 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <Search className="w-4 h-4 text-white/35" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, rows.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
                  if (e.key === "Enter" && rows[cursor]) { e.preventDefault(); runRow(rows[cursor]); }
                }}
                placeholder="Run an action, jump to a page, find a person…"
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-white/30"
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin text-white/35" />}
            </div>

            <div className="max-h-[52vh] overflow-y-auto py-1.5">
              {rows.map((row, i) => {
                const active = i === cursor;
                const firstOf = (kind: Row["kind"]) => rows.findIndex(r => r.kind === kind) === i;
                const header =
                  firstOf("action") ? "Actions" :
                  firstOf("page") ? (q.trim() ? "Pages" : pins.length ? "Pinned" : "Recent") :
                  firstOf("person") ? "People" : null;

                const body = row.kind === "person" ? (
                  <button onMouseEnter={() => setCursor(i)} onClick={() => runRow(row)}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5"
                    style={{ background: active ? "rgba(255,255,255,0.06)" : "transparent" }}>
                    <RobloxAvatar username={row.item.roblox_username || "?"} userId={row.item.roblox_user_id || ""} className="w-7 h-7 rounded-lg shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] truncate">{row.item.roblox_username || "Unknown"}</span>
                      <span className="block text-[11px] text-white/35 truncate">{row.item.role || "Member"}</span>
                    </span>
                  </button>
                ) : (
                  <button onMouseEnter={() => setCursor(i)} onClick={() => runRow(row)}
                    className="w-full text-left px-3 py-2.5 text-[13px] flex items-center gap-2.5"
                    style={{ background: active ? "rgba(255,255,255,0.06)" : "transparent" }}>
                    {row.kind === "action"
                      ? <Zap className="w-4 h-4 shrink-0" strokeWidth={1.8} style={{ color: accent }} />
                      : <row.item.icon className="w-4 h-4 text-white/45 shrink-0" strokeWidth={1.7} />}
                    <span className="flex-1 truncate">{row.item.label}</span>
                    {row.kind === "action" && <span className="text-[11px] text-white/25">{row.item.hint}</span>}
                    {active && <CornerDownLeft className="w-3.5 h-3.5 text-white/30" />}
                  </button>
                );

                return (
                  <div key={row.key}>
                    {header && <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-white/25 font-semibold">{header}</div>}
                    {body}
                  </div>
                );
              })}
              {rows.length === 0 && !searching && (
                <div className="px-4 py-6 text-[13px] text-white/35">No matches for “{q.trim()}”</div>
              )}
            </div>

            <div className="flex items-center gap-4 px-4 h-9 border-t text-[10.5px] text-white/30" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span>↑↓ move</span><span>↵ open</span><span>⌘B sidebar</span><span>esc close</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="relative w-72 max-w-[85%] h-full p-3">
            <div className="n4-panel rounded-2xl h-full flex flex-col p-3">
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="flex items-center gap-2 min-w-0">
                  {groupIcon
                    ? <img src={groupIcon} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                    : <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: accent }}>{initials}</span>}
                  <span className="text-sm font-semibold truncate">{workspace?.name || "Workspace"}</span>
                </span>
                <button onClick={() => setDrawer(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto"><Rail mobile /></div>
              <NavLink to={`${base}/settings`} className="flex items-center gap-3 h-10 px-3 rounded-lg text-[13px] text-white/60 hover:bg-white/5">
                <Settings className="w-[17px] h-[17px]" strokeWidth={1.7} /> Settings
              </NavLink>
              <button onClick={async () => { await signOut(); navigate("/login"); }} className="flex items-center gap-3 h-10 px-3 rounded-lg text-[13px] text-[#f55a4a]">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Shared V4 surface tokens */
export const n4 = {
  card: "rounded-2xl border",
  cardStyle: { background: "rgba(17,17,20,0.86)", borderColor: "rgba(255,255,255,0.06)" } as const,
  text: "#f2f2f5",
  textDim: "#9c9ca6",
  textMuted: "#6f6f79",
};
