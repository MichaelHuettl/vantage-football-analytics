import rbFile from "@/data/rb-charts.json";
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

const file = rbFile as unknown as RbCharts;

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
    /** Receivers the operator tracked who fell outside the charted top 50. */
    notable: { label: string; names: string[] };
    /**
     * The check-the-box grid, split at the source. Four columns name players
     * and three name teams, and they render differently — a team gets a chip —
     * so the extractor separates them rather than a component guessing from
     * the string.
     */
    grid: { players: BoxColumn[]; teams: BoxColumn[] };
  };
}

const wrFile_ = wrFile as unknown as WrCharts;

export const WR_CHARTS = wrFile_.data.charts;
export const WR_NOTABLE = wrFile_.data.notable;
export const WR_GRID = wrFile_.data.grid;
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
