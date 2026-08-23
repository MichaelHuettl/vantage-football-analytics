import payload from "@/data/game-predictions.json";
import marginsFile from "@/data/game-margins.json";
import featuresFile from "@/data/model-features.json";
import { canonTeams } from "./teams";
import { normalizeProse } from "./prose";

/**
 * The Game Prediction Model's output, typed and tidied.
 *
 * The section is "Game Prediction Model" and lives at `/model`; the payload keeps its
 * `game-predictions.json` name because that is the filename the prediction
 * pipeline exports and this repo copies (docs/STATE.md). Renaming it here would
 * put a translation step into a hand-off that currently has none.
 *
 * Produced by a separate modelling pipeline (`export_dashboard_payload.py`,
 * outside this repo) and copied to `src/data/` like every other data file, so a
 * malformed regeneration fails `npm run build` with a line number rather than
 * breaking a page in front of a reader.
 *
 * Everything derived lives here. §11 does not let a component work out what is
 * true, and on this page that rule matters more than usual: the difference
 * between a rating and a raw percentile is the difference between calling
 * Seattle's defence elite and calling it the worst in the league.
 */

export interface TeamSide {
  team: string;
  win_probability: number;
}

export interface MetricSide {
  team: string;
  /** Null where the pipeline computes no value — explosive_pass_rate has no
   *  defensive side for any team, so these are nullable by necessity. */
  offense: number | null;
  defense: number | null;
  offense_percentile: number | null;
  defense_percentile: number | null;
  /** 0-100, already oriented so 100 is always good. Use this for charts. */
  offense_rating: number | null;
  defense_rating: number | null;
}

export interface FeatureComparison {
  metric: string;
  /** False when the pipeline has no values for this metric yet — injury_impact
   *  is false on the 2026 slate because no injury reports are published. An
   *  empty state is correct here; a blank chart is not. */
  data_available?: boolean;
  label: string;
  short: string;
  definition: string;
  higher_is_better: boolean;
  defense_metric_label: string;
  ratings_are_pre_oriented: boolean;
  home: MetricSide;
  away: MetricSide;
}

/** A finished game, kept only to show what an injury gap looks like. */
export interface ReferenceGame {
  game_id: string;
  season: number;
  week: number;
  home_team: string;
  away_team: string;
  actual_margin: number;
  actual_home_win: boolean;
  home_inj_impact: number;
  away_inj_impact: number;
  home_inj_qb_out: boolean;
  away_inj_qb_out: boolean;
  note: string;
}

export type ConfidenceTier = "coin_flip" | "low" | "medium" | "high";

export type ContextType =
  | "form" | "venue" | "scheme" | "rest" | "injury" | "weather" | "context";

export interface SituationalCard {
  type: ContextType;
  team: string | null;
  headline: string;
  detail: string;
  impact: "positive" | "negative" | "neutral";
}

export interface PredictedGame {
  game_id: string;
  season: number;
  week: number;
  kickoff: string;
  home: TeamSide;
  away: TeamSide;
  predicted_winner: string;
  predicted_margin: number;
  predicted_spread_display: string;
  market_spread_line: number | null;
  model_minus_market: number | null;
  margin_implied_probability: number;
  /** The win-probability model and the margin model picked different sides. */
  models_disagree: boolean;
  /** Measured band, not a hand-written rule. `coin_flip` is a real outcome:
   *  a fifth of NFL games sit in it and it hits 49.8%. */
  confidence: ConfidenceTier;
  /** How often this band has actually been right, out of sample. */
  confidence_historical_accuracy: number;
  feature_comparison: FeatureComparison[];
  situational_context: SituationalCard[];
}

interface Payload {
  generated_at: string;
  meta: {
    model_name: string; model_family: string; note: string;
    training_seasons: number[]; training_games: number;
    validation: string; rolling_window: string; data_source: string;
  };
  performance: {
    out_of_sample_games: number; log_loss: number; accuracy: number;
    brier_score: number; auc: number; calibration_error: number;
    baselines: Record<string, { accuracy: number; log_loss: number }>;
    honest_caveat: string;
  };
  methodology: {
    glossary: Record<string, { label: string; short: string; definition: string; higher_is_better: boolean }>;
    steps: { title: string; body: string }[];
  };
  feature_importance: { feature: string; importance: number; label: string }[];
  games: PredictedGame[];
  /** Completed games with heavy injury asymmetry, so the injury metric has real
   *  values to illustrate. A compact shape, not full game objects — and
   *  historical, so never mixed into the upcoming slate. */
  reference_games: ReferenceGame[];
  confidence_tiers: {
    bands: {
      tier: ConfidenceTier;
      prob_range: [number, number];
      games: number;
      share_of_slate: number;
      historical_accuracy: number;
    }[];
    cumulative: {
      threshold: number; n: number; coverage: number; accuracy: number;
    }[];
    note: string;
  };
}

// Team codes and house punctuation, both fixed where the payload enters:
// this repo copies these files and cannot edit them at source.
const file = normalizeProse(canonTeams(payload as unknown as Payload));

export const PRED_META = file.meta;
export const PRED_PERF = file.performance;
export const PRED_METHOD = file.methodology;
export const PRED_GAMES = file.games;
export const PRED_GENERATED = file.generated_at;
export const PRED_TIERS = file.confidence_tiers;
export const PRED_REFERENCE = file.reference_games;

/** Band metadata by tier, for labelling a single game. */
export const TIER_BY_NAME = Object.fromEntries(
  file.confidence_tiers.bands.map((b) => [b.tier, b]),
) as Record<ConfidenceTier, (typeof file.confidence_tiers.bands)[number]>;

/**
 * How a tier should be described.
 *
 * `coin_flip` deliberately does not get a verb. Its measured hit rate is 49.8%
 * across 790 games — indistinguishable from chance — so presenting a pick there
 * would dress up a guess. The page names it and declines.
 */
export const TIER_LABEL: Record<ConfidenceTier, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  coin_flip: "Coin flip, no call",
};

/**
 * The exporter's label prettifier over-strips: `diff_point_diff_ewma` arrives as
 * "point" and `diff_team_win_ewma` as "team win". Rather than print those, the
 * feature name is re-expanded here from its parts.
 *
 * This is a frontend repair of an upstream bug, recorded as such: the file
 * still carries the short labels, so anything else reading it inherits them.
 */
const TERMS: [RegExp, string][] = [
  [/\bpoint diff\b/, "point differential"],
  [/\bteam win\b/, "team win rate"],
  [/\boff\b/, "offensive"],
  [/\bdef\b/, "defensive"],
  [/\bepa\b/g, "EPA"],
  [/\bcpoe\b/g, "CPOE"],
  [/\byds\b/, "yards"],
  [/\broof closed\b/, "indoor roof"],
  [/\brest diff\b/, "rest advantage"],
  [/\bsuccess proxy\b/, "success rate"],
];

export function featureLabel(feature: string): string {
  // Underscores are word characters, so the term rules below can only fire once
  // the name is words. Stripping the prefix/suffix first, then spacing, then
  // replacing — in that order — is what makes `\boff\b` match at all.
  let s = feature.replace(/^diff_/, "").replace(/_ewma$/, "").replace(/_/g, " ");
  for (const [re, to] of TERMS) s = s.replace(re, to);
  s = s.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Importances, relabelled and normalised to the largest so bars can be drawn. */
export const PRED_FEATURES = file.feature_importance
  .map((f) => ({
    feature: f.feature,
    label: featureLabel(f.feature),
    importance: f.importance,
  }))
  .sort((a, b) => b.importance - a.importance)
  .map((f, _i, all) => ({ ...f, share: f.importance / all[0].importance }));

/** How the model compares with the market, stated once and reused. */
export const MARKET = {
  model: { accuracy: PRED_PERF.accuracy, log_loss: PRED_PERF.log_loss },
  vegas: PRED_PERF.baselines.vegas_moneyline,
  home: PRED_PERF.baselines.always_pick_home,
  /** True when the market is the better forecaster. It is. */
  market_is_better:
    PRED_PERF.baselines.vegas_moneyline.log_loss < PRED_PERF.log_loss,
};

export const getGame = (id: string) => PRED_GAMES.find((g) => g.game_id === id);

/** Kickoff, formatted once. Payload times are Eastern already. */
export function kickoffLabel(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

/**
 * The weeks the payload actually contains, in order.
 *
 * Derived rather than hard-coded: today this is a single Week 1, and the tab
 * strip grows on its own as the backend adds weeks rather than needing a code
 * change each Tuesday.
 */
export const PRED_WEEKS = [...new Set(PRED_GAMES.map((g) => g.week))].sort(
  (a, b) => a - b,
);

export const gamesForWeek = (week: number) =>
  PRED_GAMES.filter((g) => g.week === week);

/**
 * The headline numbers for the overview strip.
 *
 * All read from the payload, so the page cannot claim a record the model does
 * not have. `seasons_covered` is inclusive of both endpoints — 2018 to 2025 is
 * eight seasons, not seven.
 */
const [firstSeason, lastSeason] = PRED_META.training_seasons;
export const PRED_OVERVIEW = {
  first_season: firstSeason,
  last_season: lastSeason,
  seasons_covered: lastSeason - firstSeason + 1,
  training_games: PRED_META.training_games,
  tested_games: PRED_PERF.out_of_sample_games,
  accuracy: PRED_PERF.accuracy,
  home_baseline: PRED_PERF.baselines.always_pick_home.accuracy,
  market_baseline: PRED_PERF.baselines.vegas_moneyline.accuracy,
  /** Percentage points clear of the naive baseline the model was built to beat. */
  over_home_baseline:
    PRED_PERF.accuracy - PRED_PERF.baselines.always_pick_home.accuracy,
  /** Negative: the market is better. Kept signed so the UI cannot flatter it. */
  vs_market: PRED_PERF.accuracy - PRED_PERF.baselines.vegas_moneyline.accuracy,
  slate_games: PRED_GAMES.length,
  calibration_error: PRED_PERF.calibration_error,
  /** The plain-English version of ECE: how far a stated probability drifts from
   *  the observed rate, in percentage points. 0.0173 -> "within about 1.7". */
  calibration_drift_pts: PRED_PERF.calibration_error * 100,
};

/**
 * How close the games themselves are.
 *
 * This is the context the accuracy figures need. A model that calls 65% of NFL
 * games correctly sounds unimpressive until you notice a quarter of them are
 * decided by a field goal — and it sounds impossible to improve much on once
 * you notice that predicting *every* non-close game perfectly would still only
 * reach the ceiling below. Computed from the same games the model trains on.
 */
export const GAME_MARGINS = normalizeProse(marginsFile) as unknown as {
  note: string;
  source: string;
  games: number;
  seasons: [number, number];
  median_margin: number;
  within_3: number;
  within_7: number;
  within_10: number;
  /** Accuracy of a hypothetical forecaster that is perfect on every game
   *  decided by more than 7 points and coin-flips the rest. */
  perfect_above_7_ceiling: number;
  /** Share of games ending on each exact margin. Football scoring makes this
   *  violently lumpy rather than a smooth curve. */
  margin_frequency: Record<string, number>;
};

/**
 * Every feature the model fits on, grouped.
 *
 * The head-to-head chart shows nine metrics, which reads as though nine numbers
 * drive the forecast. They do not — 55 do, and the nine are the ones that make
 * sense side by side. This list exists so the page can say that plainly instead
 * of leaving the impression uncorrected.
 */
export const MODEL_FEATURES = normalizeProse(featuresFile) as unknown as {
  note: string;
  source: string;
  total: number;
  groups: { name: string; features: { feature: string; label: string }[] }[];
};

/**
 * Model importance for a displayed metric, where the payload publishes one.
 *
 * `feature_importance` carries only the top twelve, so four of the nine charted
 * metrics have no published weight. They are ordered last rather than assumed
 * to be unimportant — absent from a top-twelve list is not the same as small.
 */
const METRIC_TO_FEATURE: Record<string, string> = {
  epa_per_play: "diff_off_epa_per_play_ewma",
  epa_per_dropback: "diff_off_epa_per_dropback_ewma",
  epa_per_rush: "diff_off_epa_per_rush_ewma",
  cpoe: "diff_off_cpoe_ewma",
  success_proxy: "diff_off_success_proxy_ewma",
  sack_rate: "diff_off_sack_rate_ewma",
  turnover_rate: "diff_off_turnover_rate_ewma",
  explosive_pass_rate: "diff_off_explosive_pass_rate_ewma",
  injury_impact: "diff_inj_impact",
};

const IMPORTANCE_BY_FEATURE = Object.fromEntries(
  file.feature_importance.map((f) => [f.feature, f.importance]),
);

export const metricImportance = (metric: string): number | null =>
  IMPORTANCE_BY_FEATURE[METRIC_TO_FEATURE[metric]] ?? null;

/** Displayed metrics, heaviest published weight first, unranked ones last. */
export function rankMetrics<T extends { metric: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ia = metricImportance(a.metric);
    const ib = metricImportance(b.metric);
    if (ia === null && ib === null) return 0;
    if (ia === null) return 1;
    if (ib === null) return -1;
    return ib - ia;
  });
}

/** Top-weighted model inputs that have no head-to-head display, so the page can
 *  name what it is not showing rather than implying the chart is the model. */
export const UNCHARTED_TOP_FEATURES = file.feature_importance
  .filter((f) => !Object.values(METRIC_TO_FEATURE).includes(f.feature))
  .map((f) => ({ ...f, label: featureLabel(f.feature) }));
