/**
 * The live wire, reconciled against the hand-authored camp report.
 *
 * STATE.md open item 6: nothing linked fresh reporting to `camp-injuries.json`,
 * so a record could sit at last week's wording while the wire said something
 * else, and the two would disagree on screen with no one told. This closes that
 * by doing the comparison out loud.
 *
 * It does **not** rewrite the records. `camp-injuries.json` is written as
 * reporting — a timeline only ever appears with an attribution (§5.3) — and a
 * wire status is a coarser, different claim. Overwriting careful prose with
 * "Questionable" would lose the argument the page exists to publish. So the
 * wire is shown beside the record, and where they disagree the page says so:
 * publishing the disagreement is the honest version of this feature and the
 * one the site's whole pitch asks for.
 *
 * Matching is on name **and** position, and anything still ambiguous is
 * reported rather than resolved — the league has two Kenneth Walkers and two
 * Josh Allens, and a plausible wrong match is worse than a gap.
 */
import campFile from "@/data/camp-injuries.json";
import playersFile from "@/data/players.json";
import {
  INJURY_WORDS, RELEVANCE_RANK, SERIOUS_WIRE,
  pullDraftSharks, pullWire, INJURY_REVALIDATE_SECONDS,
} from "./injury-feed";
import type { WireInjury } from "./injury-feed";
import type { NewsEntry } from "./types";

interface CampRecord {
  name: string;
  team: string;
  position: string;
  status: string;
  diagnosis: string;
  timeline?: string;
  attribution?: string;
  latest?: string;
  reported: string;
}

const camp = (campFile as unknown as { data: CampRecord[] }).data;
const ranked = (playersFile as { data: { id: string; name: string; position: string }[] }).data;

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);
const norm = (n: string) =>
  n.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "")
    .split(" ").filter((p) => p && !SUFFIXES.has(p)).join("");

/**
 * What counts as the page and the wire actually disagreeing.
 *
 * The first attempt compared coarse bands and produced thirteen "conflicts",
 * every one of them a page status against Sleeper's "Questionable". In August
 * that word is applied to 93 of 129 injured skill players — it is a catch-all,
 * not a game-day designation, and it contradicts nothing. Shipping those would
 * have been noise that taught the reader to ignore the section.
 *
 * So a disagreement is only reported when the two make claims that cannot both
 * be true: the wire asserts an absence while the page has the player
 * practising, or the page calls a season over while the wire has him merely
 * questionable.
 */
const PAGE_ACTIVE = ["Practicing", "Cleared"];

function disagrees(campStatus: string, wireStatus: string): boolean {
  if (SERIOUS_WIRE.includes(wireStatus as never) && PAGE_ACTIVE.includes(campStatus)) return true;
  if (campStatus === "Out for season" && wireStatus === "Questionable") return true;
  return false;
}

export interface Reconciled {
  record: CampRecord;
  wire: WireInjury;
}

export interface LiveInjuries {
  /** Records the wire flatly contradicts. Usually empty, and that is a result:
   *  it means the hand-authored page is current. */
  conflicts: Reconciled[];
  /** Records the wire independently corroborates, with its own body part. */
  corroborated: Reconciled[];
  /** Fantasy-relevant players carrying a real absence with no camp record —
   *  the "someone got hurt and this page does not know yet" list. */
  unlisted: WireInjury[];
  /** Injury headlines from Draft Sharks' news sitemap. */
  headlines: NewsEntry[];
  /** Names that matched more than one wire entry — reported, not guessed. */
  ambiguous: string[];
  live: boolean;
  failures: { name: string; reason: string }[];
  wireCount: number;
}

const EMPTY: LiveInjuries = {
  conflicts: [], corroborated: [], unlisted: [], headlines: [], ambiguous: [],
  live: false, failures: [], wireCount: 0,
};

let cached: { at: number; value: LiveInjuries } | null = null;
let inFlight: Promise<LiveInjuries> | null = null;

export async function getLiveInjuries(): Promise<LiveInjuries> {
  if (cached && Date.now() - cached.at < INJURY_REVALIDATE_SECONDS * 1000) return cached.value;
  if (inFlight) return inFlight;
  inFlight = pullOnce().finally(() => { inFlight = null; });
  return inFlight;
}

async function pullOnce(): Promise<LiveInjuries> {
  const failures: LiveInjuries["failures"] = [];

  const [wireRes, newsRes] = await Promise.allSettled([
    pullWire(),
    pullDraftSharks(),
  ]);

  if (wireRes.status === "rejected") {
    failures.push({ name: "Sleeper", reason: String(wireRes.reason?.message ?? wireRes.reason) });
  }
  if (newsRes.status === "rejected") {
    failures.push({ name: "Draft Sharks", reason: String(newsRes.reason?.message ?? newsRes.reason) });
  }

  const wire = wireRes.status === "fulfilled" ? wireRes.value : [];
  const headlines = (newsRes.status === "fulfilled" ? newsRes.value : [])
    .filter((h) => INJURY_WORDS.test(h.headline))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Nothing answered: say so rather than showing an empty page as if it were news.
  if (!wire.length && !headlines.length) {
    return { ...EMPTY, failures };
  }

  const byKey = new Map<string, WireInjury[]>();
  for (const w of wire) {
    const k = `${norm(w.name)}|${w.position}`;
    byKey.set(k, [...(byKey.get(k) ?? []), w]);
  }

  const conflicts: Reconciled[] = [];
  const corroborated: Reconciled[] = [];
  const ambiguous: string[] = [];

  for (const rec of camp) {
    const hits = byKey.get(`${norm(rec.name)}|${rec.position}`);
    if (!hits?.length) continue;
    if (hits.length > 1) { ambiguous.push(rec.name); continue; }
    const w = hits[0];
    if (disagrees(rec.status, w.status)) conflicts.push({ record: rec, wire: w });
    else corroborated.push({ record: rec, wire: w });
  }

  // Someone fantasy-relevant carrying a real absence that the camp report has
  // never covered. Ranked players are always kept; beyond them the relevance
  // rank decides, so the section stays readable.
  const campKeys = new Set(camp.map((c) => `${norm(c.name)}|${c.position}`));
  const rankedKeys = new Set(ranked.map((p) => `${norm(p.name)}|${p.position}`));
  const unlisted = wire
    .filter((w) => {
      const k = `${norm(w.name)}|${w.position}`;
      if (campKeys.has(k)) return false;
      if (!SERIOUS_WIRE.includes(w.status as never)) return false;
      return rankedKeys.has(k) || w.rank <= RELEVANCE_RANK;
    })
    .sort((a, b) => a.rank - b.rank);

  const value: LiveInjuries = {
    conflicts,
    corroborated,
    unlisted,
    headlines: headlines.slice(0, 12),
    ambiguous,
    live: true,
    failures,
    wireCount: wire.length,
  };
  cached = { at: Date.now(), value };
  return value;
}
