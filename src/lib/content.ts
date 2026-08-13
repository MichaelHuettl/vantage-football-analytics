import playersFile from "@/data/players.json";
import byesFile from "@/data/byes.json";
import qb from "@/data/rankings/qb.json";
import rb from "@/data/rankings/rb.json";
import wr from "@/data/rankings/wr.json";
import te from "@/data/rankings/te.json";
import k from "@/data/rankings/k.json";
import dst from "@/data/rankings/dst.json";
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
 */
export function rankedEntries(position: Position): RankedRow[] {
  return getRankingList(position)
    .entries.slice()
    .sort((a, b) => a.rank - b.rank)
    .flatMap((entry) => {
      const player = getPlayer(entry.player_id);
      return player ? [{ entry, player, bye: getBye(player.team) }] : [];
    });
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

  for (const [position, raw] of Object.entries(RANKING_FILES)) {
    const list = raw as unknown as RankingList;
    const file = `rankings/${position.toLowerCase()}.json`;
    const seen = new Set<number>();

    for (const entry of list.entries) {
      if (!playerById.has(entry.player_id)) {
        problems.push({
          file,
          message: `player_id "${entry.player_id}" is not in players.json`,
        });
      }
      if (seen.has(entry.rank)) {
        problems.push({ file, message: `Duplicate rank ${entry.rank}` });
      }
      seen.add(entry.rank);
    }
  }

  return problems;
}
