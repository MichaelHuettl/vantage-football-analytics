/**
 * The news feed pipeline, in one place.
 *
 * This logic used to live inside `scripts/fetch-news.mjs`. It moved here when
 * the news page began pulling feeds at request time, because two copies of the
 * tagging rules would drift and the site would disagree with its own archive
 * about which player a headline is about. The script imports this module too
 * (Node runs TypeScript directly), so there is exactly one implementation.
 *
 * Callers pass players and teams rather than this module reading them, so it
 * stays a pure transform: the route handler hands it bundled JSON, the script
 * hands it what it read off disk, and neither path needs the other's module
 * resolution to work.
 *
 * Headline, source, timestamp and link only — never article body text (§2).
 * RSS is the route publishers offer for exactly this.
 */
import type { NewsEntry } from "./types";

export interface FeedSource {
  name: string;
  url: string;
}

export const FEEDS: FeedSource[] = [
  { name: "CBS Sports", url: "https://www.cbssports.com/rss/headlines/nfl/" },
  { name: "Yahoo Sports", url: "https://sports.yahoo.com/nfl/rss.xml" },
  { name: "Pro Football Rumors", url: "https://www.profootballrumors.com/feed" },
  { name: "RotoWire", url: "https://www.rotowire.com/rss/news.php?sport=NFL" },
];

/** Only football-relevant headlines are kept; these feeds carry all sports. */
const NFL_HINT =
  /\b(nfl|quarterback|running back|wide receiver|tight end|preseason|training camp|week \d|snap|touchdown|depth chart)\b/i;

const CATEGORY: [RegExp, NewsEntry["category"]][] = [
  [/\b(injur|hamstring|acl|mcl|lcl|pcl|achilles|concussion|strain|sprain|surgery|pup|ir\b|carted|tear|fracture)/i, "injury"],
  [/\b(sign|trade|waive|release|claim|extension|restructure|cut)\b/i, "transaction"],
  [/\b(practice|dnp|limited participant|full participant|walkthrough)\b/i, "practice"],
  [/\b(camp|otas?|minicamp|preseason)\b/i, "camp"],
];

/** Minimal shapes: this module needs a name and an id, not a whole Player. */
export interface TaggablePlayer {
  id: string;
  name: string;
  position: string;
}
export interface TaggableTeam {
  abbr: string;
  city: string;
  nickname: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")
    // Numeric entities in any form: feeds mix &#39; and &#039; and &#x27;.
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlTag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

export function categorise(text: string): NewsEntry["category"] {
  for (const [re, cat] of CATEGORY) if (re.test(text)) return cat;
  return "breaking";
}

/**
 * Surname match, then confirm the first initial or full first name is nearby,
 * so "Smith" alone does not tag every Smith on the roster. The league has two
 * Kenneth Walkers and two Josh Allens; a plausible wrong tag is worse than none.
 */
export function tagPlayers(headline: string, players: TaggablePlayer[]): string[] {
  const hits: string[] = [];
  for (const p of players) {
    if (p.position === "DST") continue;
    const parts = p.name.split(" ");
    const last = parts[parts.length - 1];
    if (last.length < 4) continue;
    if (!new RegExp(`\\b${escapeRe(last)}\\b`, "i").test(headline)) continue;
    const first = escapeRe(parts[0]);
    if (new RegExp(`\\b(${first}|${first[0]}\\.?)\\s`, "i").test(headline)) hits.push(p.id);
  }
  return hits;
}

export function tagTeams(headline: string, teams: TaggableTeam[]): string[] {
  return teams
    .filter((t) =>
      new RegExp(`\\b(${escapeRe(t.nickname)}|${escapeRe(t.city)} ${escapeRe(t.nickname)})\\b`, "i")
        .test(headline),
    )
    .map((t) => t.abbr);
}

/** SHA1 of the link, base64url, truncated. Not a prefix of the URL itself:
 *  every CBS link starts with the same characters, so a truncated encoding
 *  collided across the whole feed and 99 items once stored as 12. */
async function idFor(link: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha1").update(link).digest("base64url").slice(0, 16);
}

export interface PullOptions {
  timeoutMs?: number;
}

export async function pullFeed(
  feed: FeedSource,
  players: TaggablePlayer[],
  teams: TaggableTeam[],
  opts: PullOptions = {},
): Promise<NewsEntry[]> {
  // `no-store`, deliberately.
  //
  // This used to pass `next: { revalidate: 300 }`, which reads like the polite
  // choice and is the wrong one here. Next serves a revalidated fetch
  // stale-while-revalidate: the render gets the *previous* response and the
  // refresh happens behind it. On a page nobody loads for a few hours that
  // means it is always one pull behind, and after a quiet night the news page
  // showed yesterday's headlines under today's date.
  //
  // Politeness is handled a level up instead, by the TTL cache in
  // live-news.ts, which holds one pull for everyone for five minutes. That
  // bounds how often publishers are hit *and* guarantees that when a pull does
  // happen it is genuinely live.
  const res = await fetch(feed.url, {
    headers: { "user-agent": "VantageFootballAnalytics/1.0 (personal, non-commercial)" },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${feed.name}: HTTP ${res.status}`);
  const xml = await res.text();
  const items = xml.split(/<item[\s>]/i).slice(1);

  const out: NewsEntry[] = [];
  for (const raw of items) {
    const headline = xmlTag(raw, "title");
    const link = xmlTag(raw, "link");
    const date = xmlTag(raw, "pubDate") || xmlTag(raw, "published");
    if (!headline || !link) continue;

    const teamsHit = tagTeams(headline, teams);
    const playersHit = tagPlayers(headline, players);
    // Keep it only if it is recognisably football.
    if (!teamsHit.length && !playersHit.length && !NFL_HINT.test(headline)) continue;

    const ts = new Date(date);
    out.push({
      id: await idFor(link),
      headline,
      source: feed.name,
      url: link,
      timestamp: Number.isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString(),
      category: categorise(headline),
      ...(playersHit.length ? { player_ids: playersHit } : {}),
      ...(teamsHit.length ? { team_abbrs: teamsHit } : {}),
    });
  }
  return out;
}

export interface PullResult {
  items: NewsEntry[];
  counts: { name: string; count: number }[];
  failures: { name: string; reason: string }[];
}

export async function pullAll(
  players: TaggablePlayer[],
  teams: TaggableTeam[],
  opts: PullOptions = {},
): Promise<PullResult> {
  const settled = await Promise.allSettled(
    FEEDS.map((f) => pullFeed(f, players, teams, opts)),
  );
  const items: NewsEntry[] = [];
  const counts: PullResult["counts"] = [];
  const failures: PullResult["failures"] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      counts.push({ name: FEEDS[i].name, count: r.value.length });
      items.push(...r.value);
    } else {
      failures.push({ name: FEEDS[i].name, reason: String(r.reason?.message ?? r.reason) });
    }
  });
  return { items, counts, failures };
}

/** Newest first, de-duplicated by id, capped. Existing entries are kept so the
 *  archive outlives what any single pull happens to return. */
export function mergeNews(
  existing: NewsEntry[],
  fresh: NewsEntry[],
  limit = 150,
): NewsEntry[] {
  const byId = new Map(existing.map((n) => [n.id, n]));
  for (const item of fresh) byId.set(item.id, item);
  return [...byId.values()]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}
