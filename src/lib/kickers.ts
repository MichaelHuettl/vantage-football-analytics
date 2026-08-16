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
    divisions_note: string;
  };
}

const file = kickerFile as unknown as KickerFile;

export const KICKERS = file.data;
export const KICKER_UPDATED = file.updated;
export const KICKER_SOURCE = file.source;
