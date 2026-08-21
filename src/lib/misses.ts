import missesFile from "@/data/model-misses.json";
import type { ConfidenceTier } from "./predictions";

/**
 * The case study's data: every game the model got wrong, and how each season went.
 *
 * Written by `scripts/curated/model_misses.py`, which reads the prediction
 * pipeline's own miss report and the artifacts behind it and refuses to write
 * unless the two agree. Everything below is a read — no figure on the case
 * study page is worked out in a component (§11), including the orderings and
 * the best/worst picks, which are decided in the Python.
 *
 * Kept separate from `predictions.ts` because the sources are different. That
 * file is the shipped payload, regenerated per slate; this is a retrospective
 * over sixteen finished seasons and changes only when the model is refit.
 */

/** A confidence band as the report groups misses. */
export interface MissBand {
  band: string;
  games: number;
  wrong: number;
  accuracy: number;
}

/** How badly the model lost, bucketed. */
export interface MissMargin {
  bucket: string;
  misses: number;
  share: number;
}

/** One of the twenty worst, ranked by confidence × losing margin. */
export interface WorstMiss {
  game_id: string;
  picked: string;
  confidence: number;
  final: string;
  /** Turnover margin for the team the model picked. Negative means it lost the
   *  battle, which is the case in most of these. */
  turnover_margin: number;
  performer: string;
}

export interface ConditionSplit {
  condition: string;
  games: number;
  accuracy: number;
}

/** One walk-forward fold: the model's record for a single season it had not
 *  seen when it predicted. */
export interface SeasonRecord {
  season: number;
  games: number;
  accuracy: number;
  market_accuracy: number;
  /** Model minus market. Negative in most seasons — that is the honest picture. */
  gap: number;
  misses: number;
  shared_with_market: number;
  model_specific: number;
  one_score_misses: number;
  blowout_misses: number;
  close_game_share: number;
  mean_confidence: number;
  log_loss: number | null;
  calibration_error: number | null;
}

interface MissesFile {
  window: { from: number; to: number };
  updated: string;
  source: string;
  note: string;
  data: {
    headline: {
      games: number;
      misses: number;
      accuracy: number;
      median_losing_margin: number;
      model_specific: number;
    };
    shared_with_market: number;
    shared_share: number;
    model_specific_share_of_slate: number;
    bands: MissBand[];
    margins: MissMargin[];
    worst: WorstMiss[];
    weather: ConditionSplit[];
    turnovers: {
      when_right: number;
      when_wrong: number;
      swing: number;
      misses_losing_to: number;
    };
    qb_out: { games: number; accuracy: number };
    divisional: {
      div_accuracy: number;
      div_games: number;
      non_div_accuracy: number;
      non_div_games: number;
    };
    seasons: SeasonRecord[];
    season_summary: {
      best: number;
      worst: number;
      best_vs_market: number;
      worst_vs_market: number;
      market_correlation: number;
      market_best: number;
      market_worst: number;
      span: [number, number];
      total_games: number;
      /** Extent for the season bars, computed in the extractor. */
      scale: { min: number; max: number };
    };
  };
}

const file = missesFile as unknown as MissesFile;

export const MISS_WINDOW = file.window;
export const MISS_SOURCE = file.source;
export const MISS_HEADLINE = file.data.headline;
export const MISS_SHARED = file.data.shared_with_market;
export const MISS_SHARED_SHARE = file.data.shared_share;
export const MISS_SOLO_SLATE_SHARE = file.data.model_specific_share_of_slate;
export const MISS_BANDS = file.data.bands;
export const MISS_MARGINS = file.data.margins;
export const MISS_WORST = file.data.worst;
export const MISS_WEATHER = file.data.weather;
export const MISS_TURNOVERS = file.data.turnovers;
export const MISS_QB_OUT = file.data.qb_out;
export const MISS_DIVISIONAL = file.data.divisional;
export const MISS_SEASONS = file.data.seasons;
export const MISS_SUMMARY = file.data.season_summary;

/** Band names as the report writes them, mapped to the tier keys the rest of
 *  the section already colours by, so one band means one colour sitewide. */
const BAND_TO_TIER: Record<string, ConfidenceTier> = {
  "coin flip": "coin_flip",
  low: "low",
  medium: "medium",
  high: "high",
};
export const bandTier = (band: string): ConfidenceTier | null =>
  BAND_TO_TIER[band] ?? null;

const bySeason = (year: number) =>
  MISS_SEASONS.find((s) => s.season === year) ?? null;

/** The four seasons the case study argues from, resolved in one place. */
export const MISS_BEST = bySeason(MISS_SUMMARY.best);
export const MISS_WORST_SEASON = bySeason(MISS_SUMMARY.worst);
export const MISS_BEST_VS_MARKET = bySeason(MISS_SUMMARY.best_vs_market);
export const MISS_WORST_VS_MARKET = bySeason(MISS_SUMMARY.worst_vs_market);

/** Extent for the season bars. Every season sits between 58% and 70%, so bars
 *  drawn from zero would be sixteen near-identical blocks; the axis is the
 *  data's own range and it is computed in the Python, not here (§11). */
export const MISS_SCALE = MISS_SUMMARY.scale;
