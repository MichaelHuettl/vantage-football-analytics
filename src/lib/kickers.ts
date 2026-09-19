import kickerFile from "@/data/kicker-charts.json";
import { normalizeProse } from "./prose";

export interface ScoringRow {
  rank: number;
  /** The surname the workbook keys on. */
  name: string;
  /** What a reader should see. Resolved from the roster in the Python. */
  full: string;
  /** The team he kicked for *that season*, not his current one. */
  team: string | null;
  fpts: number;
  ppg: number;
}

/** A list item: a club, or a kicker with the club he kicks for. */
export interface AdvantageEntry {
  name: string;
  team: string | null;
}

export interface Advantage {
  label: string;
  kind: "kicker" | "team" | "mixed";
  entries: AdvantageEntry[];
  groups?: { label: string; entries: AdvantageEntry[] }[];
}

export interface Favorite {
  name: string;
  reason: string;
}

export interface BoardSeason {
  year: string;
  rank: number;
  fpts: number;
  ppg: number;
  games: number | null;
}

export interface BoardPick {
  surname: string;
  name: string;
  team: string;
  /** Null when the kicker is outside the ranked 20 — no page, no headshot. */
  player_id: string | null;
  /** The operator's own write-up, verbatim from the workbook. Favourites only. */
  reason: string | null;
  seasons: BoardSeason[];
  appearances: number;
  swing: number | null;
}

interface KickerFile {
  schema_version: number;
  updated: string;
  source: string;
  note: string;
  data: {
    fg_attempts: {
      years: string[];
      top: Record<string, string[]>;
      bottom: Record<string, string[]>;
      appearances: Record<string, number>;
      /** Computed but deliberately not rendered — see docs/STATE.md. */
      retention: { from: string; to: string; kept: number; of: number }[];
      swings: { team: string; from: string; to: string; direction: string }[];
      null: number;
    };
    scoring: {
      years: string[];
      rows: Record<string, ScoringRow[]>;
      retention: { from: string; to: string; kept: number; of: number }[];
      persistent: {
        name: string;
        seasons: { year: string; rank: number; ppg: number }[];
      }[];
      spread: {
        year: string;
        k1: ScoringRow;
        k16: ScoringRow;
        points: number;
        per_game: number;
      }[];
    };
    advantages: Advantage[];
    favorites: Favorite[];
    value_picks: string[];
    board: { top3: BoardPick[]; value: BoardPick[] };
    divisions_note: string;
  };
}

// Normalised where it enters, for the same reason as defense.ts.
const file = normalizeProse(kickerFile as unknown as KickerFile);

export const KICKERS = file.data;
export const KICKER_UPDATED = file.updated;
export const KICKER_SOURCE = file.source;
