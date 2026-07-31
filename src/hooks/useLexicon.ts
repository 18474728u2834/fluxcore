import { useMemo } from "react";
import { useNexusConfig } from "@/hooks/useNexusConfig";

/**
 * Aviation wording pack. Keys are the default (general) terms used across the UI,
 * values are the aviation equivalents shown when "Fluxcore For Aviation" is on.
 */
export const AVIATION_TERMS: Record<string, string> = {
  // Navigation
  Sessions: "Flights",
  Session: "Flight",
  session: "flight",
  sessions: "flights",
  Activity: "Flight Activity",
  Members: "Crew",
  Member: "Crew member",
  members: "crew",
  Wall: "Notices",
  Staff: "Crew",

  // Session categories
  Shift: "Departure",
  Shifts: "Departures",
  Training: "Training Flight",
  Trainings: "Training Flights",
  Event: "Special Flight",
  Events: "Special Flights",
  Meeting: "Briefing",
  Meetings: "Briefings",

  // Roles / slots
  Host: "Captain",
  "Co-host": "First Officer",
  Trainer: "Instructor",
  "Co-trainer": "Second Instructor",

  // Quotas
  "Sessions hosted": "Flights operated",
  "Sessions Hosted": "Flights Operated",
  "Last Week's Sessions": "Last Week's Flights",
  "In-game minutes": "Minutes in the air",
  "Host 2 sessions": "Attend 1 flight",
};

const SORTED_KEYS = Object.keys(AVIATION_TERMS).sort((a, b) => b.length - a.length);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function useLexicon(workspaceId?: string) {
  const { config } = useNexusConfig(workspaceId);
  const aviation = config.industry === "aviation";

  return useMemo(() => {
    /** Translate a single known term. */
    const t = (term: string) => (aviation ? AVIATION_TERMS[term] ?? term : term);

    /** Translate every known term inside a sentence. */
    const phrase = (text: string) => {
      if (!aviation || !text) return text;
      let out = text;
      for (const key of SORTED_KEYS) {
        out = out.replace(new RegExp(`\\b${escapeRe(key)}\\b`, "g"), AVIATION_TERMS[key]);
      }
      return out;
    };

    return { aviation, t, phrase };
  }, [aviation]);
}
