import newsFile from "@/data/news.json";
import type { NewsEntry } from "./types";

interface NewsFile {
  updated: string;
  data: NewsEntry[];
}

const file = newsFile as unknown as NewsFile;

export const NEWS = file.data;
export const NEWS_UPDATED = file.updated;

/**
 * The most recent headline about a player, if there is one.
 *
 * This is the join between the automated feed and the hand-written injury
 * records. The feed cannot write a diagnosis — a headline is not a clinical
 * detail — but it can tell a reader that something has been said since the row
 * they are looking at was written, which is the part a static page gets wrong.
 *
 * Deliberately not filtered by category. The caller only ever asks about a
 * player who already has an injury record, so any newer item about him is
 * relevant, and the feed's keyword categoriser files real updates under
 * "breaking" often enough that filtering would drop them — "Trending toward
 * active status Week 1" carries no injury vocabulary at all.
 */
export function latestNewsFor(playerId: string | undefined): NewsEntry | undefined {
  if (!playerId) return undefined;
  return NEWS.filter((n) => (n.player_ids ?? []).includes(playerId)).sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  )[0];
}

/** True when the headline postdates the injury row, i.e. the row may be stale. */
export function isNewerThan(entry: NewsEntry | undefined, reported: string): boolean {
  if (!entry) return false;
  return entry.timestamp.slice(0, 10) > reported;
}
