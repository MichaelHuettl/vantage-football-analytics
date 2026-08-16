import defenseFile from "@/data/defense-charts.json";

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

interface DefenseFile {
  schema_version: number;
  updated: string;
  source: string;
  note: string;
  data: {
    fantasy: FantasyRow[];
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
  };
}

const file = defenseFile as unknown as DefenseFile;

export const DEFENSE = file.data;
export const DEFENSE_UPDATED = file.updated;
export const DEFENSE_SOURCE = file.source;
