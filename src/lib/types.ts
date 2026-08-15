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
  /**
   * What point in the season the order is for. Draft ranks and in-season ranks
   * answer different questions, and a list that does not say which it is will
   * be read as whichever the reader assumes.
   */
  scope: string;
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

/**
 * One side of a game once it has been played. Free-text names rather than
 * player ids: the leader in a game is frequently someone outside the ranked
 * 120, and a slot that can only hold a ranked player would quietly drop him.
 * `player_id` is set as well when the name does resolve, which is what makes
 * the name a link.
 */
export interface GameLeader {
  name: string;
  player_id?: string;
  /** The line that earned the mention, e.g. "18/24, 246 yds, 2 TD". */
  stat?: string;
}

/**
 * The four players worth naming per side. Defence is one highlighted player
 * rather than a stat leader, because the box score does not identify who
 * decided a game on that side of the ball.
 */
export interface GameLeaders {
  qb?: GameLeader;
  rusher?: GameLeader;
  receiver?: GameLeader;
  defense?: GameLeader;
}

export interface Game {
  id: string;
  week: number;
  /** ISO 8601, UTC. Rendered in Eastern — the league's operating clock. */
  kickoff: string;
  away: string;
  home: string;
  venue: string;
  city?: string;
  roof: "outdoor" | "dome" | "retractable" | "closed";
  /** Negative favours the home side, matching how a spread is published. */
  spread_line?: number;
  total_line?: number;
  /** American odds. The market's answer to who wins, which the spread is not. */
  moneyline?: { away: number; home: number };
  /**
   * Implied team totals. Authored here rather than derived on the page: this
   * is a metric, and §11 does not let a component compute one. It is the most
   * actionable number in the section (§5.5), so it has to be consistent
   * wherever it appears.
   */
  implied?: { away: number; home: number };
  weather?: {
    temp_f: number;
    wind_mph: number;
    precip_pct: number;
    summary: string;
  };
  /** Absent until the game is played. Absent is not zero. */
  score?: { away: number; home: number };
  leaders?: { away?: GameLeaders; home?: GameLeaders };
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
