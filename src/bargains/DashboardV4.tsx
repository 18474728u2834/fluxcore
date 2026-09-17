import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { n4 } from "./ShellV4";
import { NexusCard, type CardData } from "./NexusCards";
import { useWorkspacePulse, untilLabel } from "@/hooks/useWorkspacePulse";
import { useLexicon } from "@/hooks/useLexicon";
import { RobloxAvatar } from "@/components/RobloxAvatar";
import type { NexusConfig } from "@/hooks/useNexusConfig";
import {
  Radio, Briefcase, ArrowUp, Calendar, Cake, Sparkles, ArrowRight, Megaphone, Heart, CheckCircle2,
} from "lucide-react";

interface Props {
  config: NexusConfig;
  cardData: CardData;
  workspaceId: string;
  accent: string;
  heroStyle: React.CSSProperties;
  greeting: string;
  name: string;
  heroLine: string;
  birthdays: { user_id: string; roblox_username: string; roblox_user_id: string }[];
  newMembers: { user_id: string; roblox_username: string; roblox_user_id: string; joined_at: string }[];
}

/**
 * Nexus 4.0 dashboard — a briefing, not a wall of cards.
 * Left: what is happening and what needs a decision. Right: the people rail.
 */
export function DashboardV4({
  config, cardData, workspaceId, accent, heroStyle, greeting, name, heroLine, birthdays, newMembers,
}: Props) {
  const navigate = useNavigate();
  const pulse = useWorkspacePulse(workspaceId);
  const { t } = useLexicon(workspaceId);
  const base = `/w/${workspaceId}`;

  const todo = useMemo(() => ([
    { label: `${t("LOA")} requests waiting`, count: pulse.loaPending, to: "loa", icon: Briefcase },
    { label: "Promotion nominations", count: pulse.promotionsPending, to: "promotions", icon: ArrowUp },
  ]).filter(i => i.count > 0), [pulse.loaPending, pulse.promotionsPending, t]);

  const quick = [
    { label: `Schedule a ${t("Session").toLowerCase()}`, icon: Calendar, to: "sessions" },
    { label: "Post an announcement", icon: Megaphone, to: "wall" },
    { label: "Give kudos", icon: Heart, to: "kudos" },
  ];

  const hourLabel = new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });

  const waiting = todo.reduce((a, i) => a + i.count, 0);

  return (
    <div className="space-y-4">
      {/* Briefing slab: image band on the left, hard-edged readout on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="relative min-h-[172px]" style={heroStyle}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(100deg, #0b0d10 0%, rgba(11,13,16,0.82) 52%, ${accent}22 100%)` }} />
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />
          <div className="relative p-6 md:p-7">
            <div className="n4-mono text-[10px] uppercase tracking-[0.22em] text-white/35">{hourLabel}</div>
            <h1 className="mt-2.5 text-white text-[1.8rem] md:text-[2.15rem] leading-[1.03] font-semibold tracking-[-0.03em] max-w-2xl">
              {config.heroTitle || `${greeting}, ${name}`}
            </h1>
            <p className="mt-2 text-[13px] text-white/50 max-w-xl">{heroLine}</p>
            {pulse.nextSession && (
              <button onClick={() => navigate(`${base}/sessions`)}
                className="n4-mono mt-4 inline-flex items-center gap-2 h-8 px-3 text-[10.5px] uppercase text-white/70 hover:text-white"
                style={{ border: "1px solid rgba(255,255,255,0.14)" }}>
                <Calendar className="w-3.5 h-3.5" /> next · {pulse.nextSession.title} · {untilLabel(pulse.nextSession.scheduled_at)}
              </button>
            )}
          </div>
        </div>

        {/* readout columns */}
        <div className="grid grid-cols-3 lg:grid-cols-1 lg:w-[210px] divide-y lg:divide-y divide-x lg:divide-x-0"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "#15171d" }}>
          {[
            { v: pulse.staffInGame, l: "in game", icon: Radio, tone: "#34d399" },
            { v: waiting, l: "waiting on you", icon: Sparkles, tone: accent },
            { v: pulse.upcoming.length, l: "scheduled", icon: Calendar, tone: "rgba(255,255,255,0.6)" },
          ].map(s => (
            <div key={s.l} className="px-4 py-4 lg:py-[19px] flex flex-col justify-center"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="n4-num text-[26px] leading-none font-semibold" style={{ color: s.tone }}>
                {String(s.v).padStart(2, "0")}
              </div>
              <div className="n4-mono mt-1.5 text-[9.5px] uppercase tracking-[0.18em]" style={{ color: n4.textMuted }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Focus column */}
        <div className="space-y-4">
          <div className="rounded-2xl border p-5" style={n4.cardStyle}>
            <div className="flex items-baseline justify-between">
              <h2 className="n4-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: n4.text }}>Needs your decision</h2>
              <span className="text-[11px]" style={{ color: n4.textMuted }}>Updated every minute</span>
            </div>

            {todo.length === 0 ? (
              <div className="mt-4 flex items-center gap-2.5 text-[13px]" style={{ color: n4.textDim }}>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Nothing is waiting. The queue is clear.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {todo.map(i => (
                  <button key={i.to} onClick={() => navigate(`${base}/${i.to}`)}
                    className="w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[13px] hover:bg-white/[0.06] transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)", color: n4.text }}>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}22` }}>
                      <i.icon className="w-4 h-4" style={{ color: accent }} strokeWidth={1.8} />
                    </span>
                    <span className="flex-1 text-left">{i.label}</span>
                    <span className="n4-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>{i.count}</span>
                    <ArrowRight className="w-4 h-4" style={{ color: n4.textMuted }} />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {quick.map(a => (
                <button key={a.to} onClick={() => navigate(`${base}/${a.to}`)}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-[12.5px] hover:bg-white/[0.08] transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", color: n4.textDim }}>
                  <a.icon className="w-3.5 h-3.5" strokeWidth={1.8} /> {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule strip */}
          <div className="rounded-2xl border p-5" style={n4.cardStyle}>
            <h2 className="n4-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: n4.text }}>Coming up</h2>
            {pulse.upcoming.length === 0 ? (
              <p className="mt-3 text-[13px]" style={{ color: n4.textDim }}>Nothing scheduled yet.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pulse.upcoming.map(s => (
                  <button key={s.id} onClick={() => navigate(`${base}/sessions`)}
                    className="text-left rounded-xl p-3 hover:bg-white/[0.06] transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium truncate flex-1" style={{ color: n4.text }}>{s.title}</span>
                      <span className="text-[11px] shrink-0" style={{ color: accent }}>{untilLabel(s.scheduled_at)}</span>
                    </div>
                    <div className="text-[11.5px] mt-0.5 truncate" style={{ color: n4.textMuted }}>
                      {new Date(s.scheduled_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                      {s.host_name ? ` · ${s.host_name}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Owner-chosen cards */}
          {config.cards.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              {config.cards.map(id => <NexusCard key={id} id={id} data={cardData} />)}
            </div>
          )}
        </div>

        {/* People rail */}
        <div className="space-y-4">
          <div className="rounded-2xl border p-5" style={n4.cardStyle}>
            <h2 className="n4-mono text-[10px] font-semibold uppercase tracking-[0.18em] flex items-center gap-1.5" style={{ color: n4.text }}>
              <Cake className="w-3.5 h-3.5" /> Birthdays today
            </h2>
            {birthdays.length === 0 ? (
              <p className="mt-2 text-[12.5px]" style={{ color: n4.textMuted }}>No birthdays today.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {birthdays.map(b => (
                  <div key={b.user_id} className="flex items-center gap-2.5">
                    <RobloxAvatar username={b.roblox_username} userId={b.roblox_user_id} className="w-8 h-8 rounded-lg" />
                    <span className="text-[13px] truncate" style={{ color: n4.text }}>{b.roblox_username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border p-5" style={n4.cardStyle}>
            <h2 className="n4-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: n4.text }}>New this week</h2>
            {newMembers.length === 0 ? (
              <p className="mt-2 text-[12.5px]" style={{ color: n4.textMuted }}>No new joiners this week.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {newMembers.slice(0, 6).map(m => (
                  <button key={m.user_id} onClick={() => navigate(`${base}/members`)} className="w-full flex items-center gap-2.5 text-left">
                    <RobloxAvatar username={m.roblox_username} userId={m.roblox_user_id} className="w-8 h-8 rounded-lg" />
                    <span className="min-w-0">
                      <span className="block text-[13px] truncate" style={{ color: n4.text }}>{m.roblox_username}</span>
                      <span className="block text-[11px]" style={{ color: n4.textMuted }}>
                        Joined {new Date(m.joined_at).toLocaleDateString()}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
