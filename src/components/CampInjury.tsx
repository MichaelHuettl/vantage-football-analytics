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

export interface CampInjury {
  player_id?: string;
  name: string;
  team: string;
  position: Position;
  injury: string;
  status: CampStatus;
  detail: string;
  history?: string;
  source: "workbook" | "reported";
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
