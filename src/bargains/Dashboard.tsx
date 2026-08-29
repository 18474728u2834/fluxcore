import { useEffect, useState, useMemo } from "react";
import { BargainsShell, bx } from "./Shell";
import { BirthdayPrompt } from "./BirthdayPrompt";
import { NexusCard, type CardData } from "./NexusCards";
import { Play, Cake, Hand } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useNexusConfig } from "@/hooks/useNexusConfig";
import { useAuth } from "@/hooks/useAuth";
import { RobloxAvatar } from "@/components/RobloxAvatar";


interface Birthday { user_id: string; roblox_username: string; roblox_user_id: string; birthday_month: number; birthday_day: number; }
interface NewMember { user_id: string; roblox_username: string; roblox_user_id: string; joined_at: string; }

const GREETINGS = ["Welcome", "Hiya", "Hey", "Howdy", "Yo", "G'day", "Hello", "Sup"];
const HERO_LINES = (n: string) => [
  `You're absolutely smashing it today, ${n}`,
  `Looking sharp today, ${n}`,
  `Great to see you back, ${n}`,
  `Let's get to work, ${n}`,
  `Another beautiful day, ${n}`,
];

export default function BDashboard() {
  const { workspaceId, workspace } = useWorkspace();
  const { config } = useNexusConfig(workspaceId);
  const { robloxUsername } = useAuth();

  const name = robloxUsername || "friend";

  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [heroLine] = useState(() => {
    const lines = HERO_LINES(name);
    return lines[Math.floor(Math.random() * lines.length)];
  });

  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [newMembers, setNewMembers] = useState<NewMember[]>([]);
  const [gameThumb, setGameThumb] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const today = new Date();
      const m = today.getMonth() + 1;
      const d = today.getDate();
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

      const [memRes, nm] = await Promise.all([
        supabase.from("workspace_members")
          .select("user_id, roblox_username, roblox_user_id")
          .eq("workspace_id", workspaceId)
          .not("user_id", "is", null),
        supabase.from("workspace_members")
          .select("user_id, roblox_username, roblox_user_id, joined_at")
          .eq("workspace_id", workspaceId)
          .gte("joined_at", weekAgo.toISOString())
          .order("joined_at", { ascending: false })
          .limit(12),
      ]);
      const userIds = (memRes.data || []).map((m: any) => m.user_id).filter(Boolean);
      let bdays: Birthday[] = [];
      if (userIds.length) {
        const { data: bd } = await supabase
          .from("user_birthdays")
          .select("user_id, birthday_month, birthday_day")
          .in("user_id", userIds)
          .eq("birthday_month", m)
          .eq("birthday_day", d);
        const byId: Record<string, any> = {};
        (memRes.data || []).forEach((mm: any) => { byId[mm.user_id] = mm; });
        bdays = (bd || []).map((b: any) => ({
          user_id: b.user_id,
          roblox_username: byId[b.user_id]?.roblox_username || "Member",
          roblox_user_id: byId[b.user_id]?.roblox_user_id || "",
          birthday_month: b.birthday_month,
          birthday_day: b.birthday_day,
        }));
      }
      setBirthdays(bdays);
      setNewMembers((nm.data || []) as any);
    })();
  }, [workspaceId]);

  // Try to fetch a game thumbnail
  useEffect(() => {
    const url = (workspace as any)?.game_url;
    if (!url) return;
    const match = url.match(/games\/(\d+)/);
    if (!match) return;
    const placeId = match[1];
    fetch(`https://thumbnails.roproxy.com/v1/places/gameicons?placeIds=${placeId}&size=512x512&format=Png&isCircular=false`)
      .then(r => r.json())
      .then(j => { const img = j?.data?.[0]?.imageUrl; if (img) setGameThumb(img); })
      .catch(() => {});
  }, [(workspace as any)?.game_url]);

  const heroImg = (workspace as any)?.nexus_hero_image_url as string | undefined;
  const heroStyle: React.CSSProperties = heroImg
    ? { backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.25), rgba(0,0,0,0.05)), url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(135deg, #6ea8ff 0%, #88b8ff 40%, #b6d2ff 100%)" };

  const Hero = ({ title }: { title?: string }) => (
    <div className="rounded-md overflow-hidden relative h-[280px] flex flex-col justify-end p-8" style={heroStyle}>
      <div className="text-xs font-semibold uppercase tracking-wider text-white/80 flex items-center gap-1.5 mb-2">
        <Hand className="w-3.5 h-3.5" /> {greeting}, {name}
      </div>
      <h1 className="text-white text-[2.5rem] leading-[1.05] font-bold tracking-[-0.025em] max-w-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
        {title || heroLine}
      </h1>
    </div>
  );

  const cardData: CardData = {
    birthdays, newMembers, gameThumb,
    gameUrl: (workspace as any)?.game_url ?? null,
    workspaceName: workspace?.name,
    workspaceId: workspaceId || "",
    base: `/w/${workspaceId}`,
  };

  // ---- Nexus UI 3.0: modern trial dashboard ---------------------------------
  if (config.version === "v3" && v3Enabled) {
    const stats = [
      { label: "Birthdays today", value: birthdays.length },
      { label: "New this week", value: newMembers.length },
      { label: "Cards enabled", value: config.cards.length },
    ];
    return (
      <BargainsShell>
        <BirthdayPrompt />
        <div className="max-w-6xl mx-auto space-y-5">
          {config.showHero && (
            <div className="rounded-2xl overflow-hidden relative min-h-[200px] flex flex-col justify-end p-7" style={heroStyle}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.62) 100%)" }} />
              <div className="relative">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 flex items-center gap-1.5 mb-2">
                  <Hand className="w-3 h-3" /> {greeting}, {name}
                </div>
                <h1 className="text-white text-[2rem] sm:text-[2.4rem] leading-[1.05] font-semibold tracking-[-0.035em] max-w-2xl">
                  {config.heroTitle || heroLine}
                </h1>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {stats.map(s => (
              <div key={s.label} className="rounded-2xl border p-4" style={n3.cardStyle}>
                <div className="text-2xl font-semibold" style={{ color: n3.text }}>{s.value}</div>
                <div className="text-[11px] uppercase tracking-[0.1em] mt-1" style={{ color: n3.textMuted }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {config.cards.map((id) => <NexusCard key={id} id={id} data={cardData} />)}
          </div>

          {config.cards.length === 0 && (
            <div className="rounded-2xl border px-5 py-10 text-sm text-center" style={{ ...n3.cardStyle, color: n3.textDim }}>
              No cards yet. The workspace owner can add them in Settings → Theme.
            </div>
          )}
        </div>
      </BargainsShell>
    );
  }

  // ---- Nexus UI 2.0: owner-designed dashboard -------------------------------
  if (config.version === "v2") {
    const cardData: CardData = {
      birthdays, newMembers, gameThumb,
      gameUrl: (workspace as any)?.game_url ?? null,
      workspaceName: workspace?.name,
      workspaceId: workspaceId || "",
      base: `/w/${workspaceId}`,
    };
    return (
      <BargainsShell>
        <BirthdayPrompt />
        <div className="max-w-6xl mx-auto -mt-2 space-y-6">
          {config.showHero && (
            <div className="rounded-xl border overflow-hidden relative min-h-[180px] flex flex-col justify-end p-6" style={{ ...heroStyle, borderColor: "#232326" }}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)" }} />
              <div className="relative">
                <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/70 flex items-center gap-1.5 mb-1.5">
                  <Hand className="w-3 h-3" /> {greeting}, {name}
                </div>
                <h1 className="text-white text-[1.75rem] sm:text-[2.1rem] leading-[1.08] font-bold tracking-[-0.03em] max-w-2xl">
                  {config.heroTitle || heroLine}
                </h1>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: bx.textMuted }}>
                Overview
              </h2>
              <span className="text-[11px]" style={{ color: bx.textMuted }}>{workspace?.name}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {config.cards.map((id) => <NexusCard key={id} id={id} data={cardData} />)}
            </div>
          </div>

          {config.cards.length === 0 && !config.showHero && (
            <div className="rounded-xl border px-5 py-10 text-sm text-center" style={{ background: "#131315", borderColor: "#232326", color: bx.textDim }}>
              This dashboard has no cards yet. The workspace owner can add them in Settings → Nexus UI.
            </div>
          )}
        </div>


      </BargainsShell>
    );
  }

  return (
    <BargainsShell>
      <BirthdayPrompt />
      <div className="max-w-7xl mx-auto -mt-2">
        <Hero />




        {/* Quick play tiles */}
        {(workspace as any)?.game_url && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            <a href={(workspace as any)?.game_url} target="_blank" rel="noreferrer"
              className="rounded-md border overflow-hidden relative h-[140px] group hover:-translate-y-0.5 transition-transform"
              style={bx.cardStyle}>
              {gameThumb && <img src={gameThumb} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-white font-bold text-base mb-2">{(workspace as any).name}</div>
                <button className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-semibold bg-white/15 text-white backdrop-blur hover:bg-white/25">
                  <Play className="w-3 h-3 fill-current" /> Play
                </button>
              </div>
            </a>
          </div>
        )}

        {/* This week section */}
        <div className="mt-10">
          <h2 className="text-xl font-bold tracking-[-0.02em]" style={{ color: bx.text }}>
            This week at {workspace?.name || "your workspace"}
          </h2>

          {/* Birthdays */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: bx.text }}>
              Birthdays <Cake className="w-3.5 h-3.5" />
            </h3>
            {birthdays.length === 0 ? (
              <div className="mt-3 rounded-md border px-5 py-6 text-sm" style={{ ...bx.cardStyle, color: bx.textDim }}>
                No birthdays today. We'll show them here when the team has theirs.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {birthdays.map(b => (
                  <div key={b.user_id} className="rounded-md border p-4 flex items-center gap-3" style={bx.cardStyle}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: bx.text }}>{b.roblox_username}'s Birthday</div>
                      <div className="text-xs mt-0.5" style={{ color: bx.textDim }}>Today 🥳</div>
                    </div>
                    <RobloxAvatar username={b.roblox_username} userId={b.roblox_user_id} className="w-12 h-12 rounded-md" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New to the team */}
          <div className="mt-7">
            <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: bx.text }}>
              New to the team <Hand className="w-3.5 h-3.5" />
            </h3>
            {newMembers.length === 0 ? (
              <div className="mt-3 rounded-md border px-5 py-6 text-sm" style={{ ...bx.cardStyle, color: bx.textDim }}>
                No new joiners this week.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {newMembers.map(m => (
                  <div key={m.user_id} className="rounded-md border p-4 flex items-center gap-3" style={bx.cardStyle}>
                    <RobloxAvatar username={m.roblox_username} userId={m.roblox_user_id} className="w-10 h-10 rounded-md" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: bx.text }}>{m.roblox_username}</div>
                      <div className="text-xs" style={{ color: bx.textMuted }}>Joined {new Date(m.joined_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BargainsShell>
  );
}
