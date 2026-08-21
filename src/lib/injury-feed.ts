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
}

/** `no-store` for the same reason as the news feeds — see src/lib/feed.ts.
 *  How often this runs is bounded by the TTL cache in live-injuries.ts. */
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
      rank: p.search_rank ?? Number.MAX_SAFE_INTEGER,
    });
  }
  return out;
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
