import rbFile from "@/data/rb-charts.json";
import { normalizeProse } from "./prose";
import rbMatchupsFile from "@/data/rb-matchups.json";
import teFile from "@/data/te-charts.json";
import wrFile from "@/data/wr-charts.json";
import qbFile from "@/data/qb-charts.json";

export interface ScatterPoint {
  name: string;
  x: number;
  y: number;
  /** Set by the pipeline on the points worth naming on the chart. */
  label?: boolean;
  /** Placement priority among labelled points, most extreme first. */
  rank?: number;
  /** "C. McCaffrey" — what actually goes on the chart. */
  short?: string;
}

export interface ScatterSeries {
  x_label: string;
  y_label: string;
  caption: string;
  x_median: number;
  y_median: number;
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  note?: string;
  points: ScatterPoint[];
}

export interface HistoricSeason {
  name: string;
  season: number;
}

export interface Tier {
  label: string;
  /** Stat name to the value a season in this tier has cleared. */
  thresholds: Record<string, number>;
  candidates: string[];
}

export interface HistoricColumn {
  key: string;
  header: string;
  /** Which end of the column counts as good. Ranks are better low; age is
   *  neither, so only its extremes are marked. */
  direction: "high" | "low" | "none";
}

/**
 * A season row. The named fields are always present; the `_mark`, `_best` and
 * `_extreme` companions are set per column by the pipeline, so the row is
 * indexable rather than a fixed shape.
 */
export type HistoricRow = HistoricSeason & Record<string, number | string | boolean | undefined>;

export interface HistoricTable {
  caption: string;
  columns: HistoricColumn[];
  seasons: HistoricRow[];
  distribution: Record<string, Record<string, number>>;
  tiers: Tier[];
}

export interface LeaderRow {
  team: string;
  name: string;
  attempts: number;
  targets: number;
  share: number;
}

export interface LeaderTable {
  label: string;
  caption: string;
  note?: string;
  rows: LeaderRow[];
}

interface RbCharts {
  schema_version: number;
  season: number;
  updated: string;
  source: string;
  note: string;
  data: {
    hvt: ScatterSeries;
    contact: ScatterSeries;
    routes: ScatterSeries;
    historic: HistoricTable;
    opportunity: LeaderTable;
    targets: LeaderTable;
  };
}

// Normalised where it enters, like defense.ts and kickers.ts. rb_charts.py still
// targets an older workbook (docs/STATE.md), so a correction made in the JSON
// would not survive the next run of it; one made here does.
const file = normalizeProse(rbFile as unknown as RbCharts);

export const RB_CHARTS = file.data;
export const RB_SEASON = file.season;
export const RB_UPDATED = file.updated;
export const RB_SOURCE = file.source;

// ============================== Tight end ==============================
// Built from the workbook's WRTE sheet by scripts/curated/te_charts.py, in the
// section order the operator laid out. Route participation, TPRR and YPRR are
// 4for4 columns published by his decision — see docs/STATE.md.

/** A scatter plus the operator's own groupings beside it. */
export interface TeChart extends ScatterSeries {
  title: string;
  x_pct: boolean;
  y_pct: boolean;
  groups?: { label: string; names: string[] }[];
}

/** One column of the check-the-box grid: a factor, and who clears it. */
export interface BoxColumn {
  label: string;
  names: string[];
}

export interface TeCharts {
  season: number;
  updated: string;
  source: string;
  note: string;
  data: {
    charts: {
      routes_targets: TeChart;
      routes_tprr: TeChart;
      yards_tds: TeChart;
      airyards_tprr: TeChart;
      routes_yprr: TeChart;
    };
    history: {
      era: string;
      findings: string[];
      rules: { rule: string; verdict: string }[];
    };
    box: {
      era: string;
      te1_3: BoxColumn[];
      te4_6: BoxColumn[];
    };
    /** The workbook's own averages table, lifted out as a picture. */
    benchmark_image: string;
    /** Real dimensions after the right-margin trim; next/image needs them. */
    benchmark_image_size: { width: number; height: number } | null;
  };
}

const teFile_ = teFile as unknown as TeCharts;

export const TE_CHARTS = teFile_.data.charts;
export const TE_HISTORY = teFile_.data.history;
export const TE_BOX = teFile_.data.box;
export const TE_BENCHMARK_IMAGE = teFile_.data.benchmark_image;
export const TE_BENCHMARK_SIZE = teFile_.data.benchmark_image_size;
export const TE_SEASON = teFile_.season;
export const TE_UPDATED = teFile_.updated;
export const TE_SOURCE = teFile_.source;

// ============================= Wide receiver =============================
// Built from the workbook's WRTE sheet by scripts/curated/wr_charts.py — the
// receivers occupy rows 2-183 of the same sheet the tight ends do. The grid's
// YPRR and TPRR columns are 4for4-derived categorisations published by the
// operator's decision; see docs/STATE.md.

/** A scatter, the operator's groupings beside it, and any prose he wrote under it. */
export interface WrChart extends ScatterSeries {
  title: string;
  x_pct: boolean;
  y_pct: boolean;
  groups?: { label: string; names: string[] }[];
  /** Free-written observations from the sheet, e.g. "Olave: Improved Offense". */
  notes?: string[];
  notes_label?: string | null;
}

/** One metric's year-over-year rank correlation, and which side of the argument it sits on. */
export interface StickyMetric {
  label: string;
  kind: "opportunity" | "efficiency" | "output";
  pairs: number;
  rho: number;
  /** The same figure from a pairing the extractor does itself, as a check. */
  rho_repaired?: number;
}

export interface Stickiness {
  title: string;
  caption: string;
  seasons: [number, number];
  pairs: number;
  metrics: StickyMetric[];
}

/** A receiver's weekly shape: the scatter point carries his season line too. */
export interface ConsistencyPoint extends ScatterPoint {
  games: number;
  ppg: number;
  median: number;
}

export interface Consistency extends ScatterSeries {
  title: string;
  x_pct: boolean;
  y_pct: boolean;
  boom: number;
  bust: number;
  points: ConsistencyPoint[];
}

/** One receiver inside a group, carrying the figures the panel quotes. */
export interface GroupMember {
  name: string;
  ppg: number;
  bust: number;
  boom: number;
  median?: number;
  games?: number;
  wopr?: number;
}

export interface ConsistencyGroup {
  key: string;
  label: string;
  blurb: string;
  members: GroupMember[];
}

export interface ConsistencyGroups {
  medians: { bust: number; boom: number };
  /** The field split on its own medians — partly a re-description of scoring. */
  corners: ConsistencyGroup[];
  /** Boom rate held against usage, which is where the new information is. */
  usage?: {
    wopr_median: number;
    matched: number;
    total: number;
    groups: ConsistencyGroup[];
  };
}

/** A receiver in a computed grid column, with the arithmetic behind his place. */
export interface TdRow {
  name: string;
  td: number;
  expected_td: number;
  residual: number;
  endzone_targets: number;
  rz_targets: number;
}

export interface TdColumn {
  label: string;
  kind: "opportunity" | "regression" | "improvement";
  blurb: string;
  members: TdRow[];
}

/** Where a computed touchdown column and the operator's own column agree. */
export interface Agreement {
  key: string;
  label: string;
  computed_label: string;
  both: string[];
  /** He lists them; the fit ranked them and put them elsewhere. A real dispute. */
  workbook_disagrees: string[];
  /** He lists them; the fit never saw them. A gap, not a dispute. */
  workbook_uncovered: string[];
  computed_only: string[];
}

export interface GridComputed {
  season: number;
  pool: number;
  matched: number;
  /** Touchdowns per look, fitted by field zone across the qualifying pool. */
  fit: { endzone: number; red_zone: number; elsewhere: number; r2: number };
  ranked: string[];
  columns: TdColumn[];
  agreement?: Agreement[];
}

/** One receiver, and which way the grid's seven columns point for him. */
export interface Verdict {
  name: string;
  team: string | null;
  up: string[];
  down: string[];
  schemes: string[];
  /** The same, shortened for display, so a component never abbreviates. */
  tags: string[];
}

export interface VerdictGroup {
  key: string;
  label: string;
  blurb: string;
  members: Verdict[];
}

export interface Verdicts {
  counted: number;
  groups: VerdictGroup[];
}

export interface WrCharts {
  season: number;
  updated: string;
  source: string;
  note: string;
  data: {
    charts: {
      targets_airyards: WrChart;
      airyards_share: WrChart;
      wopr_ppg: WrChart;
    };
    /**
     * The two supplementary charts, from the nflverse export rather than the
     * workbook — the only place this page reads a second source.
     */
    stickiness: Stickiness | null;
    consistency: Consistency | null;
    groups: ConsistencyGroups | null;
    /**
     * The check-the-box grid, split at the source. Four columns name players
     * and three name teams, and they render differently — a team gets a chip —
     * so the extractor separates them rather than a component guessing from
     * the string.
     */
    grid: { players: BoxColumn[]; teams: BoxColumn[] };
    /** Three columns the workbook does not have, fitted from the export. */
    grid_computed: GridComputed | null;
    /** The grid's seven columns crossed, and read as a verdict on each player. */
    verdicts: Verdicts | null;
  };
}

const wrFile_ = wrFile as unknown as WrCharts;

export const WR_CHARTS = wrFile_.data.charts;
export const WR_STICKINESS = wrFile_.data.stickiness;
export const WR_CONSISTENCY = wrFile_.data.consistency;
export const WR_GROUPS = wrFile_.data.groups;
export const WR_GRID = wrFile_.data.grid;
export const WR_GRID_COMPUTED = wrFile_.data.grid_computed;
export const WR_VERDICTS = wrFile_.data.verdicts;
export const WR_SEASON = wrFile_.season;
export const WR_UPDATED = wrFile_.updated;
export const WR_SOURCE = wrFile_.source;

// ============================== Quarterback ==============================
// Built from the operator's QB Statistics PDF by scripts/curated/qb_charts.py.
// One season, so these are descriptions of 2025 rather than laws.

export interface QbScatter extends ScatterSeries {
  /** Pearson r for this pair, computed in the extractor (§11). */
  r: number | null;
}

export interface QbCharts {
  season: number;
  updated: string;
  source: string;
  note: string;
  data: {
    charts: {
      rushing: QbScatter;
      scrambles: QbScatter;
      efficiency: QbScatter;
      environment: QbScatter;
    };
    correlations: Record<string, number | null>;
    counts: Record<string, number>;
    per_attempt: { pass: number; rush: number; ratio: number | null; n: number } | null;
    /** 2025 rushing lines, from scripts/curated/data/qb-rushing-2025.json. */
    rushing_table: { name: string; att: number; yards: number; tds: number; games: number }[];
    corrections: { name: string; printed: number; actual: number; why: string }[];
  };
}

const qbFile_ = qbFile as unknown as QbCharts;

export const QB_CHARTS = qbFile_.data.charts;
export const QB_CORR = qbFile_.data.correlations;
export const QB_COUNTS = qbFile_.data.counts;
export const QB_PER_ATTEMPT = qbFile_.data.per_attempt;
export const QB_CORRECTIONS = qbFile_.data.corrections;
export const QB_RUSHING_TABLE = qbFile_.data.rushing_table;
export const QB_SEASON = qbFile_.season;
export const QB_SOURCE = qbFile_.source;

/**
 * Run-defence matchup tables, five seasons of them.
 *
 * A separate payload from `rb-charts.json` on purpose: these two blocks were
 * screenshotted rather than being in the workbook, and `rb_charts.py` still
 * targets the `(2)` workbook (docs/STATE.md open item 10), so folding them in
 * would have meant regenerating every RB chart from a two-versions-old sheet.
 * `scripts/curated/rb_matchups.py` validates the transcription and computes the
 * persistence, appearance and overlap figures the page quotes (§11).
 */
export const RB_MATCHUPS = rbMatchupsFile as unknown as RbMatchups;

export interface RbMatchupTable {
  title: string;
  operator_note: string;
  least_label: string;
  most_label: string;
  seasons: { season: number; least: string[]; most: string[] }[];
  persistence: Record<
    "least" | "most",
    { pairs: number; retained: number; per_season: number; chance: number }
  >;
  appearances: Record<"least" | "most", { abbr: string; seasons: number }[]>;
}

export interface RbStalwart {
  abbr: string;
  yards_seasons: number;
  rate_seasons: number;
  combined: number;
}

export interface RbMatchups {
  updated: string;
  source: string;
  seasons: number[];
  yards_allowed: RbMatchupTable;
  rush_rate: RbMatchupTable;
  overlap: { season: number; teams: { abbr: string; nickname: string }[] }[];
  overlap_per_season: number;
  /** Clubs in the *top* ten of both blocks in 3+ of the five seasons: hard to
   *  run on, and not run at much either. */
  stalwarts: RbStalwart[];
  /** Qualified on five-year counts but sits in the latest season's bottom
   *  overlap — the counterexample, published rather than dropped. */
  stalwarts_lapsed: RbStalwart[];
  latest_season: number;
}
