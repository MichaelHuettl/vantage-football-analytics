import campFile from "@/data/camp-injuries.json";
import type { Position } from "@/lib/types";

export type CampStatus =
  | "Out for season"
  | "PUP"
  | "Out"
  | "Limited"
  | "Day to day"
  | "Practicing"
  | "Cleared";

/**
 * A camp injury record, modelled on how clinical injury reporting is written:
 * the specific diagnosis rather than a body part alone, the expected absence,
 * and the player's current functional state.
 *
 * `timeline` is never present without `attribution`. Reporting that a coach
 * said Week 1 is journalism; asserting a return date would be the medical
 * claim §5.3 rules out, and this site is not qualified to make it.
 */
export interface CampInjury {
  player_id?: string;
  name: string;
  team: string;
  position: Position;
  /** Anatomy, for grouping and scanning. */
  body_part: string;
  /** The specific diagnosis as published, including grade where given. */
  diagnosis: string;
  status: CampStatus;
  /** Expected absence, exactly as stated by the attributed source. */
  timeline?: string;
  /** Who said it. Required whenever `timeline` is present. */
  attribution?: string;
  /** Most recent observable state — practised, carted off, still on crutches. */
  latest?: string;
  history?: string;
  reported: string;
  source: "workbook" | "reported";
  source_name?: string;
  source_url?: string;
}

interface CampFile {
  schema_version: number;
  updated: string;
  note?: string;
  data: CampInjury[];
}

const file = campFile as unknown as CampFile;

export const CAMP_INJURIES = file.data;
export const CAMP_UPDATED = file.updated;

/**
 * Ordered worst-first. A camp report is read to find who is in trouble, so
 * severity is the useful sort — alphabetical would bury the season-enders.
 */
export const CAMP_SEVERITY: Record<CampStatus, number> = {
  "Out for season": 6,
  PUP: 5,
  Out: 4,
  Limited: 3,
  "Day to day": 2,
  Practicing: 1,
  Cleared: 0,
};

const STATUS_TOKEN: Record<CampStatus, string> = {
  "Out for season": "var(--color-status-out)",
  PUP: "var(--color-status-out)",
  Out: "var(--color-status-doubtful)",
  Limited: "var(--color-status-questionable)",
  "Day to day": "var(--color-status-questionable)",
  Practicing: "var(--color-status-full)",
  Cleared: "var(--color-status-full)",
};

/** The word is always present — colour never carries the meaning alone (§7). */
export function CampStatusPill({ status }: { status: CampStatus }) {
  return (
    <span
      className="inline-flex h-6 items-center whitespace-nowrap rounded px-2 text-xs font-bold uppercase tracking-wide text-white"
      style={{
        fontFamily: "var(--font-condensed)",
        background: STATUS_TOKEN[status],
      }}
    >
      {status}
    </span>
  );
}

/**
 * The expected absence, always shown with who said it. An unattributed
 * timeline would read as this site's own prognosis.
 */
export function Timeline({ injury }: { injury: CampInjury }) {
  // No timeline, no line. This used to print "Not stated", which put the same
  // two words on 38 of 93 tracker rows and told a reader nothing they could not
  // see from the empty space. A blank cell says the same thing and says it
  // faster (§8).
  if (!injury.timeline) return null;
  return (
    <span className="block">
      <span className="block text-sm">{injury.timeline}</span>
      {injury.attribution && (
        <span
          className="mt-0.5 block text-xs"
          style={{ color: "var(--text-muted)" }}
        > ({injury.attribution}) </span>
      )}
    </span>
  );
}
