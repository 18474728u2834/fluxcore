import { ReactNode, useState, useEffect, useMemo, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home, Clock, FileText, Briefcase, Users, Grid3x3, Settings, LogOut,
  Search, ChevronDown, Calendar, Target, ShieldCheck, Megaphone, Sparkles,
  Building2, Heart, ArrowUp, ClipboardList, Menu, X, MoreHorizontal,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useUIVersion } from "@/hooks/useUIVersion";
import { supabase } from "@/integrations/supabase/client";
import bargainsLogo from "@/assets/bargains-logo.png";

interface ShellProps {
  children: ReactNode;
}

const NAV = [
  { to: "dashboard",  icon: Home,        label: "Dashboard" },
  { to: "activity",   icon: Clock,       label: "Activity"  },
  { to: "documents",  icon: FileText,    label: "Documents" },
  { to: "loa",        icon: Briefcase,   label: "LOA"       },
  { to: "members",    icon: Users,       label: "Members"   },
  { to: "sessions",   icon: Calendar,    label: "Sessions"  },
  { to: "quotas",     icon: Target,      label: "Quotas"    },
  { to: "wall",       icon: Megaphone,   label: "Wall"      },
  { to: "kudos",      icon: Heart,       label: "Kudos"     },
  { to: "promotions", icon: ArrowUp,     label: "Promotions"},
  { to: "applications", icon: ClipboardList, label: "Applications"},
  { to: "roles",      icon: ShieldCheck, label: "Roles"     },
  { to: "staff",      icon: Grid3x3,     label: "Blacklist" },
];

type DeptRow = { id: string; name: string; slug: string; primary_color: string | null; icon: string | null };
type SearchHit = { type: "member" | "session" | "document" | "page"; id: string; label: string; sub?: string; to: string };

const PAGE_INDEX: Array<{ label: string; to: string }> = [
  { label: "Dashboard", to: "dashboard" },
  { label: "Activity", to: "activity" },
  { label: "Documents", to: "documents" },
  { label: "LOA", to: "loa" },
  { label: "Members", to: "members" },
  { label: "Sessions", to: "sessions" },
  { label: "Quotas", to: "quotas" },
  { label: "Wall", to: "wall" },
  { label: "Kudos", to: "kudos" },
  { label: "Promotions", to: "promotions" },
  { label: "Applications", to: "applications" },
  { label: "Roles", to: "roles" },
  { label: "Blacklist", to: "staff" },
  { label: "Settings", to: "settings" },
  { label: "Setup Tracking", to: "setup-tracking" },
  { label: "Departments", to: "departments" },
];

export function BargainsShell({ children }: ShellProps) {
  const { workspace, workspaceId, isOwner } = useWorkspace();
  const { user, signOut } = useAuth();
  const { setVersion } = useUIVersion();

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const BARGAINS_WS_ID = "b4de7ffa-81e6-4d05-8e9d-8ce0a4904630";
  const isBargains = workspace?.id === BARGAINS_WS_ID;
  const accentColor = isBargains ? "#f55a4a" : (workspace?.primary_color || "#3b82f6");
  const wsInitials = (workspace?.name || "").trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "·";

  const iconCacheKey = workspace?.roblox_group_id ? `fluxcore-group-icon-${workspace.roblox_group_id}` : null;
  const [groupIcon, setGroupIcon] = useState<string | null>(() => {
    if (isBargains) return bargainsLogo;
    if (!iconCacheKey || typeof window === "undefined") return null;
    return localStorage.getItem(iconCacheKey);
  });

  useEffect(() => {
    if (isBargains) { setGroupIcon(bargainsLogo); return; }
    if (!workspace?.roblox_group_id) { setGroupIcon(null); return; }
    const key = `fluxcore-group-icon-${workspace.roblox_group_id}`;
    const cached = localStorage.getItem(key);
    if (cached) { setGroupIcon(cached); return; }
    fetch(`${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/roblox-group-icon?groupIds=${workspace.roblox_group_id}`)
      .then(r => r.json())
      .then(j => {
        const img = j?.data?.[0]?.imageUrl;
        if (img) { setGroupIcon(img); try { localStorage.setItem(key, img); } catch {} }
      })
      .catch(() => {});
  }, [workspace?.roblox_group_id, isBargains]);

  const base = `/w/${workspaceId}`;

  // Setup Tracking permission gate
  const [canManageSettings, setCanManageSettings] = useState(false);
  useEffect(() => {
    if (!workspaceId) { setCanManageSettings(false); return; }
    if (isOwner) { setCanManageSettings(true); return; }
    let cancelled = false;
    supabase
      .rpc("has_workspace_permission", { _workspace_id: workspaceId, _permission: "manage_settings" })
      .then(({ data, error }) => { if (!cancelled) setCanManageSettings(!error && !!data); });
    return () => { cancelled = true; };
  }, [workspaceId, isOwner]);

  // Departments visible to current user
  const [myDepartments, setMyDepartments] = useState<DeptRow[]>([]);
  const activeDeptSlug = useMemo(() => {
    const m = pathname.match(/\/d\/([^/]+)/);
    return m?.[1] ?? null;
  }, [pathname]);
  const activeDept = myDepartments.find((d) => d.slug === activeDeptSlug) || null;

  useEffect(() => {
    if (!workspaceId || !user) { setMyDepartments([]); return; }
    let cancelled = false;
    (async () => {
      if (isOwner) {
        const { data } = await supabase
          .from("departments")
          .select("id, name, slug, primary_color, icon")
          .eq("workspace_id", workspaceId)
          .order("name");
        if (!cancelled) setMyDepartments((data as DeptRow[]) || []);
        return;
      }
      const { data: member } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) { if (!cancelled) setMyDepartments([]); return; }
      const { data } = await supabase
        .from("department_members")
        .select("departments(id, name, slug, primary_color, icon, workspace_id)")
        .eq("member_id", (member as any).id);
      if (cancelled) return;
      const list = (data || [])
        .map((r: any) => r.departments)
        .filter((d: any) => d && d.workspace_id === workspaceId);
      setMyDepartments(list as DeptRow[]);
    })();
    return () => { cancelled = true; };
  }, [workspaceId, user, isOwner]);

  // Global search
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [highlight, setHighlight] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!workspaceId) { setSearchHits([]); return; }
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchHits([]);
      setHighlight(0);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const like = `%${q}%`;
      const [members, sessions, docs, users] = await Promise.all([
        supabase.from("workspace_members")
          .select("id, roblox_username, role")
          .eq("workspace_id", workspaceId)
          .ilike("roblox_username", like)
          .limit(5),
        supabase.from("scheduled_sessions")
          .select("id, title, starts_at")
          .eq("workspace_id", workspaceId)
          .ilike("title", like)
          .limit(4),
        supabase.from("workspace_documents")
          .select("id, title")
          .eq("workspace_id", workspaceId)
          .ilike("title", like)
          .limit(4),
        supabase.from("verified_users")
          .select("user_id, roblox_username, roblox_user_id")
          .ilike("roblox_username", like)
          .limit(5),
      ]);
      if (cancelled) return;
      const hits: SearchHit[] = [];
      (members.data || []).forEach((m: any) => hits.push({
        type: "member", id: m.id, label: m.roblox_username, sub: m.role || "Member",
        to: `${base}/members/${m.id}`,
      }));
      const seen = new Set((members.data || []).map((m: any) => (m.roblox_username || "").toLowerCase()));
      const unseenUsers = (users.data || []).filter((u: any) => {
        const key = (u.roblox_username || "").toLowerCase();
        return key && !seen.has(key);
      });
      const robloxIds = unseenUsers.map((u: any) => u.roblox_user_id).filter(Boolean);
      const memberByRoblox: Record<string, { id: string; role: string | null }> = {};
      if (robloxIds.length) {
        const { data: mm } = await supabase.from("workspace_members")
          .select("id, roblox_user_id, role")
          .eq("workspace_id", workspaceId)
          .in("roblox_user_id", robloxIds);
        (mm || []).forEach((m: any) => { memberByRoblox[String(m.roblox_user_id)] = { id: m.id, role: m.role }; });
      }
      unseenUsers.forEach((u: any) => {
        seen.add((u.roblox_username || "").toLowerCase());
        const match = memberByRoblox[String(u.roblox_user_id)];
        if (!match) return;
        hits.push({
          type: "member", id: match.id, label: u.roblox_username,
          sub: match.role || "Member",
          to: `${base}/members/${match.id}`,
        });
      });
      (sessions.data || []).forEach((s: any) => hits.push({
        type: "session", id: s.id, label: s.title || "Session",
        sub: s.starts_at ? new Date(s.starts_at).toLocaleString() : undefined,
        to: `${base}/sessions`,
      }));
      (docs.data || []).forEach((d: any) => hits.push({
        type: "document", id: d.id, label: d.title || "Document",
        to: `${base}/documents/${d.id}`,
      }));
      const ql = q.toLowerCase();
      PAGE_INDEX
        .filter((p) => p.label.toLowerCase().includes(ql))
        .slice(0, 4)
        .forEach((p) => hits.push({ type: "page", id: p.to, label: p.label, to: `${base}/${p.to}` }));
      setSearchHits(hits.slice(0, 12));
      setHighlight(0);
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQ, workspaceId, base]);

  const runHit = (h: SearchHit) => {
    setSearchOpen(false);
    setSearchQ("");
    if (h.to.startsWith("http")) {
      window.open(h.to, "_blank", "noopener,noreferrer");
    } else {
      navigate(h.to);
    }
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setSearchOpen(false); (e.target as HTMLInputElement).blur(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, searchHits.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); return; }
    if (e.key === "Enter")     { const hit = searchHits[highlight]; if (hit) runHit(hit); return; }
  };

  // When in a department, page paths sit under /d/<slug>/
  const navBase = activeDeptSlug ? `${base}/d/${activeDeptSlug}` : base;
  const navItems = NAV;

  return (
    <div className="min-h-screen w-full flex font-bargains" style={{ background: "#0f0f10", color: "#fafafa" }}>
      <style>{`
        .font-bargains, .font-bargains * {
          font-family: 'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif;
          letter-spacing: -0.011em;
        }
        .font-bargains *::-webkit-scrollbar { width: 8px; height: 8px; }
        .font-bargains *::-webkit-scrollbar-thumb { background: #2a2a2c; border-radius: 2px; }
      `}</style>

      {/* Slim icon rail */}
      <aside className="w-[60px] shrink-0 flex flex-col items-center py-3 border-r" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
        <NavLink to={navBase + "/dashboard"} className="w-9 h-9 rounded-md flex items-center justify-center mb-3 overflow-hidden" style={{ background: activeDept?.primary_color || accentColor }}>
          {groupIcon ? <img src={groupIcon} className="w-9 h-9 object-cover" /> : <span className="text-white font-bold text-sm">{wsInitials}</span>}
        </NavLink>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = pathname.startsWith(`${navBase}/${to}`);
            return (
              <NavLink key={to} to={`${navBase}/${to}`} title={label}
                className="w-9 h-9 rounded-md flex items-center justify-center transition-colors"
                style={{
                  background: active ? "#1f1f22" : "transparent",
                  color: active ? "#fff" : "#7a7a7e",
                }}>
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </NavLink>
            );
          })}

          {myDepartments.length > 0 && (
            <>
              <div className="my-2 w-6 mx-auto border-t" style={{ borderColor: "#1f1f22" }} />
              {myDepartments.map((d) => {
                const active = activeDeptSlug === d.slug;
                const initials = d.name.trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
                return (
                  <NavLink
                    key={d.id}
                    to={`${base}/d/${d.slug}/dashboard`}
                    title={`${d.name} department`}
                    className="w-9 h-9 rounded-md flex items-center justify-center transition-colors text-[10px] font-bold"
                    style={{
                      background: active ? (d.primary_color || accentColor) : "#1a1a1c",
                      color: active ? "#fff" : "#cfcfd1",
                    }}
                  >
                    {d.icon ? <span style={{ fontSize: 14 }}>{d.icon}</span> : (initials || <Building2 className="w-4 h-4" />)}
                  </NavLink>
                );
              })}
              {activeDeptSlug && (
                <button
                  title="Back to workspace"
                  onClick={() => navigate(`${base}/dashboard`)}
                  className="w-9 h-9 rounded-md flex items-center justify-center text-[#7a7a7e] hover:bg-[#1a1a1c]"
                >
                  ↺
                </button>
              )}
            </>
          )}
        </nav>
        <NavLink to={navBase + "/settings"} className="w-9 h-9 rounded-md flex items-center justify-center hover:bg-[#1a1a1c]" style={{ color: "#7a7a7e" }}>
          <Settings className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </NavLink>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center px-4 gap-4 border-b shrink-0 relative" style={{ background: "#0a0a0b", borderColor: "#1a1a1c" }}>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(m => !m)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#1a1a1c] transition-colors"
            >
              {groupIcon ? (
                <img src={groupIcon} className="w-7 h-7 rounded-md object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-[10px]" style={{ background: accentColor }}>{wsInitials}</div>
              )}
              <span className="text-sm font-semibold">{workspace?.name || "Workspace"}</span>
              {activeDept && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: activeDept.primary_color || accentColor, color: "#fff" }}>
                  {activeDept.name}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-12 w-60 rounded-md border py-1 z-50" style={{ background: "#141416", borderColor: "#26262a" }}>
                <button onClick={() => { navigate("/workspaces"); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22]">Switch workspace</button>
                {activeDept && (
                  <>
                    <button onClick={() => { navigate(`${base}/d/${activeDept.slug}/dept-settings`); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22]">{activeDept.name} settings</button>
                    <button onClick={() => { navigate(`${base}/dashboard`); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22]">Back to main workspace</button>
                  </>
                )}
                <button onClick={() => { navigate(`${base}/settings`); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22]">Workspace settings</button>
                {isOwner && (
                  <button onClick={() => { navigate(`${base}/departments`); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22]">Manage departments</button>
                )}
                <div className="my-1 border-t" style={{ borderColor: "#22222a" }} />
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#6a6a6e]">UI Style</div>
                <button onClick={() => { setVersion("nexus"); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Nexus UI <span className="ml-auto text-[10px] text-[#6a6a6e]">current</span>
                </button>
                <button onClick={() => { setVersion("classic"); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22]">Classic UI</button>
                <button onClick={() => { setVersion("minimal"); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22]">Fluxcore New UI</button>
                <div className="my-1 border-t" style={{ borderColor: "#22222a" }} />
                <button onClick={async () => { await signOut(); navigate("/login"); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22] text-[#f55a4a] flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6a6a6e]" />
              <input
                ref={searchRef}
                value={searchQ}
                onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                onKeyDown={onSearchKey}
                placeholder="Search members, sessions, docs, pages… (⌘K)"
                className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] outline-none border"
                style={{ background: "#161618", borderColor: "#1f1f22", color: "#e5e5e7" }}
              />
              {searchOpen && searchHits.length > 0 && (
                <div className="absolute left-0 right-0 top-11 max-h-[420px] overflow-auto rounded-md border z-50" style={{ background: "#141416", borderColor: "#26262a" }}>
                  {searchHits.map((h, i) => (
                    <button
                      key={`${h.type}-${h.id}`}
                      onMouseDown={(e) => { e.preventDefault(); runHit(h); }}
                      onMouseEnter={() => setHighlight(i)}
                      className="w-full text-left px-3 py-2 flex items-center gap-3 text-sm"
                      style={{ background: i === highlight ? "#1f1f22" : "transparent" }}
                    >
                      <span className="text-[10px] uppercase tracking-wider w-16 text-[#6a6a6e]">{h.type}</span>
                      <span className="flex-1 text-[#e5e5e7]">{h.label}</span>
                      {h.sub && <span className="text-[11px] text-[#6a6a6e]">{h.sub}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-[140px]" />
        </header>

        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}

/* Shared design primitives — Hyra: square-ish corners, no pills */
export const bx = {
  card: "rounded-md border",
  cardStyle: { background: "#1a1a1c", borderColor: "#26262a" } as const,
  cardInner: { background: "#141416", borderColor: "#22222a" } as const,
  coral: "#f55a4a",
  success: "#22c55e",
  warning: "#f59e0b",
  text: "#fafafa",
  textDim: "#8a8a8e",
  textMuted: "#6a6a6e",
  borderColor: "#26262a",
};
