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

export type ScoringFormat = "ppr" | "half" | "standard" | "superflex";

export const SCORING_FORMATS: { id: ScoringFormat; label: string }[] = [
  { id: "ppr", label: "PPR" },
  { id: "half", label: "Half PPR" },
  { id: "standard", label: "Standard" },
  { id: "superflex", label: "Superflex" },
];

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
  team: string;
  age?: number;
  /** Draft capital, e.g. "2023 R1P4". Free text — it's read, not computed. */
  draft?: string;
  status?: "active" | "ir" | "pup" | "suspended" | "fa";
}

export interface RankingEntry {
  /** The PPR ordering, and the default for every format. */
  rank: number;
  tier: number;
  player_id: string;
  /** One sentence, containing a fact rather than a vibe. §8. */
  note: string;
  /**
   * Only the formats that differ from `rank`. Keeps one list per position
   * instead of four, which matters when the list is edited by hand.
   */
  format_ranks?: Partial<Record<ScoringFormat, number>>;
  /** Chart filename in /public/charts, if this player's ranking has one. */
  chart?: string;
}

export interface RankingList {
  schema_version: number;
  position: Position;
  /** Shown in DataFreshness. Hand-set, because nothing computes it. */
  updated: string;
  note?: string;
  tiers: { tier: number; label: string }[];
  entries: RankingEntry[];
}

export type PracticeStatus = "DNP" | "LP" | "FP" | "—";
export type GameStatus = "Out" | "Doubtful" | "Questionable" | "Active" | "IR";

export interface InjuryEntry {
  player_id: string;
  injury: string;
  practice: { wed: PracticeStatus; thu: PracticeStatus; fri: PracticeStatus };
  status: GameStatus;
  /** Prior weeks' game status, oldest first. The trend is the signal. §5.3 */
  history?: { week: number; status: GameStatus }[];
  updated: string;
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
