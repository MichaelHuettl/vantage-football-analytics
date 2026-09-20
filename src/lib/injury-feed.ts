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

// --------------------------------------------------- official injury report --

/**
 * The NFL's own weekly injury report, as nflverse republishes it.
 *
 * Added 2026-09-19, when the operator found the tracker's descriptions too
 * vague to tell what was going on. Sleeper carries a body part for most
 * players and a one-word note for a few, and nothing about how a player is
 * practising or whether the club has designated him. The league's report
 * carries all three, and it is the primary source for them (§2 prefers
 * official primary sources): the injury as the club filed it, a secondary
 * injury where there is one, the final practice participation of the week, and
 * the game designation.
 *
 * It does not say how a player was hurt. No source this page pulls does, and
 * that detail lives only in reporting the page may not copy (§2). The operator
 * chose automatic detail over written accounts on 2026-09-19.
 *
 * nflverse publishes it as a CSV release asset, openly licensed, refreshed
 * through the week. It is small, so it is pulled whole and cached for an hour:
 * the file changes a few times a day at most, and the tracker's own five-minute
 * window would otherwise re-download it twelve times an hour.
 */
export interface OfficialReport {
  week: number;
  /** Site abbreviation. nflverse writes the Rams as LA. */
  team: string;
  /** The injury as the club filed it: "Groin", "Knee", "Illness". */
  primary: string | null;
  secondary: string | null;
  /** Final practice participation of the week. */
  practice: "DNP" | "Limited" | "Full" | null;
  /** Game designation. Null is a real value: listed, but not designated. */
  game: "Out" | "Doubtful" | "Questionable" | null;
  /**
   * Listed for something that is not an injury. The report files a veteran's
   * rest day as "Not injury related - resting player" (51 players in Week 2)
   * and an absence as "- personal matter" (7). Neither is an injury and the
   * page must not print either as one, so it is lifted out of `primary`.
   */
  notInjury: "rest" | "personal" | null;
}

export interface OfficialInjuries {
  /** The latest week in the file, or null when it is empty. */
  week: number | null;
  /** Each player on that week's report, keyed by `officialKey`. */
  byPlayer: Map<string, OfficialReport>;
  /**
   * Clubs that filed a report for `week`. A player's absence from the report
   * means something only when his club filed one: a club on its bye, or one
   * that has not filed yet this week, has no report to be absent from.
   */
  teamsReported: Set<string>;
}

const OFFICIAL_TEAM: Record<string, string> = { LA: "LAR" };

/**
 * One key for a player across the report and the wire: letters only, accents
 * and generational suffixes dropped, plus the club. "Michael Penix Jr." and
 * "Michael Penix" meet, "T.J. Sanders" and "TJ Sanders" meet, and the club
 * keeps the league's two Kenneth Walkers apart (docs/STATE.md, "Player names
 * collide").
 */
export function officialKey(name: string, team: string): string {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "")
    .replace(/[^a-z]/g, "");
  return `${n}|${OFFICIAL_TEAM[team] ?? team}`;
}

const PRACTICE: Record<string, OfficialReport["practice"]> = {
  "did not participate in practice": "DNP",
  "limited participation in practice": "Limited",
  "full participation in practice": "Full",
};
const GAME = new Set(["Out", "Doubtful", "Questionable"]);

/** A CSV row into fields, honouring quotes. The file has none today; a club
 *  filing "Knee, Ankle" in one cell would otherwise shift every column. */
function csvFields(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** The report for the latest week in the file. Pure, so it can be tested
 *  against a saved copy with plain `node`. */
export function parseOfficialInjuries(csv: string): OfficialInjuries {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const head = csvFields(lines[0] ?? "");
  const col = (name: string) => head.indexOf(name);
  const idx = {
    week: col("week"), team: col("team"), name: col("full_name"),
    type: col("season_type"),
    primary: col("report_primary_injury"), secondary: col("report_secondary_injury"),
    status: col("report_status"), practice: col("practice_status"),
    pPrimary: col("practice_primary_injury"), pSecondary: col("practice_secondary_injury"),
  };
  if (Object.values(idx).some((i) => i < 0)) {
    throw new Error(`official report: unexpected columns (${head.join(",")})`);
  }
  const rows = lines.slice(1).map(csvFields)
    .filter((f) => f[idx.type] === "REG" && Number(f[idx.week]) > 0);
  const week = rows.length ? Math.max(...rows.map((f) => Number(f[idx.week]))) : null;

  const byPlayer = new Map<string, OfficialReport>();
  const teamsReported = new Set<string>();
  for (const f of rows) {
    if (Number(f[idx.week]) !== week) continue;
    const team = OFFICIAL_TEAM[f[idx.team]] ?? f[idx.team];
    teamsReported.add(team);
    const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
    const status = clean(f[idx.status]);
    // The game report's injury leads; the practice report's fills a gap.
    const injuries = [
      clean(f[idx.primary]) ?? clean(f[idx.pPrimary]),
      clean(f[idx.secondary]) ?? clean(f[idx.pSecondary]),
    ];
    const notInjury = injuries.some((v) => v && /^not injury related.*rest/i.test(v))
      ? "rest"
      : injuries.some((v) => v && /^not injury related/i.test(v))
        ? "personal"
        : null;
    const [primary, secondary] = injuries.filter((v) => v && !/^not injury related/i.test(v));
    byPlayer.set(officialKey(f[idx.name], team), {
      week: week!,
      team,
      primary: primary ?? null,
      secondary: secondary ?? null,
      practice: PRACTICE[(f[idx.practice] ?? "").trim().toLowerCase()] ?? null,
      game: status && GAME.has(status) ? (status as OfficialReport["game"]) : null,
      notInjury,
    });
  }
  return { week, byPlayer, teamsReported };
}

const OFFICIAL_TTL_MS = 60 * 60_000;
let officialCache: { at: number; value: OfficialInjuries } | null = null;
let officialInFlight: Promise<OfficialInjuries> | null = null;

/** This season's report, at most once an hour. Throws on failure so the caller
 *  can report it; a failure is not cached, so the next render retries. */
export async function pullOfficialInjuries(season: number): Promise<OfficialInjuries> {
  if (officialCache && Date.now() - officialCache.at < OFFICIAL_TTL_MS) {
    return officialCache.value;
  }
  if (officialInFlight) return officialInFlight;
  officialInFlight = (async () => {
    const res = await fetch(
      `https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_${season}.csv`,
      {
        headers: { "user-agent": UA },
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`NFL injury report: HTTP ${res.status}`);
    const value = parseOfficialInjuries(await res.text());
    officialCache = { at: Date.now(), value };
    return value;
  })().finally(() => {
    officialInFlight = null;
  });
  return officialInFlight;
}
