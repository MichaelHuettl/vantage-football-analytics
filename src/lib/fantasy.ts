import fantasyFile from "@/data/fantasy-model.json";
import type { Position } from "./types";

/**
 * The fantasy projection model's output, typed.
 *
 * Produced by a separate modelling repo and copied into `src/data/` by
 * `scripts/curated/fantasy_model.py`, the same arrangement the game-prediction
 * payload has. Everything here is a read: the lifts, the correlations, the
 * board orderings and the driver weights all arrive settled, because this repo
 * has no scientific Python and a second implementation of the arithmetic would
 * be a second thing to keep true (§11).
 */

export interface PositionMetrics {
  model: string;
  features: number;
  train_rows: number;
  test_rows: number;
  test_mae: number;
  test_rmse: number;
  season_total_mae: number;
  naive_mae: number;
  /** Improvement over "assume he keeps doing what he has been doing". */
  lift: number;
  backtest_mae: number;
  backtest_naive: number;
  backtest_lift: number;
}

export interface BacktestRow {
  position: Position | string;
  season: number;
  mae: number;
  naive: number;
  model: string;
}

export interface WindowRow {
  position: string;
  all_history: number;
  window_5: number;
  difference: number;
}

export interface CalibrationRow {
  band: string;
  players: number;
  projected: number;
  actual: number;
}

export interface Driver {
  feature: string;
  value: number;
}

export interface QualityRow {
  position: string;
  players: number;
  /** Spearman on season totals — sums weekly forecasts, so it is not a draft. */
  in_season_rho: number;
  /** Spearman from each player's first row of the season. This one is a draft. */
  draft_day_rho: number | null;
  top12_hit: number;
  median_rank_error: number;
}

export interface PastPick {
  rank: number;
  player: string;
  team: string;
  games: number;
  projected: number;
  actual: number;
  ppg: number;
  finish: number;
}

export interface FuturePick {
  rank: number;
  player: string;
  team: string;
  projected: number;
  ppg: number;
  floor: number;
  ceiling: number;
  prior_games: number;
  /** Under sixteen prior games — the projection rests on a short record. */
  thin: boolean;
}

/**
 * A player the eligibility rule keeps off the 2026 board.
 *
 * Published rather than dropped quietly. A board that removes someone a reader
 * expected to find owes them the name, the reason and the rank he would have
 * held — this site's whole argument is that a ranking should be auditable, and
 * an invisible exclusion is the one edit a reader cannot check (§8).
 */
export interface ExcludedPick {
  position: string;
  player: string;
  team: string | null;
  prior_games: number;
  /** Where he would have sat had the rule not applied. */
  would_have_ranked: number;
}

/**
 * How often the projection landed within a band of the real score, per
 * position, on the weeks a manager would actually have been choosing between.
 */
export interface HitRatePosition {
  position: string;
  rows: number;
  /** The median score actually posted — the band means nothing without it. */
  median_actual: number;
  within_5: number;
  naive_within_5: number;
  within_10: number;
  naive_within_10: number;
}

export interface HitRateOverall {
  rows: number;
  [band: string]: number;
}

export interface HitRates {
  bands: number[];
  seasons: [number, number];
  season_count: number;
  /** Seasons out of `season_count` where the model beat the baseline, by band. */
  seasons_model_better: Record<string, number>;
  starters_per_week: Record<string, number>;
  /** Why the all-rows figure is the easier question, in numbers. */
  zeroes: {
    share_of_rows: number;
    rows: number;
    model_within_2: number;
    naive_within_2: number;
    scored_model_within_2: number;
    scored_naive_within_2: number;
  };
  overall: { all: HitRateOverall; starters: HitRateOverall };
  positions: HitRatePosition[];
}

export interface BoardRule {
  min_prior_games: number;
  reason: string;
  excluded: ExcludedPick[];
}

interface FantasyFile {
  updated: string;
  source: string;
  note: string;
  data: {
    config: { train_seasons: number[]; valid_season: number; test_season: number };
    scoring: Record<string, string>;
    positions: Record<string, PositionMetrics>;
    backtest: BacktestRow[];
    history_vs_window: WindowRow[];
    calibration: CalibrationRow[];
    coverage: Record<string, number>;
    drivers: Record<string, { kind: string; items: Driver[] }>;
    boards: {
      season_2025: Record<string, PastPick[]>;
      season_2026: Record<string, FuturePick[]>;
    };
    board_limit: number;
    board_totals: Record<string, Record<string, number>>;
    board_rule: BoardRule;
    hit_rates: HitRates;
    ranking_quality: QualityRow[];
    data_span: { from: number; to: number; player_weeks: number };
  };
}

const file = fantasyFile as unknown as FantasyFile;
const d = file.data;

export const FM_UPDATED = file.updated;
export const FM_SOURCE = file.source;
export const FM_CONFIG = d.config;
export const FM_SCORING = d.scoring;
export const FM_METRICS = d.positions;
export const FM_BACKTEST = d.backtest;
export const FM_WINDOW = d.history_vs_window;
export const FM_CALIBRATION = d.calibration;
export const FM_COVERAGE = d.coverage;
export const FM_DRIVERS = d.drivers;
export const FM_BOARDS = d.boards;
export const FM_BOARD_LIMIT = d.board_limit;
export const FM_BOARD_TOTALS = d.board_totals;
export const FM_BOARD_RULE = d.board_rule;
export const FM_HIT_RATES = d.hit_rates;
export const FM_QUALITY = d.ranking_quality;
export const FM_SPAN = d.data_span;

/** The order boards and tables are presented in, everywhere on the page. */
export const FM_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"] as const;
export type FantasyPosition = (typeof FM_POSITIONS)[number];

export const FM_POSITION_NAME: Record<FantasyPosition, string> = {
  QB: "Quarterback",
  RB: "Running back",
  WR: "Wide receiver",
  TE: "Tight end",
  K: "Kicker",
  DST: "Defense / special teams",
};

/** Back-test series for one position, oldest season first. */
export const backtestFor = (pos: string): BacktestRow[] =>
  FM_BACKTEST.filter((r) => r.position === pos).sort((a, b) => a.season - b.season);

/** Extent of the back-test chart, from the data rather than assumed. Every
 *  season sits between about 3 and 7 points of error, so an axis from zero
 *  would draw twenty near-identical bars. */
export const FM_BACKTEST_EXTENT = {
  min: Math.min(...FM_BACKTEST.flatMap((r) => [r.mae, r.naive])),
  max: Math.max(...FM_BACKTEST.flatMap((r) => [r.mae, r.naive])),
};

export const qualityFor = (pos: string): QualityRow | undefined =>
  FM_QUALITY.find((q) => q.position === pos);

/**
 * Players the eligibility rule removed from one position's 2026 board, best
 * projection first — the order a reader would have met them on the board.
 */
export const excludedFor = (pos: string): ExcludedPick[] =>
  FM_BOARD_RULE.excluded
    .filter((e) => e.position === pos)
    .sort((a, b) => a.would_have_ranked - b.would_have_ranked);
