import defenseFile from "@/data/defense-charts.json";
import { normalizeProse } from "./prose";

export interface TeamRef {
  name: string;
  abbr: string | null;
}

/** One leaderboard cell. Usually one club; two where the sheet records a tie. */
export interface LeaderEntry {
  label: string;
  teams: TeamRef[];
}

export interface LeaderColumn {
  label: string;
  entries: LeaderEntry[];
}

export interface FantasyRow {
  rank: number;
  team: string;
  abbr: string | null;
  fpts: number;
  ppg: number;
}

export interface SimulatedRow {
  team: string;
  abbr: string | null;
  frequency: number;
  efficiency: number;
}

export interface OffseasonBlock {
  team: string;
  abbr: string | null;
  departures: string[];
  additions: string[];
}

export interface StrongSchedule {
  team: string;
  abbr: string | null;
  weeks: { week: number; opponent: string; abbr: string | null }[];
}

export interface SosList {
  source: string;
  easiest: TeamRef[];
  hardest: TeamRef[];
}

export interface HistoryRow {
  team: string;
  gp: number;
  loss: number;
  sck: number;
  qb_hits: number;
  int: number;
  fr: number;
  sfty: number;
  def_td: number;
  ret_td: number;
  opp_pts: number;
  ppg: number;
}

export interface SeasonRow {
  rank: number;
  team: string;
  abbr: string | null;
  fpts: number;
  ppg: number;
  /** "-0.12 (#2)" — value and league rank as the sheet keeps them. */
  epa: string | null;
}

export interface PairedRow {
  team: string;
  abbr: string | null;
  success_rate?: number;
  dvoa?: number;
  finish: string | null;
  finish_rank: number | null;
}

export interface Coordinator {
  name: string;
  team: string | null;
  abbr: string | null;
  record: string | null;
}

export interface InheritedBlock {
  label: string;
  entries: { team: string; abbr: string | null; coordinator: string | null }[];
}

export interface Measure {
  label: string;
  block: "leaderboard" | "box" | "coverage";
  hits: number;
  size: number;
  expected: number;
  rate: number;
  tier: "strong" | "moderate" | "weak" | "none";
  teams: string[];
  /** Coverage columns only: which end of the list is the good end. */
  direction?: "best-first" | "worst-first";
}

export interface SupportRow extends FantasyRow {
  appears: string[];
  of: number;
}

export interface Spotlight {
  team: string;
  abbr: string | null;
  appears: string[];
  missing: string[];
  of: number;
  coverage_ranks: Record<string, number>;
}

interface DefenseFile {
  schema_version: number;
  updated: string;
  source: string;
  note: string;
  data: {
    fantasy: FantasyRow[];
    seasons_scoring: Record<string, SeasonRow[]>;
    success: Record<string, PairedRow[]>;
    dvoa: Record<string, PairedRow[]>;
    coordinators: Coordinator[];
    inherited: InheritedBlock[];
    dc_note: string | null;
    dc_outlook: { improve: string[]; regress: string[] };
    spread: {
      top: FantasyRow;
      tenth: FantasyRow;
      points: number;
      per_game: number;
    } | null;
    leaders: LeaderColumn[];
    leaders_source: string | null;
    pass_rush: { simulated: SimulatedRow[]; box: LeaderColumn[] };
    coverage: LeaderColumn[];
    offseason: OffseasonBlock[];
    verdict: { improved: TeamRef[]; regressed: TeamRef[] };
    strong_schedules: StrongSchedule[];
    schedules: SosList[];
    history: Record<string, HistoryRow[]> | null;
    history_note: string | null;
    analysis: {
      scorers: number;
      league: number;
      measures: Measure[];
      support: SupportRow[];
      spotlight: Spotlight | null;
    };
  };
}

// Normalised where it enters, like the prediction payloads (docs/STATE.md,
// open item 19): the workbook's spellings and any em dash a re-extraction
// brings back are corrected here rather than in a JSON the next run rewrites.
const file = normalizeProse(defenseFile as unknown as DefenseFile);

export const DEFENSE = file.data;
export const DEFENSE_UPDATED = file.updated;
export const DEFENSE_SOURCE = file.source;
