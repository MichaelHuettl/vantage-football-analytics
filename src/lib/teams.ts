import teamsFile from "@/data/teams.json";
import type { Envelope, Team } from "./types";

const file = teamsFile as Envelope<Team[]>;

export const TEAMS: Team[] = file.data;

const byAbbr = new Map(TEAMS.map((t) => [t.abbr, t]));

/**
 * Codes that arrive meaning a team this site keys differently.
 *
 * nflverse writes `LA` for the Rams and `AZ` for the Cardinals; the league and
 * `teams.json` use `LAR` and `ARI`. Three payloads reach the site carrying the
 * nflverse form — the fantasy model's, the player profiles' and the prediction
 * pipeline's — and an unresolved code never errors: `TeamChip` falls back to a
 * grey chip printing the raw string, so the Rams quietly lost their colours on
 * every board they appear on. Aliasing at the lookup fixes all three at once,
 * including the payload this repo only copies and does not own.
 *
 * Deliberately limited to the two live disagreements. Relocated franchises
 * (`STL`, `SD`, `OAK`) are a different question — those codes are correct for
 * the seasons they describe, and mapping them would relabel history.
 */
const ALIASES: Record<string, string> = { LA: "LAR", AZ: "ARI" };

export function getTeam(abbr: string): Team | undefined {
  const code = abbr.toUpperCase();
  return byAbbr.get(ALIASES[code] ?? code);
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

/**
 * Field names whose value is a team code, for `canonTeams` below.
 *
 * Deliberately a fixed list rather than "anything that looks like a code": a
 * blanket rewrite would also catch identifiers that merely contain one, and
 * `game_id` — `2026_01_SF_LA`, the published route for a prediction page — is
 * exactly that. Rewriting it would break every link the site has shipped.
 */
const TEAM_FIELDS = new Set([
  "team", "home_team", "away_team", "opponent", "opponent_team",
  "predicted_winner",
]);

/**
 * Fields holding a sentence with a team code written into it.
 *
 * The prediction pipeline composes its own prose — "LA faces a 4-3 front",
 * "LA -3.1" — so the code is not a field to translate but a token inside one.
 * Named explicitly rather than swept for, because a blanket rewrite over every
 * string in a payload is the kind of thing that silently edits a player's name
 * one release from now. Only whole-word codes are replaced.
 *
 * This is a display-layer repair on another session's text. The real fix is
 * for that pipeline to emit the league's codes, which goes through Michael.
 */
const TEAM_PROSE_FIELDS = new Set(["headline", "detail", "predicted_spread_display"]);

const ALIAS_PATTERNS = Object.entries(ALIASES).map(
  ([from, to]) => [new RegExp(`\\b${from}\\b`, "g"), to] as const,
);

function canonProse(text: string): string {
  return ALIAS_PATTERNS.reduce((acc, [re, to]) => acc.replace(re, to), text);
}

/**
 * A copied payload's team codes, rewritten into the form `teams.json` keys on.
 *
 * Three payloads reach this site speaking nflverse's dialect, where the Rams
 * are `LA` and the Cardinals can be `AZ`. `getTeam` aliases them so chips
 * resolve, but plenty of places print the raw string — a page title, a spread
 * line, a season header — and those read "LA". Normalising once at each
 * payload's boundary fixes all of them together, and it has to happen here
 * rather than in the source files because two of the three payloads are copies
 * this repo does not own.
 */
export function canonTeams<T>(node: T): T {
  if (Array.isArray(node)) return node.map(canonTeams) as unknown as T;
  if (node !== null && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (typeof v === "string" && TEAM_FIELDS.has(k)) {
        out[k] = getTeam(v)?.abbr ?? v;
      } else if (typeof v === "string" && TEAM_PROSE_FIELDS.has(k)) {
        out[k] = canonProse(v);
      } else {
        out[k] = canonTeams(v);
      }
    }
    return out as T;
  }
  return node;
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
