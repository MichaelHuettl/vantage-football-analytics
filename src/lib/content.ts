import playersFile from "@/data/players.json";
import qb from "@/data/rankings/qb.json";
import rb from "@/data/rankings/rb.json";
import wr from "@/data/rankings/wr.json";
import te from "@/data/rankings/te.json";
import k from "@/data/rankings/k.json";
import dst from "@/data/rankings/dst.json";
import type {
  Envelope,
  Player,
  Position,
  RankingEntry,
  RankingList,
  ScoringFormat,
} from "./types";

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
   Rankings
   ------------------------------------------------------------------ */

const RANKING_FILES = { QB: qb, RB: rb, WR: wr, TE: te, K: k, DST: dst } as const;

export function getRankingList(position: Position): RankingList {
  return RANKING_FILES[position] as unknown as RankingList;
}

/** The rank actually used for a given format, falling back to the PPR rank. */
export function rankFor(entry: RankingEntry, format: ScoringFormat): number {
  return entry.format_ranks?.[format] ?? entry.rank;
}

/**
 * Entries ordered for a format, with their player joined and any orphaned
 * player_id dropped rather than rendered as a blank row.
 */
export function rankedEntries(position: Position, format: ScoringFormat) {
  const list = getRankingList(position);
  return list.entries
    .map((entry) => ({
      entry,
      player: getPlayer(entry.player_id),
      rank: rankFor(entry, format),
    }))
    .filter(
      (row): row is { entry: RankingEntry; player: Player; rank: number } =>
        row.player !== undefined,
    )
    .sort((a, b) => a.rank - b.rank);
}

/* ------------------------------------------------------------------
   Validation

   You edit these files by hand, so the failure mode worth designing for is a
   typo — a duplicated rank, a player_id that no longer exists, a tier with no
   label. JSON syntax errors are already caught by the bundler with a line
   number; these are the errors it cannot see.

   Called from the rankings page so a bad edit surfaces in `next build` and in
   dev, rather than silently rendering a wrong list.
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
  }

  for (const [position, raw] of Object.entries(RANKING_FILES)) {
    const list = raw as unknown as RankingList;
    const file = `rankings/${position.toLowerCase()}.json`;
    const tiers = new Set(list.tiers.map((t) => t.tier));
    const seenRanks = new Set<number>();

    for (const entry of list.entries) {
      if (!playerById.has(entry.player_id)) {
        problems.push({
          file,
          message: `player_id "${entry.player_id}" is not in players.json`,
        });
      }
      if (seenRanks.has(entry.rank)) {
        problems.push({ file, message: `Duplicate rank ${entry.rank}` });
      }
      seenRanks.add(entry.rank);

      if (!tiers.has(entry.tier)) {
        problems.push({
          file,
          message: `Rank ${entry.rank} is in tier ${entry.tier}, which has no label`,
        });
      }
      if (!entry.note?.trim()) {
        problems.push({
          file,
          message: `Rank ${entry.rank} has no note — §8 requires one sentence containing a fact`,
        });
      }
    }
  }

  return problems;
}
