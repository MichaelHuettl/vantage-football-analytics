import rbFile from "@/data/rb-charts.json";

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
