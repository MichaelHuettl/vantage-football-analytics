/**
 * The live injury wire.
 *
 * Two sources, chosen for what they are allowed to be as much as for what they
 * carry:
 *
 *  - **Sleeper's player endpoint** for structured status. Public, unauthenticated,
 *    already the source `scripts/audit-teams.mjs` audits teams against, and its
 *    robots.txt has every rule commented out. It carries `injury_status`,
 *    `injury_body_part` and `injury_notes` for every player in the league.
 *  - **Draft Sharks' news sitemap** for headlines. A Google News sitemap the
 *    publisher advertises in its own robots.txt, which allows all agents. Title,
 *    link and date only — no body text (§2).
 *
 * **ESPN and Yahoo are deliberately absent.** Both were requested, and both
 * name `anthropic-ai` in robots.txt with `Disallow: /` (Yahoo also names
 * `Claude-Web`). Fetching them from code written here would mean sending a
 * user-agent chosen to get around a rule aimed at the agent writing it. That is
 * the operator's call to make with his own site, not a default to take
 * silently — see docs/STATE.md.
 *
 * Nothing here overwrites a hand-authored record. `camp-injuries.json` is
 * reporting, written with an attributed timeline or none at all (§5.3); a wire
 * status is a different kind of claim and is shown beside it, not merged into
 * it.
 */
import type { NewsEntry } from "./types";

export const INJURY_REVALIDATE_SECONDS = 300;

const SLEEPER = "https://api.sleeper.app/v1/players/nfl";
const DRAFTSHARKS_NEWS = "https://www.draftsharks.com/news.xml";
const UA = "VantageFootballAnalytics/1.0 (personal, non-commercial)";

/** Wire statuses as Sleeper publishes them. */
export type WireStatus =
  | "IR" | "PUP" | "Out" | "Doubtful" | "Questionable" | "Sus" | "DNR" | "NA";

export interface WireInjury {
  name: string;
  position: string;
  team: string | null;
  status: WireStatus;
  body_part: string | null;
  /** Sleeper's own note, when it has one. Attributed, never restated as ours. */
  notes: string | null;
  /**
   * When the wire last moved on this player, ISO, or null when it never has.
   *
   * Sleeper's own `news_updated`. Read it for exactly what it says: the last
   * time *any* news about the player was updated, not a timestamp on the
   * injury. In practice the two track closely for anyone this page shows — of
   * the injured players inside the relevance cutoff, all 67 carried the field
   * and the median was a day old — but a contract story would move it too, so
   * the column is labelled "last update" and never "injury reported".
   */
  updated: string | null;
  /** Sleeper's relevance rank, lower being more searched-for. Used only to keep
   *  a fantasy page from filling with third-string IR entries: 24 of the 35
   *  players carrying a serious status are deep roster, and listing them would
   *  bury the four that matter. */
  rank: number;
}

const SKILL = new Set(["QB", "RB", "WR", "TE", "K"]);

interface SleeperPlayer {
  search_rank?: number | null;
  full_name?: string;
  position?: string;
  team?: string | null;
  injury_status?: string | null;
  injury_body_part?: string | null;
  injury_notes?: string | null;
  /** Epoch milliseconds. */
  news_updated?: number | null;
}

/** `no-store` for the same reason as the news feeds — see src/lib/feed.ts.
 *  How often this runs is bounded by the TTL cache in injury-tracker.ts. */
export async function pullWire(): Promise<WireInjury[]> {
  const res = await fetch(SLEEPER, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sleeper: HTTP ${res.status}`);
  const all = (await res.json()) as Record<string, SleeperPlayer>;

  const out: WireInjury[] = [];
  for (const p of Object.values(all)) {
    if (!p.full_name || !p.position || !SKILL.has(p.position)) continue;
    if (!p.injury_status) continue;
    // A player with no team is a free agent; the site does not rank them and a
    // status without a club is not actionable on an injury page.
    if (!p.team) continue;
    out.push({
      name: p.full_name,
      position: p.position,
      team: p.team,
      status: p.injury_status as WireStatus,
      body_part: p.injury_body_part ?? null,
      notes: p.injury_notes ?? null,
      updated: epochToIso(p.news_updated),
      rank: p.search_rank ?? Number.MAX_SAFE_INTEGER,
    });
  }
  return out;
}

/** Sleeper sends epoch milliseconds. Guard the parse: a malformed stamp should
 *  leave the column blank rather than render "Invalid Date" or, worse, 1970. */
function epochToIso(ms: number | null | undefined): string | null {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Google News sitemap: <url><loc> plus <news:title> and <news:publication_date>. */
export async function pullDraftSharks(): Promise<NewsEntry[]> {
  const res = await fetch(DRAFTSHARKS_NEWS, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Draft Sharks: HTTP ${res.status}`);
  const xml = await res.text();

  const { createHash } = await import("node:crypto");
  const decode = (s: string) =>
    s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .replace(/\s+/g, " ").trim();
  const pick = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    return m ? decode(m[1]) : "";
  };

  return xml.split(/<url>/i).slice(1).flatMap((block) => {
    const url = pick(block, "loc");
    const headline = pick(block, "news:title");
    const date = pick(block, "news:publication_date");
    if (!url || !headline) return [];
    const ts = new Date(date);
    return [{
      id: createHash("sha1").update(url).digest("base64url").slice(0, 16),
      headline,
      source: "Draft Sharks",
      url,
      timestamp: Number.isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString(),
      category: "injury" as const,
    }];
  });
}

/** Headlines that are actually about an injury, rather than draft strategy. */
/** Statuses that assert a real absence, as against Sleeper's catch-all
 *  "Questionable" — which in August is applied to 93 of 129 injured skill
 *  players and therefore contradicts nothing. */
export const SERIOUS_WIRE: WireStatus[] = ["IR", "Out", "PUP", "Doubtful", "DNR", "Sus"];

/** Relevance cutoff for the league-wide list. Keeps Charbonnet and Aiyuk,
 *  drops the third-string tight ends. */
export const RELEVANCE_RANK = 400;

export const INJURY_WORDS =
  /\b(injur|hamstring|acl|mcl|lcl|pcl|achilles|concussion|strain|sprain|surgery|pup\b|ir\b|carted|tear|fracture|hurt|ankle|knee|groin|quad|calf|shoulder|ruled out|questionable|doubtful|activated|designated to return)/i;

/**
 * Two more injury boards, added 2026-08-27 to name what Sleeper will not.
 *
 * Sleeper writes "Undisclosed" for a fifth of the players this page shows, and
 * a column whose job is to say what the injury is cannot do it from that word.
 * Measured against a live pull before either was built: 61 of the 67 relevant
 * injured players appear on one of these boards, and **9 of the 19 undisclosed
 * rows get a real body part** — Nacua groin, Kirk calf, Downs calf, Egbuka toe.
 * That is the whole reason they are here.
 *
 * **ESPN was requested and is not used.** Its robots.txt names `anthropic-ai`
 * with `Disallow: /`. The `User-agent: *` rules would permit the injury page,
 * so this is available to the operator directly; it is specifically an agent
 * fetching it that ESPN has ruled out, and swapping the user-agent to get round
 * a rule aimed at the agent writing the code is not a thing this file will do.
 * CBS and Sharp name no Anthropic agent and disallow neither path, checked
 * rather than assumed.
 *
 * **These are HTML, so they are brittle in a way the JSON feeds are not.** A
 * markup change breaks a selector and yields nothing. Both callers therefore
 * treat an empty result as normal: the tracker falls back to Sleeper's own
 * field, which is what it used before these existed. Neither can take the page
 * down and neither is allowed to override a value Sleeper actually filled in.
 */
const CBS_INJURIES = "https://www.cbssports.com/nfl/injuries/";
const SHARP_INJURIES =
  "https://www.sharpfootballanalysis.com/analysis/nfl-injury-report-ir-tracker/";

export interface ExternalInjury {
  /** Anatomy as that board words it. */
  part: string | null;
  /** Its own status line, in its own words. */
  status: string | null;
  source: "CBS Sports" | "Sharp Football Analysis";
}

/** Letters and digits only — the same reduction `headline-match` uses, so
 *  "Ja'Marr Chase" and "JaMarr Chase" land on one key. */
const nameKey = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

const decode = (v: string) =>
  v.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&#8212;|&mdash;/g, "\u2014").replace(/&#8211;|&ndash;/g, "\u2013");

/** Tags out, entities decoded, whitespace collapsed. For a table cell. */
const stripTags = (v: string) =>
  decode(v.replace(/<[^>]+>/g, " ")).replace(/[^\S\n]+/g, " ").replace(/\s+/g, " ").trim();

/** Tags become line breaks and the breaks survive. For Sharp, whose rows are
 *  lines of prose rather than cells — collapsing whitespace here would join the
 *  whole page into one line and the row pattern would never match. */
const stripToLines = (v: string) =>
  decode(v.replace(/<[^>]+>/g, "\n")).replace(/[^\S\n]+/g, " ");

/** Values that name no anatomy. A board may fill one of these in. */
export const isVaguePart = (v: string | null | undefined) =>
  !v || /undisclosed|not disclosed|^general\b|^lower body$|^upper body$/i.test(v.trim());

const VAGUE = /undisclosed|not disclosed|^general\b|^lower body$|^upper body$/i;

/** CBS publishes a real table: player, position, updated, injury, status. */
export async function pullCbs(): Promise<Map<string, ExternalInjury>> {
  const out = new Map<string, ExternalInjury>();
  const res = await fetch(CBS_INJURIES, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`CBS: HTTP ${res.status}`);
  const html = await res.text();

  for (const row of html.split(/<tr[^>]*>/i).slice(1)) {
    const cells = (row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? [])
      .map(stripTags).filter(Boolean);
    if (cells.length < 5 || cells[0] === "Player") continue;
    // The name cell carries an abbreviated form and the full one: "T. Benson
    // Trey Benson". The full name is the trailing pair of words.
    const full = cells[0].replace(/^[A-Z]\.\s*\S+\s+/, "").trim();
    if (!full.includes(" ")) continue;
    out.set(nameKey(full), {
      part: cells[3] && !VAGUE.test(cells[3]) ? cells[3] : null,
      status: cells[4] || null,
      source: "CBS Sports",
    });
  }
  return out;
}

/** Sharp writes prose, not a table: "Trey Benson, RB — Knee — Out for Season",
 *  grouped under team headings. Parsed off that shape. */
export async function pullSharp(): Promise<Map<string, ExternalInjury>> {
  const out = new Map<string, ExternalInjury>();
  const res = await fetch(SHARP_INJURIES, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sharp: HTTP ${res.status}`);
  const html = (await res.text()).replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");

  for (const line of stripToLines(html).split("\n")) {
    const m = /^([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)+),\s*[A-Z]{1,4}\s*[—–-]\s*(.+)$/
      .exec(line.trim());
    if (!m) continue;
    const [, full, rest] = m;
    const bits = rest.split(/\s*[—–]\s*/).map((b) => b.trim());
    out.set(nameKey(full), {
      part: bits[0] && !VAGUE.test(bits[0]) ? bits[0] : null,
      status: bits[1] ?? null,
      source: "Sharp Football Analysis",
    });
  }
  return out;
}

/** Both boards, merged, CBS first because it names more. Never throws: a board
 *  that fails contributes nothing and the tracker keeps Sleeper's own field. */
export async function pullBoards(): Promise<Map<string, ExternalInjury>> {
  const [cbs, sharp] = await Promise.all([
    pullCbs().catch(() => new Map<string, ExternalInjury>()),
    pullSharp().catch(() => new Map<string, ExternalInjury>()),
  ]);
  const merged = new Map(sharp);
  for (const [k, v] of cbs) merged.set(k, v);
  return merged;
}
