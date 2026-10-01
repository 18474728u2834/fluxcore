import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUp, Briefcase, Calendar, ChevronDown, ClipboardList, Clock, FileText,
  Grid3x3, Heart, Home, Loader2, LogOut, Menu, Megaphone, Search, Settings,
  Target, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "@/components/DemoBanner";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useLexicon } from "@/hooks/useLexicon";
import { useNexusConfig } from "@/hooks/useNexusConfig";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { isPortalHost } from "@/lib/sso";

const NAV = [
  { to: "dashboard", icon: Home, label: "Dashboard" },
  { to: "activity", icon: Clock, label: "Activity" },
  { to: "documents", icon: FileText, label: "Documents" },
  { to: "loa", icon: Briefcase, label: "LOA" },
  { to: "members", icon: Users, label: "Members" },
  { to: "sessions", icon: Calendar, label: "Sessions" },
  { to: "quotas", icon: Target, label: "Quotas" },
  { to: "wall", icon: Megaphone, label: "Wall" },
  { to: "kudos", icon: Heart, label: "Kudos" },
  { to: "promotions", icon: ArrowUp, label: "Promotions" },
  { to: "applications", icon: ClipboardList, label: "Applications" },
  { to: "staff", icon: Grid3x3, label: "Blacklist" },
];

export function ShellV4({ children }: { children: ReactNode }) {
  const { workspace, workspaceId } = useWorkspace();
  const { config } = useNexusConfig(workspaceId);
  const { t } = useLexicon(workspaceId);
  const { signOut, robloxUsername, robloxUserId } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const [drawer, setDrawer] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [people, setPeople] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const base = `/w/${workspaceId}`;
  const initials = (workspace?.name || "Workspace").split(/\s+/).map((word) => word[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const [groupIcon, setGroupIcon] = useState<string | null>(() => {
    const groupId = workspace?.roblox_group_id;
    return groupId && typeof window !== "undefined" ? localStorage.getItem(`fluxcore-group-icon-${groupId}`) : null;
  });

  useEffect(() => {
    const groupId = workspace?.roblox_group_id;
    if (!groupId) return;
    const key = `fluxcore-group-icon-${groupId}`;
    const cached = localStorage.getItem(key);
    if (cached) { setGroupIcon(cached); return; }
    fetch(`${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/roblox-group-icon?groupIds=${groupId}`)
      .then((response) => response.json())
      .then((result) => {
        const image = result?.data?.[0]?.imageUrl;
        if (!image) return;
        setGroupIcon(image);
        try { localStorage.setItem(key, image); } catch { /* storage unavailable */ }
      })
      .catch(() => {});
  }, [workspace?.roblox_group_id]);

  const navItems = useMemo(() => NAV
    .filter((item) => item.to === "dashboard" || !config.hiddenNav.includes(item.to))
    .map((item) => ({ ...item, label: t(item.label) })), [config.hiddenNav, t]);

  const pageResults = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? navItems.filter((item) => item.label.toLowerCase().includes(value)).slice(0, 5) : [];
  }, [query, navItems]);

  useEffect(() => {
    const value = query.trim();
    if (!workspaceId || value.length < 2) { setPeople([]); setSearching(false); return; }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.from("workspace_members")
        .select("id, roblox_username, roblox_user_id, role")
        .eq("workspace_id", workspaceId)
        .ilike("roblox_username", `%${value}%`)
        .limit(6);
      setPeople(data || []);
      setSearching(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query, workspaceId]);

  useEffect(() => { setDrawer(false); }, [pathname]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") { setQuery(""); searchRef.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => { navigate(path); setQuery(""); setFocused(false); };

  const Rail = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="n4-rail-list" aria-label="Workspace navigation">
      {navItems.map(({ to, icon: Icon, label }) => {
        const active = pathname.startsWith(`${base}/${to}`);
        return (
          <NavLink key={to} to={`${base}/${to}`} className={`n4-nav-item ${active ? "is-active" : ""}`} aria-label={label} title={mobile ? undefined : label}>
            <Icon aria-hidden="true" />
            {mobile && <span>{label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="nexus-v4">
      <DemoBanner />
      <aside className="n4-sidebar">
        <button className="n4-workspace-mark" onClick={() => navigate(`${base}/dashboard`)} aria-label={workspace?.name || "Workspace"} title={workspace?.name || "Workspace"}>
          {groupIcon ? <img src={groupIcon} alt="" /> : <span>{initials || "FC"}</span>}
        </button>
        <Rail />
        <NavLink to={`${base}/settings`} className={`n4-nav-item n4-settings ${pathname.startsWith(`${base}/settings`) ? "is-active" : ""}`} aria-label="Settings" title="Settings">
          <Settings aria-hidden="true" />
        </NavLink>
      </aside>

      <div className="n4-main-column">
        <header className="n4-header">
          <Button variant="ghost" size="icon" className="n4-mobile-menu" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu /></Button>
          <div className="n4-workspace-title">
            <strong>{workspace?.name || "Workspace"}</strong>
            <span>Nexus 4</span>
          </div>
          <div className="n4-search-wrap">
            <Search aria-hidden="true" />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 150)} placeholder="Search pages or people" aria-label="Search pages or people" />
            <kbd>⌘K</kbd>
            {focused && query.trim() && (
              <div className="n4-results">
                {pageResults.length > 0 && <p>Pages</p>}
                {pageResults.map((result) => <button key={result.to} onMouseDown={(event) => { event.preventDefault(); go(`${base}/${result.to}`); }}><result.icon />{result.label}</button>)}
                {(people.length > 0 || searching) && <p>People {searching && <Loader2 className="animate-spin" />}</p>}
                {people.map((person) => <button key={person.id} onMouseDown={(event) => { event.preventDefault(); go(`${base}/members/${person.id}`); }}><RobloxAvatar username={person.roblox_username || "?"} userId={person.roblox_user_id || ""} className="n4-result-avatar" /><span><strong>{person.roblox_username || "Unknown"}</strong><small>{person.role || "Member"}</small></span></button>)}
                {!searching && pageResults.length === 0 && people.length === 0 && <div className="n4-no-results">No matches for “{query.trim()}”</div>}
              </div>
            )}
          </div>
          <div className="n4-account-wrap">
            <Button variant="ghost" className="n4-account" onClick={() => setAccountOpen((open) => !open)}>
              <RobloxAvatar username={robloxUsername || "?"} userId={robloxUserId || ""} className="n4-account-avatar" />
              <span>{robloxUsername || "Account"}</span><ChevronDown />
            </Button>
            {accountOpen && <div className="n4-account-menu">
              {!isPortalHost() && <button onClick={() => go("/workspaces")}>Switch workspace</button>}
              <button onClick={() => go(`${base}/settings`)}>Workspace settings</button>
              <button className="danger" onClick={async () => { await signOut(); navigate("/login"); }}><LogOut />Sign out</button>
            </div>}
          </div>
        </header>
        <main className="n4-content">{children}</main>
      </div>

      {drawer && <div className="n4-drawer-layer">
        <button className="n4-drawer-backdrop" onClick={() => setDrawer(false)} aria-label="Close menu" />
        <aside className="n4-drawer">
          <div className="n4-drawer-head"><div>{groupIcon ? <img src={groupIcon} alt="" /> : <span>{initials || "FC"}</span>}<strong>{workspace?.name || "Workspace"}</strong></div><Button variant="ghost" size="icon" onClick={() => setDrawer(false)} aria-label="Close menu"><X /></Button></div>
          <Rail mobile />
          <NavLink to={`${base}/settings`} className="n4-nav-item"><Settings /><span>Settings</span></NavLink>
        </aside>
      </div>}
    </div>
  );
}

export const n4 = {
  card: "n4-card",
  text: "var(--n4-text)",
  textDim: "var(--n4-text-dim)",
  textMuted: "var(--n4-text-muted)",
};
