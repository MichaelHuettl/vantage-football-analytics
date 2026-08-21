/**
 * The news page's data source, pulled at request time.
 *
 * §11 ruled out a third-party API "before the site is finished". The operator
 * lifted that restriction deliberately on 2026-08-17: having to ask for a
 * refresh by hand was the worse failure, and STATE.md open item 1 had no other
 * fix while the repo has no git remote. The trade is recorded rather than
 * silently taken — see docs/STATE.md.
 *
 * Two things keep that trade honest:
 *
 *  - The committed archive in src/data/news.json is still the floor. Live items
 *    merge *over* it, so a feed outage makes the page stale, never empty (§8),
 *    and the archive keeps history no single pull would return.
 *  - `live` says which happened, so DataFreshness can tell the reader whether
 *    it is looking at a live pull or the last good archive (§6). A freshness
 *    stamp that cannot fail is not a freshness stamp.
 */
import newsFile from "@/data/news.json";
import playersFile from "@/data/players.json";
import teamsFile from "@/data/teams.json";
import { mergeNews, pullAll } from "./feed";
import type { TaggablePlayer, TaggableTeam } from "./feed";
import type { NewsEntry } from "./types";

/** Publishers are polled at most this often, however many readers arrive. */
export const FEED_REVALIDATE_SECONDS = 300;

interface NewsFile {
  updated: string;
  data: NewsEntry[];
}

const archive = newsFile as unknown as NewsFile;
const players = (playersFile as { data: TaggablePlayer[] }).data;
const teams = (teamsFile as { data: TaggableTeam[] }).data;

/** Eastern, not UTC — an evening run stamped in UTC reads as tomorrow, which is
 *  the one thing DataFreshness exists to prevent (§6). Mirrors
 *  scripts/lib/today.mjs; en-CA formats as YYYY-MM-DD. */
const easternDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export interface LiveNews {
  items: NewsEntry[];
  /** Date stamp for the page: today when live, the archive's own when not. */
  updated: string;
  /** True when at least one publisher answered on this render. */
  live: boolean;
  /** Feeds that did not answer, for the page to report rather than hide. */
  failures: { name: string; reason: string }[];
  /** How many items the live pull contributed, before merging. */
  pulled: number;
}

/**
 * Publishers are polled at most once per window, in this process, whatever
 * Next's cache is doing.
 *
 * `next: { revalidate }` on the fetch is the right production answer, but in
 * development "Pages are always rendered on-demand and are never cached", so a
 * page left open with AutoRefresh would have hit four publishers a minute all
 * day. That is not a neighbourly way to use a feed someone publishes for free,
 * and §11 forbids scraping a site that offers one — the spirit of which is not
 * to hammer the feed either.
 *
 * The in-flight promise is shared as well as the result, so a burst of requests
 * on a cold cache makes one round of calls rather than one per request.
 */
let cached: { at: number; value: LiveNews } | null = null;
let inFlight: Promise<LiveNews> | null = null;

export async function getLiveNews(): Promise<LiveNews> {
  const fresh = cached && Date.now() - cached.at < FEED_REVALIDATE_SECONDS * 1000;
  if (cached && fresh) return cached.value;
  if (inFlight) return inFlight;

  inFlight = pullOnce().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Exposed for the freshness line: how old the current pull is, in seconds. */
export function lastPullAgeSeconds(): number | null {
  return cached ? Math.round((Date.now() - cached.at) / 1000) : null;
}

async function pullOnce(): Promise<LiveNews> {
  try {
    const { items, failures } = await pullAll(players, teams);

    // Every publisher down: serve the archive rather than an empty page.
    // Not cached — a failure should be retried on the next request, not held
    // for the full window.
    if (!items.length) {
      return {
        items: archive.data,
        updated: archive.updated,
        live: false,
        failures,
        pulled: 0,
      };
    }

    const value: LiveNews = {
      items: mergeNews(archive.data, items),
      updated: easternDate(),
      live: true,
      failures,
      pulled: items.length,
    };
    cached = { at: Date.now(), value };
    return value;
  } catch (err) {
    // Never let a feed problem take the page down.
    return {
      items: archive.data,
      updated: archive.updated,
      live: false,
      failures: [{ name: "feeds", reason: String(err) }],
      pulled: 0,
    };
  }
}
