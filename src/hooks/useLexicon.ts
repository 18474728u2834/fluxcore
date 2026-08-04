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

  // NOTE: Slot/role names (Host, Co-host, Trainer, ...) are intentionally NOT
  // translated — they come from what the owner types when creating a session.

  // Quotas
  "Sessions hosted": "Flights operated",
  "Sessions Hosted": "Flights Operated",
  "Last Week's Sessions": "Last Week's Flights",
  "In-game minutes": "Minutes in the air",
  "Host 2 sessions": "Attend 1 flight",
};

/**
 * Maritime wording pack, shown when "Fluxcore For Maritime" is on.
 */
export const MARITIME_TERMS: Record<string, string> = {
  // Navigation
  Sessions: "Voyages",
  Session: "Voyage",
  session: "voyage",
  sessions: "voyages",
  Activity: "Voyage Activity",
  Members: "Crew",
  Member: "Crew member",
  members: "crew",
  Wall: "Ship's Notices",
  Staff: "Crew",

  // Session categories
  Shift: "Watch",
  Shifts: "Watches",
  Training: "Drill",
  Trainings: "Drills",
  Event: "Special Sailing",
  Events: "Special Sailings",
  Meeting: "Muster",
  Meetings: "Musters",

  // Quotas
  "Sessions hosted": "Voyages sailed",
  "Sessions Hosted": "Voyages Sailed",
  "Last Week's Sessions": "Last Week's Voyages",
  "In-game minutes": "Minutes at sea",
  "Host 2 sessions": "Attend 1 voyage",
};

function sortKeys(pack: Record<string, string>) {
  return Object.keys(pack).sort((a, b) => b.length - a.length);
}

const AVIATION_KEYS = sortKeys(AVIATION_TERMS);
const MARITIME_KEYS = sortKeys(MARITIME_TERMS);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function useLexicon(workspaceId?: string) {
  const { config } = useNexusConfig(workspaceId);
  const industry = config.industry;
  const aviation = industry === "aviation";
  const maritime = industry === "maritime";

  return useMemo(() => {
    const pack = aviation ? AVIATION_TERMS : maritime ? MARITIME_TERMS : null;
    const keys = aviation ? AVIATION_KEYS : maritime ? MARITIME_KEYS : [];

    /** Translate a single known term. */
    const t = (term: string) => (pack ? pack[term] ?? term : term);

    /** Translate every known term inside a sentence. */
    const phrase = (text: string) => {
      if (!pack || !text) return text;
      let out = text;
      for (const key of keys) {
        out = out.replace(new RegExp(`\\b${escapeRe(key)}\\b`, "g"), pack[key]);
      }
      return out;
    };

    /** Optional trip metadata labels (flight / voyage details). */
    const trip = aviation
      ? {
          heading: "Flight details",
          route: "Route number",
          routePlaceholder: "FX 204",
          origin: "Origin (optional)",
          originPlaceholder: "LHR",
          destination: "Destination (optional)",
          destinationPlaceholder: "JFK",
          vehicle: "Plane model (optional)",
          vehiclePlaceholder: "Boeing 737-800",
          identifier: "Tail number (optional)",
          identifierPlaceholder: "G-FLUX",
        }
      : maritime
        ? {
            heading: "Voyage details",
            route: "Route number",
            routePlaceholder: "FX 12",
            origin: "Departure port (optional)",
            originPlaceholder: "Dover",
            destination: "Arrival port (optional)",
            destinationPlaceholder: "Calais",
            vehicle: "Vessel class (optional)",
            vehiclePlaceholder: "Ro-Pax Ferry",
            identifier: "IMO / hull number (optional)",
            identifierPlaceholder: "IMO 9234567",
          }
        : null;

    /** Crew dispatch config — only available for aviation & maritime. */
    const crew = aviation
      ? {
          title: "Crew Dispatch",
          permissionLabel: "Flight Dispatcher",
          positionsLabel: "Crew positions",
          placeholder: "e.g. Purser, Load Master, Relief Pilot",
          defaults: ["Pilot", "First Officer", "Cabin Crew", "Ground Crew"],
        }
      : maritime
        ? {
            title: "Crew Dispatch",
            permissionLabel: "Watch Dispatcher",
            positionsLabel: "Crew positions",
            placeholder: "e.g. Bosun, Able Seafarer, Engine Rating",
            defaults: ["Master", "Chief Officer", "Deck Crew", "Engine Crew", "Port Crew"],
          }
        : null;

    return { aviation, maritime, industry, t, phrase, trip, crew };
  }, [aviation, maritime, industry]);
}
