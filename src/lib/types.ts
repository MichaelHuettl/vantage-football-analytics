/**
 * Content types.
 *
 * These began life in §4.1 as pipeline output schemas. With no pipeline in v1
 * they are authoring formats: the shape a hand-edited JSON file must satisfy.
 * Every file carries the {schema_version, generated_at, data} envelope so a
 * stale or mismatched file can be detected rather than rendered as garbage.
 */

export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST";

export const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];

export interface Envelope<T> {
  schema_version: number;
  generated_at: string;
  note?: string;
  data: T;
}

export interface Team {
  abbr: string;
  city: string;
  nickname: string;
  conference: "AFC" | "NFC";
  division: "North" | "South" | "East" | "West";
  primary: string;
  secondary: string;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  /** Omitted when the team is not confirmed. Rendered without a chip. */
  team?: string;
  age?: number;
  /** Draft capital, e.g. "2023 R1P4". Free text — it's read, not computed. */
  draft?: string;
  status?: "active" | "ir" | "pup" | "suspended" | "fa";
  /** Path under /public/img/players. Omit to fall back to the initials avatar. */
  photo?: string;
}

export interface RankingEntry {
  rank: number;
  player_id: string;
  /** One sentence containing a fact. §8. Absent until authored. */
  note?: string;
  /** Chart path under /public/charts, once one exists for this player. */
  chart?: string;
}

export interface RankingList {
  schema_version: number;
  position: Position;
  /**
   * Scoring format the order assumes. There is one list per position rather
   * than one per format, so this is a statement of what the ranking means,
   * not a switch — and it has to be on screen, because the same names in a
   * different order would be a different ranking.
   */
  format: string;
  /** Shown in DataFreshness. Hand-set, because nothing computes it. */
  updated: string;
  /** Where the order came from, e.g. the workbook block it was taken from. */
  source?: string;
  note?: string;
  entries: RankingEntry[];
}

export type PracticeStatus = "DNP" | "LP" | "FP" | "—";
export type GameStatus = "Out" | "Doubtful" | "Questionable" | "Active" | "IR";

/**
 * One row per player per week. Weeks accumulate rather than overwrite — the
 * backlog view and the per-player timeline are both derived from the full
 * history, so old rows are the data, not clutter.
 */
export interface InjuryEntry {
  week: number;
  player_id: string;
  team: string;
  injury: string;
  practice: { wed: PracticeStatus; thu: PracticeStatus; fri: PracticeStatus };
  status: GameStatus;
  /** One sentence on what changed this week. §8: a fact, not a vibe. */
  note?: string;
}

export interface Game {
  id: string;
  week: number;
  kickoff: string;
  away: string;
  home: string;
  venue: string;
  roof: "outdoor" | "dome" | "retractable" | "closed";
  spread_line?: number;
  total_line?: number;
  weather?: {
    temp_f: number;
    wind_mph: number;
    precip_pct: number;
    summary: string;
  };
}

export interface NewsEntry {
  id: string;
  headline: string;
  source: string;
  url: string;
  timestamp: string;
  category: "injury" | "transaction" | "practice" | "camp" | "breaking";
  player_ids?: string[];
  team_abbrs?: string[];
}

/** A route or defender path on a diagram, in field coordinates. */
export interface DiagramPath {
  label: string;
  /** [x, y] pairs. x: 0-53.3 yards across. y: yards from LOS, negative = behind. */
  points: [number, number][];
  kind: "route" | "block" | "motion" | "coverage";
  emphasis?: boolean;
}

export interface PlayConcept {
  slug: string;
  name: string;
  family: string;
  summary: string;
  paths: DiagramPath[];
  /** Which profiles benefit. §5.4 */
  beneficiaries?: string;
  teams?: string[];
}

export interface GlossaryTerm {
  slug: string;
  term: string;
  /** One sentence. §4.2 requires this to exist for every metric on screen. */
  definition: string;
  /** What a good value looks like. Also required by §4.2. */
  good: string;
}
