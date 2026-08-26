import newsFile from "@/data/news.json";
import type { NewsEntry } from "./types";

interface NewsFile {
  updated: string;
  data: NewsEntry[];
}

const file = newsFile as unknown as NewsFile;

export const NEWS = file.data;
export const NEWS_UPDATED = file.updated;

/** True when the headline postdates the injury row, i.e. the row may be stale. */
export function isNewerThan(entry: NewsEntry | undefined, reported: string): boolean {
  if (!entry) return false;
  return entry.timestamp.slice(0, 10) > reported;
}
