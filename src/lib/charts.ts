import rbFile from "@/data/rb-charts.json";

export interface ScatterPoint {
  name: string;
  x: number;
  y: number;
  /** Set by the pipeline on the points worth naming on the chart. */
  label?: boolean;
  /** Placement priority among labelled points, most extreme first. */
  rank?: number;
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
    opportunity: LeaderTable;
    targets: LeaderTable;
  };
}

const file = rbFile as unknown as RbCharts;

export const RB_CHARTS = file.data;
export const RB_SEASON = file.season;
export const RB_UPDATED = file.updated;
export const RB_SOURCE = file.source;
