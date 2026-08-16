import kickerFile from "@/data/kicker-charts.json";

export interface ScoringRow {
  rank: number;
  name: string;
  fpts: number;
  ppg: number;
}

export interface Advantage {
  label: string;
  kind: "kicker" | "team" | "mixed";
  entries: string[];
  groups?: { label: string; entries: string[] }[];
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

const file = kickerFile as unknown as KickerFile;

export const KICKERS = file.data;
export const KICKER_UPDATED = file.updated;
export const KICKER_SOURCE = file.source;
