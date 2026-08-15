import teamsFile from "@/data/teams.json";
import type { Envelope, Team } from "./types";

const file = teamsFile as Envelope<Team[]>;

export const TEAMS: Team[] = file.data;

const byAbbr = new Map(TEAMS.map((t) => [t.abbr, t]));

export function getTeam(abbr: string): Team | undefined {
  return byAbbr.get(abbr.toUpperCase());
}

/**
 * WCAG relative luminance. Used to decide whether a team's colour can carry
 * white or black text — several teams are near-black (LV, CHI, CLE) and a
 * naive white-on-primary chip would fail contrast for the light ones (PIT
 * gold, NO gold).
 */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableOn(hex: string): string {
  return luminance(hex) > 0.45 ? "#0F1318" : "#FFFFFF";
}

/**
 * True for teams whose primary is dark enough to disappear against a dark
 * page background. Those chips get a hairline border so the shape survives.
 */
export function needsEdge(hex: string): boolean {
  return luminance(hex) < 0.06;
}

export const DIVISIONS = ["East", "North", "South", "West"] as const;

/**
 * Resolve a full team name to its abbreviation.
 *
 * The workbook writes "Arizona Cardinals" where the site keys on ARI. Matching
 * on the nickname alone is enough and is the safe half: nicknames are unique
 * across the league, cities are not — "New York" and "Los Angeles" each name
 * two teams.
 */
export function teamByName(full: string): Team | undefined {
  const s = full.trim().toLowerCase();
  return TEAMS.find(
    (t) =>
      s === `${t.city} ${t.nickname}`.toLowerCase() ||
      s.endsWith(t.nickname.toLowerCase()),
  );
}
