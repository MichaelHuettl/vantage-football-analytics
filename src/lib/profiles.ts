import profilesFile from "@/data/player-profiles.json";

/**
 * Recorded production for the ranked pool, from the nflverse export.
 *
 * Everything here happened. There is no projection in this file, which is the
 * point: a player page on this site should be the evidence a ranking has to
 * survive, not a second opinion about the future (§1).
 */
export interface SeasonLine {
  season: number;
  team: string | null;
  games: number | null;
  stats: Record<string, number>;
}

export interface GameLine {
  week: number;
  opponent: string | null;
  fantasy_ppr: number | null;
  targets: number | null;
  receptions: number | null;
  rec_yards: number | null;
  carries: number | null;
  rush_yards: number | null;
  pass_yards: number | null;
  pass_td: number | null;
  total_td: number | null;
}

export interface PlayerProfile {
  player_id: string;
  name: string;
  position: "QB" | "RB" | "WR" | "TE";
  gsis_id: string;
  headshot_url: string | null;
  labels: Record<string, string>;
  decimals: Record<string, number>;
  seasons: SeasonLine[];
  game_log: GameLine[];
  next_gen: Record<string, Record<string, number>>;
  snap_share_2025: number | null;
}

const file = profilesFile as unknown as {
  season: number;
  source: string;
  note: string;
  data: Record<string, PlayerProfile>;
};

export const PROFILE_SEASON = file.season;
export const PROFILE_SOURCE = file.source;
export const getProfile = (id: string): PlayerProfile | undefined => file.data[id];

/**
 * The figures that lead a profile, by position.
 *
 * An analyst does not open with the same number for a quarterback and a tight
 * end, and neither should the page. Order is deliberate: volume, then what came
 * of it, then the efficiency that says whether it will hold.
 */
export const HEADLINE_KEYS: Record<PlayerProfile["position"], string[]> = {
  QB: ["pass_yards", "pass_td", "interceptions", "epa_per_db", "cpoe", "rush_td"],
  RB: ["touches", "rush_yards", "rush_td", "ypc", "opportunity_share", "hvt"],
  WR: ["targets", "rec_yards", "rec_td", "target_share", "air_yards_share", "wopr"],
  TE: ["targets", "rec_yards", "rec_td", "target_share", "air_yards_share", "wopr"],
};

/** Metrics expressed as a share of something, so the page can print a %. */
const SHARE_KEYS = new Set([
  "target_share", "air_yards_share", "carry_share", "opportunity_share",
  "catch_rate", "success_rate", "wopr",
]);

export function formatStat(key: string, value: number, decimals: number): string {
  if (SHARE_KEYS.has(key)) return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(decimals);
}

/** The most recent season on file, which is what a profile leads with. */
export const latestSeason = (p: PlayerProfile): SeasonLine | undefined =>
  p.seasons.length ? p.seasons[p.seasons.length - 1] : undefined;

/**
 * A player's best and worst weeks, for the game log's colour scale.
 *
 * Computed here rather than in the component (§11) — a max over a column is
 * still a metric, and a component that works one out is a component that can
 * disagree with the next one that tries.
 */
export function fantasyRange(p: PlayerProfile): { min: number; max: number } | null {
  const pts = p.game_log.map((g) => g.fantasy_ppr).filter((v): v is number => v !== null);
  if (!pts.length) return null;
  return { min: Math.min(...pts), max: Math.max(...pts) };
}
