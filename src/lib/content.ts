import playersFile from "@/data/players.json";
import byesFile from "@/data/byes.json";
import qb from "@/data/rankings/qb.json";
import rb from "@/data/rankings/rb.json";
import wr from "@/data/rankings/wr.json";
import te from "@/data/rankings/te.json";
import k from "@/data/rankings/k.json";
import dst from "@/data/rankings/dst.json";
// One file per published week, written by scripts/curated/weekly_rankings.py.
// Imported statically on purpose, like the draft lists: files under src/ are
// typechecked, so a bad week fails the build with a line number.
import week1 from "@/data/rankings/week-1.json";
import week2 from "@/data/rankings/week-2.json";
import week3 from "@/data/rankings/week-3.json";
import type { Envelope, Player, Position, RankingEntry, RankingList } from "./types";

/* ------------------------------------------------------------------
   Players
   ------------------------------------------------------------------ */

const playersEnvelope = playersFile as Envelope<Player[]>;

export const PLAYERS: Player[] = playersEnvelope.data;

const playerById = new Map(PLAYERS.map((p) => [p.id, p]));

export function getPlayer(id: string): Player | undefined {
  return playerById.get(id);
}

/* ------------------------------------------------------------------
   Bye weeks

   Season-scoped, so they live apart from teams.json — team identity never
   changes, byes change every year. Keeping them separate means the yearly
   edit is one small file rather than a pass over all 32 team records.
   ------------------------------------------------------------------ */

interface ByesFile {
  schema_version: number;
  season: number;
  data: Record<string, number>;
}

const byes = byesFile as ByesFile;

export const BYE_SEASON = byes.season;

export function getBye(teamAbbr: string | undefined): number | undefined {
  return teamAbbr ? byes.data[teamAbbr.toUpperCase()] : undefined;
}

/* ------------------------------------------------------------------
   Rankings
   ------------------------------------------------------------------ */

const RANKING_FILES = { QB: qb, RB: rb, WR: wr, TE: te, K: k, DST: dst } as const;

export function getRankingList(position: Position): RankingList {
  return RANKING_FILES[position] as unknown as RankingList;
}

export interface RankedRow {
  entry: RankingEntry;
  player: Player;
  bye?: number;
}

/**
 * Entries in rank order with their player and bye joined. A ranking whose
 * player_id no longer resolves is dropped rather than rendered as a blank row —
 * `validateContent` reports it separately so the gap is visible, not silent.
 *
 * Takes the list rather than a position so the draft board and every weekly
 * list render through the same join.
 */
export function rankedEntries(list: RankingList): RankedRow[] {
  return list
    .entries.slice()
    .sort((a, b) => a.rank - b.rank)
    .flatMap((entry) => {
      const player = getPlayer(entry.player_id);
      return player ? [{ entry, player, bye: getBye(player.team) }] : [];
    });
}

/* ------------------------------------------------------------------
   Weekly rankings

   One file per published week holding all six positions and a single date,
   because the operator dates a week's rankings as a whole: Week 1 was
   updated 2026-09-08 and Week 2 on 2026-09-16. A week with no file is an
   addressable empty scope, and the page says how to fill it.
   ------------------------------------------------------------------ */

interface WeeklyFile {
  schema_version: number;
  season: number;
  week: number;
  format: string;
  updated: string;
  source: string;
  note: string;
  lists: Record<Position, RankingEntry[]>;
}

const WEEKLY_FILES = [week1, week2, week3] as unknown as WeeklyFile[];
const weeklyByWeek = new Map(WEEKLY_FILES.map((f) => [f.week, f]));

/** Weeks that have a published list, ascending. */
export const PUBLISHED_WEEKS: number[] = WEEKLY_FILES.map((f) => f.week).sort(
  (a, b) => a - b,
);

/** The most recent published week, which is the one a reader most likely wants. */
export const LATEST_WEEK: number | undefined = PUBLISHED_WEEKS.at(-1);

/**
 * One position's list for one week, in the draft list's shape so the page
 * renders both the same way. `undefined` when the week is not published.
 */
export function getWeeklyList(week: number, position: Position): RankingList | undefined {
  const f = weeklyByWeek.get(week);
  if (!f) return undefined;
  return {
    schema_version: f.schema_version,
    position,
    format: f.format,
    scope: `Week ${week}`,
    updated: f.updated,
    source: f.source,
    note: f.note,
    entries: f.lists[position] ?? [],
  };
}

/* ------------------------------------------------------------------
   Validation

   These files are edited by hand, so the failure worth designing for is a
   typo — a duplicated rank, a player_id that no longer exists. JSON syntax
   errors are already caught by the bundler with a line number; these are the
   errors it cannot see.
   ------------------------------------------------------------------ */

export interface ContentProblem {
  file: string;
  message: string;
}

export function validateContent(): ContentProblem[] {
  const problems: ContentProblem[] = [];

  const ids = new Set<string>();
  for (const p of PLAYERS) {
    if (ids.has(p.id)) {
      problems.push({ file: "players.json", message: `Duplicate id "${p.id}"` });
    }
    ids.add(p.id);
    if (p.team && !byes.data[p.team]) {
      problems.push({
        file: "players.json",
        message: `${p.name} has team "${p.team}", which has no bye week on record`,
      });
    }
  }

  const lists: { file: string; entries: RankingEntry[] }[] = [
    ...Object.entries(RANKING_FILES).map(([position, raw]) => ({
      file: `rankings/${position.toLowerCase()}.json`,
      entries: (raw as unknown as RankingList).entries,
    })),
    ...WEEKLY_FILES.flatMap((f) =>
      Object.entries(f.lists).map(([position, entries]) => ({
        file: `rankings/week-${f.week}.json (${position})`,
        entries,
      })),
    ),
  ];

  for (const { file, entries } of lists) {
    const seenRanks = new Set<number>();
    const seenIds = new Set<string>();

    for (const entry of entries) {
      if (!playerById.has(entry.player_id)) {
        problems.push({
          file,
          message: `player_id "${entry.player_id}" is not in players.json`,
        });
      }
      if (seenRanks.has(entry.rank)) {
        problems.push({ file, message: `Duplicate rank ${entry.rank}` });
      }
      // Added 2026-09-19. The Week 1 sheet had the Bears at 8 and 17 and Will
      // Reichard at 12 and 16 — distinct ranks, so the rank check above passed
      // both, and only a player-level check sees a player listed twice.
      if (seenIds.has(entry.player_id)) {
        problems.push({ file, message: `"${entry.player_id}" is ranked twice` });
      }
      seenRanks.add(entry.rank);
      seenIds.add(entry.player_id);
    }
  }

  return problems;
}
