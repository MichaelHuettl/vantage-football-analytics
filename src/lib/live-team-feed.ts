/**
 * Club news for all 32 teams, pulled at request time.
 *
 * This replaced the beat feed's source on 2026-08-29. The old one went through
 * Nitter to reach beat writers on X, and that route is gone: ten public
 * instances were tested and not one returned a single item — nitter.net answers
 * 410, xcancel demands whitelisting, three resolve to nothing, three return 403
 * and the rest 429 or 502. X has no free read API, which is why the project was
 * on a scraper to begin with.
 *
 * **What this is, and what it is not.** These are the clubs' own newsrooms. They
 * are official primary sources, which §2 says to prefer, and they are current
 * to the hour. They are not independent beat reporting: a club will tell you a
 * player was activated, not that he looked a step slow in practice. The section
 * says so rather than letting "beat reports" imply a byline it does not have.
 *
 * The independent tier was ruled out rather than missed. SB Nation's network
 * carries it for all 32 teams and every feed works, but their robots.txt names
 * `anthropic-ai` with `Disallow: /` — the same rule that keeps ESPN and Yahoo
 * off this site. That leaves it available to the operator directly and closed
 * to an agent fetching it, which is the line docs/STATE.md already draws twice.
 *
 * The architecture is the news page's, for the same reasons (see live-news.ts):
 * the committed archive stays the floor, `live` says which the reader is
 * looking at, publishers are polled at most once per window per process, and
 * the fetches are `cache: "no-store"` because Next serves a revalidated fetch
 * stale-while-revalidate and this page would always be one pull behind.
 */
import teamsFile from "@/data/teams.json";
import type { NewsEntry } from "./types";

export const TEAM_FEED_REVALIDATE_SECONDS = 300;

const UA = "VantageFootballAnalytics/1.0 (personal, non-commercial)";

/**
 * Club domains, checked one at a time rather than derived from a nickname.
 *
 * There is no pattern here: the Panthers are `panthers.com` but the Bears are
 * `chicagobears.com`, the Rams are `therams.com` and the Raiders dropped their
 * city entirely. All 32 were verified to return items on 2026-08-29, and every
 * robots.txt sampled carries no Anthropic rule and no wildcard block on the
 * feed path.
 */
const CLUBS: { abbr: string; domain: string }[] = [
  { abbr: "ARI", domain: "azcardinals" },
  { abbr: "ATL", domain: "atlantafalcons" },
  { abbr: "BAL", domain: "baltimoreravens" },
  { abbr: "BUF", domain: "buffalobills" },
  { abbr: "CAR", domain: "panthers" },
  { abbr: "CHI", domain: "chicagobears" },
  { abbr: "CIN", domain: "bengals" },
  { abbr: "CLE", domain: "clevelandbrowns" },
  { abbr: "DAL", domain: "dallascowboys" },
  { abbr: "DEN", domain: "denverbroncos" },
  { abbr: "DET", domain: "detroitlions" },
  { abbr: "GB", domain: "packers" },
  { abbr: "HOU", domain: "houstontexans" },
  { abbr: "IND", domain: "colts" },
  { abbr: "JAX", domain: "jaguars" },
  { abbr: "KC", domain: "chiefs" },
  { abbr: "LAC", domain: "chargers" },
  { abbr: "LAR", domain: "therams" },
  { abbr: "LV", domain: "raiders" },
  { abbr: "MIA", domain: "miamidolphins" },
  { abbr: "MIN", domain: "vikings" },
  { abbr: "NE", domain: "patriots" },
  { abbr: "NO", domain: "neworleanssaints" },
  { abbr: "NYG", domain: "giants" },
  { abbr: "NYJ", domain: "newyorkjets" },
  { abbr: "PHI", domain: "philadelphiaeagles" },
  { abbr: "PIT", domain: "steelers" },
  { abbr: "SEA", domain: "seahawks" },
  { abbr: "SF", domain: "49ers" },
  { abbr: "TB", domain: "buccaneers" },
  { abbr: "TEN", domain: "tennesseetitans" },
  { abbr: "WAS", domain: "commanders" },
];

const TEAM_NAME = new Map(
  (teamsFile as { data: { abbr: string; city: string; nickname: string }[] }).data.map(
    (t) => [t.abbr, `${t.city} ${t.nickname}`],
  ),
);

export interface TeamFeedItem extends NewsEntry {
  team_abbr: string;
}

export interface LiveTeamFeed {
  items: TeamFeedItem[];
  live: boolean;
  /** Clubs whose newsroom did not answer, reported rather than hidden (§8). */
  failures: string[];
  /** How many of the 32 answered. */
  answered: number;
  updated: string;
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const pick = (block: string, tag: string) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1]) : "";
};

/** Headline, source, timestamp and link only. Never body text (§2). */
async function pullClub(club: { abbr: string; domain: string }): Promise<TeamFeedItem[]> {
  const res = await fetch(`https://www.${club.domain}.com/rss/news`, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  const { createHash } = await import("node:crypto");
  return xml
    .split(/<item>/i)
    .slice(1)
    .flatMap((block) => {
      const headline = pick(block, "title");
      const url = pick(block, "link") || pick(block, "guid");
      const date = pick(block, "pubDate");
      if (!headline || !url) return [];
      const ts = new Date(date);
      return [
        {
          id: createHash("sha1").update(url).digest("base64url").slice(0, 16),
          headline,
          source: TEAM_NAME.get(club.abbr) ?? club.abbr,
          url,
          timestamp: Number.isNaN(ts.getTime())
            ? new Date().toISOString()
            : ts.toISOString(),
          category: "team" as NewsEntry["category"],
          team_abbr: club.abbr,
        },
      ];
    });
}

const easternDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

let cached: { at: number; value: LiveTeamFeed } | null = null;
let inFlight: Promise<LiveTeamFeed> | null = null;

export async function getLiveTeamFeed(): Promise<LiveTeamFeed> {
  if (cached && Date.now() - cached.at < TEAM_FEED_REVALIDATE_SECONDS * 1000) {
    return cached.value;
  }
  if (inFlight) return inFlight;
  inFlight = pullOnce().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Seconds since the current pull, for the freshness line. */
export function lastTeamFeedAgeSeconds(): number | null {
  return cached ? Math.round((Date.now() - cached.at) / 1000) : null;
}

async function pullOnce(): Promise<LiveTeamFeed> {
  const items: TeamFeedItem[] = [];
  const failures: string[] = [];

  // Eight at a time rather than all 32 at once. These are thirty-two separate
  // newsrooms being polled on one reader's behalf; a burst of 32 sockets is not
  // a neighbourly way to use feeds published for free, and the TTL cache means
  // this runs once per window however many readers arrive.
  const size = 8;
  for (let i = 0; i < CLUBS.length; i += size) {
    const batch = CLUBS.slice(i, i + size);
    const settled = await Promise.allSettled(batch.map(pullClub));
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") items.push(...r.value);
      else failures.push(batch[j].abbr);
    });
  }

  const answered = CLUBS.length - failures.length;
  const value: LiveTeamFeed = {
    // Newest first, de-duplicated by URL: a club occasionally republishes the
    // same story under two items.
    items: [...new Map(items.map((i) => [i.url, i])).values()].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    ),
    live: answered > 0,
    failures,
    answered,
    updated: easternDate(),
  };
  // A pull where every club failed is not cached, so the next request retries
  // rather than holding the outage for the whole window.
  if (answered > 0) cached = { at: Date.now(), value };
  return value;
}
