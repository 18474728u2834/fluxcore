import { ReactNode, useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home, Clock, FileText, Briefcase, Users, Grid3x3, Settings, LogOut,
  Search, ChevronDown, Calendar, Target, ShieldCheck, Megaphone, Sparkles,
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
  { to: "roles",      icon: ShieldCheck, label: "Roles"     },
  { to: "staff",      icon: Grid3x3,     label: "Blacklist" },
];

export function BargainsShell({ children }: ShellProps) {
  const { workspace, workspaceId } = useWorkspace();
  const { user, signOut } = useAuth();
  const { setVersion } = useUIVersion();

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [groupIcon, setGroupIcon] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
    if (cached) setGroupIcon(cached);
    fetch(`${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/roblox-group-icon?groupIds=${workspace.roblox_group_id}`)
      .then(r => r.json())
      .then(j => {
        const img = j?.data?.[0]?.imageUrl;
        if (img) { setGroupIcon(img); try { localStorage.setItem(key, img); } catch {} }
      })
      .catch(() => {});
  }, [workspace?.roblox_group_id, isBargains]);


  const base = `/w/${workspaceId}`;

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
        <NavLink to={base + "/dashboard"} className="w-9 h-9 rounded-md flex items-center justify-center mb-3 overflow-hidden" style={{ background: accentColor }}>
          {groupIcon ? <img src={groupIcon} className="w-9 h-9 object-cover" /> : <span className="text-white font-bold text-sm">{wsInitials}</span>}
        </NavLink>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = pathname.startsWith(`${base}/${to}`);
            return (
              <NavLink key={to} to={`${base}/${to}`} title={label}
                className="w-9 h-9 rounded-md flex items-center justify-center transition-colors"
                style={{
                  background: active ? "#1f1f22" : "transparent",
                  color: active ? "#fff" : "#7a7a7e",
                }}>
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </NavLink>
            );
          })}
        </nav>
        <NavLink to={base + "/settings"} className="w-9 h-9 rounded-md flex items-center justify-center hover:bg-[#1a1a1c]" style={{ color: "#7a7a7e" }}>
          <Settings className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </NavLink>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — only workspace pill + centered search */}
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
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-12 w-60 rounded-md border py-1 z-50" style={{ background: "#141416", borderColor: "#26262a" }}>
                <button onClick={() => { navigate("/workspaces"); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22]">Switch workspace</button>
                <button onClick={() => { navigate(`${base}/settings`); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#1f1f22]">Workspace settings</button>
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
                placeholder="Search anything..."
                className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] outline-none border"
                style={{ background: "#161618", borderColor: "#1f1f22", color: "#e5e5e7" }}
              />
            </div>
          </div>

          {/* spacer to balance layout */}
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
  text: "#fafafa",
  textDim: "#8a8a8e",
  textMuted: "#6a6a6e",
  borderColor: "#26262a",
};
