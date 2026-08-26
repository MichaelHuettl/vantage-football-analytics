/**
 * The season-long injury tracker, pulled at request time.
 *
 * This is the news page's architecture applied to injuries, and deliberately so
 * — that pattern is the one thing on this site that keeps itself current
 * without anyone typing a command, and the injury table is the page where a
 * stale number costs a reader the most.
 *
 * The same three rules hold here as there:
 *
 *  - **The committed records are the floor.** `camp-injuries.json` is
 *    hand-authored reporting and merges *under* the wire, so a Sleeper outage
 *    makes the table stale rather than empty (§8), and a written record never
 *    disappears because the wire stopped carrying that player.
 *  - **`live` says which happened**, so `DataFreshness` can tell the reader
 *    whether they are looking at a live pull or the last good archive (§6).
 *  - **Publishers are polled at most once per window per process**, by the same
 *    TTL cache and shared in-flight promise, so a page left open on
 *    `AutoRefresh` does not hit Sleeper once a minute all day.
 *
 * **What it does not do is rewrite a record.** A written record carries a
 * diagnosis, a `latest` paragraph and — only ever with an attribution — a
 * timeline (§5.3). A wire status is a coarser, different claim, and replacing
 * careful prose with "Questionable" would throw away the argument this page
 * exists to publish. So both are carried, and where they cannot both be true
 * the row says so.
 */
import campFile from "@/data/camp-injuries.json";
import {
  INJURY_REVALIDATE_SECONDS, RELEVANCE_RANK, SERIOUS_WIRE, pullDraftSharks,
  pullWire,
} from "./injury-feed";
import type { WireInjury, WireStatus } from "./injury-feed";
import { headlinesFor } from "./headline-match";
import { summarise } from "./injury-summary";
import type { AutoSummary } from "./injury-summary";
import type { NewsEntry } from "./types";
import type { CampInjury } from "@/components/CampInjury";

const camp = (campFile as unknown as { updated: string; data: CampInjury[] });

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);
const norm = (n: string) =>
  n.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "")
    .split(" ").filter((p) => p && !SUFFIXES.has(p)).join("");
/** Name *and* position: the league has two Kenneth Walkers and two Josh Allens. */
const key = (name: string, position: string) => `${norm(name)}|${position}`;

/**
 * Worst first. A tracker is read to find who is in trouble, so severity is the
 * useful sort; alphabetical would bury the season-enders.
 *
 * `Questionable` sits low on purpose. In camp it is a catch-all — Sleeper
 * applied it to 108 of 156 injured skill players on the day this was written —
 * so ranking it near `Out` would push genuine absences down the page behind
 * players who are fine.
 */
export const WIRE_SEVERITY: Record<string, number> = {
  IR: 6, PUP: 5, DNR: 5, Sus: 4, Out: 4, Doubtful: 3, Questionable: 1, NA: 0,
};

export interface TrackerRow {
  name: string;
  team: string;
  position: CampInjury["position"];
  /** The wire's designation, when it carries one. */
  wire: WireStatus | null;
  body_part: string | null;
  notes: string | null;
  /** The hand-authored record, when one exists. Never overwritten. */
  record: CampInjury | null;
  /**
   * Headlines naming this player, newest first, as their publishers wrote
   * them. Attached by `attachHeadlines` rather than by the pull, because the
   * headline feed is on its own cache and its own timer.
   */
  headlines: NewsEntry[];
  /**
   * A composed one-line description, for rows nobody has written up. Null
   * whenever a record exists (the record is the authority) and whenever there
   * is nothing worth saying. Always labelled where it renders: see
   * `injury-summary.ts` for why this exists at all.
   */
  summary: AutoSummary | null;
  /** The wire and the record making claims that cannot both be true. */
  conflict: boolean;
  /** When this row last moved, and which source moved it. Null when neither
   *  side carries a date. */
  lastUpdate: LastUpdate | null;
  severity: number;
}

export interface LastUpdate {
  /** ISO. A datetime from the wire, a date from a written record. */
  at: string;
  /** Which side is the more recent, so the reader can weigh it. */
  source: "wire" | "record";
}

/**
 * The more recent of the two dates a row carries.
 *
 * The wire's stamp is Sleeper's `news_updated` — the last time anything about
 * the player moved, which for an injured player is usually the designation but
 * is not promised to be. The record's is the day the write-up was reported.
 * Taking the later of the two answers the question a reader actually has, which
 * is "how old is the newest thing on this row", and naming the source keeps it
 * auditable rather than asking them to trust a bare date.
 *
 * The headline feed is deliberately not folded in, even though `headlines` now
 * sits on the same row. Those are other publishers' reporting and each one
 * prints its own date beside it; this column is about the row's own status
 * facts, so that "12 days ago" reads as "the designation has not moved in 12
 * days" rather than as a claim that nothing has been said.
 */
function lastUpdateOf(
  wireAt: string | null | undefined,
  record: CampInjury | null,
): LastUpdate | null {
  const recordAt = record?.reported ?? null;
  if (wireAt && recordAt) {
    // Compare on the calendar day: the wire carries a time and a record does
    // not, so a same-day pair would otherwise always resolve to the wire.
    return wireAt.slice(0, 10) >= recordAt
      ? { at: wireAt, source: "wire" }
      : { at: recordAt, source: "record" };
  }
  if (wireAt) return { at: wireAt, source: "wire" };
  if (recordAt) return { at: recordAt, source: "record" };
  return null;
}

export interface InjuryTracker {
  rows: TrackerRow[];
  /** Date stamp for the page: today when live, the archive's own when not. */
  updated: string;
  live: boolean;
  failures: { name: string; reason: string }[];
  /** How many players the wire carried, before filtering. */
  pulled: number;
  /** Split of the table, for the page to describe itself honestly. */
  counts: { both: number; wireOnly: number; recordOnly: number; conflicts: number };
}

/** Eastern, not UTC — an evening render stamped in UTC reads as tomorrow (§6). */
const easternDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

/**
 * What counts as the wire and a record actually disagreeing.
 *
 * Comparing coarse bands produced thirteen false conflicts on the first
 * attempt, every one of them a written status against "Questionable". A
 * disagreement is only reported when both cannot be true: the wire asserts an
 * absence while the record has the player practising, or the record calls the
 * season over while the wire has him merely questionable.
 */
const RECORD_ACTIVE = ["Practicing", "Cleared"];

function disagrees(recordStatus: string, wire: WireStatus): boolean {
  if (SERIOUS_WIRE.includes(wire) && RECORD_ACTIVE.includes(recordStatus)) return true;
  if (recordStatus === "Out for season" && wire === "Questionable") return true;
  return false;
}

let cached: { at: number; value: InjuryTracker } | null = null;
let inFlight: Promise<InjuryTracker> | null = null;

export async function getInjuryTracker(): Promise<InjuryTracker> {
  if (cached && Date.now() - cached.at < INJURY_REVALIDATE_SECONDS * 1000) {
    return cached.value;
  }
  if (inFlight) return inFlight;
  inFlight = pullOnce().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Exposed for the freshness line: how old the current pull is, in seconds. */
export function lastTrackerPullAgeSeconds(): number | null {
  return cached ? Math.round((Date.now() - cached.at) / 1000) : null;
}

/** The archive alone, for when the wire has nothing to add. */
function archiveOnly(failures: { name: string; reason: string }[]): InjuryTracker {
  const rows = camp.data.map((record) => ({
    name: record.name, team: record.team, position: record.position,
    wire: null, body_part: record.body_part ?? null, notes: null,
    record, conflict: false, headlines: [], summary: null,
    lastUpdate: lastUpdateOf(null, record),
    severity: 10, // written records outrank a silent wire; see sort below
  }));
  return {
    rows: sortRows(rows),
    updated: camp.updated,
    live: false,
    failures,
    pulled: 0,
    counts: { both: 0, wireOnly: 0, recordOnly: rows.length, conflicts: 0 },
  };
}

function sortRows(rows: TrackerRow[]): TrackerRow[] {
  return [...rows].sort(
    (a, b) => b.severity - a.severity || a.name.localeCompare(b.name),
  );
}

async function pullOnce(): Promise<InjuryTracker> {
  let wire: WireInjury[];
  try {
    wire = await pullWire();
  } catch (err) {
    // A feed problem must never take the page down. Not cached, so the next
    // request retries rather than holding a failure for the whole window.
    return archiveOnly([{ name: "Sleeper", reason: String(err) }]);
  }
  if (!wire.length) return archiveOnly([{ name: "Sleeper", reason: "no rows" }]);

  const records = new Map(camp.data.map((r) => [key(r.name, r.position), r]));
  const seen = new Set<string>();
  const rows: TrackerRow[] = [];

  for (const w of wire) {
    const k = key(w.name, w.position);
    const record = records.get(k) ?? null;
    // Everyone the site would rank, plus anyone already written up however deep
    // on a roster — a hand-authored record is an editorial decision that this
    // player matters, and a rank cutoff should not overrule it.
    if (!record && w.rank >= RELEVANCE_RANK) continue;
    // `pullWire` already drops teamless players, but the type still allows it:
    // a designation with no club is not actionable on this page, and a written
    // record is the better source for the club if it has one.
    const team = w.team ?? record?.team;
    if (!team) continue;
    seen.add(k);
    rows.push({
      name: record?.name ?? w.name,
      team,
      position: w.position as CampInjury["position"],
      wire: w.status,
      body_part: w.body_part ?? record?.body_part ?? null,
      notes: w.notes ?? null,
      record,
      conflict: record ? disagrees(record.status, w.status) : false,
      headlines: [], summary: null,
      lastUpdate: lastUpdateOf(w.updated, record),
      severity: WIRE_SEVERITY[w.status] ?? 2,
    });
  }

  // Written records the wire is silent on. They stay: the archive is the floor,
  // and a player the wire has stopped carrying is usually one who has been
  // cleared or moved to a list Sleeper does not surface — either way the page
  // should not lose the reporting.
  let recordOnly = 0;
  for (const [k, record] of records) {
    if (seen.has(k)) continue;
    recordOnly += 1;
    rows.push({
      name: record.name, team: record.team, position: record.position,
      wire: null, body_part: record.body_part ?? null, notes: null,
      record, conflict: false, headlines: [], summary: null,
      lastUpdate: lastUpdateOf(null, record),
      // Below anything the wire flags, above a bare "Questionable": the record
      // is real reporting, but the wire is the fresher claim.
      severity: 2,
    });
  }

  const both = rows.filter((r) => r.record && r.wire).length;
  const value: InjuryTracker = {
    rows: sortRows(rows),
    updated: easternDate(),
    live: true,
    failures: [],
    pulled: wire.length,
    counts: {
      both,
      wireOnly: rows.length - both - recordOnly,
      recordOnly,
      conflicts: rows.filter((r) => r.conflict).length,
    },
  };
  cached = { at: Date.now(), value };
  return value;
}

/**
 * Attach each row's headlines.
 *
 * Separate from `pullOnce` because the two feeds are on independent caches and
 * timers: folding the join into the pull would freeze a five-minute-old
 * headline set into a tracker that outlives it, and force both to refresh
 * together. Returns new row objects rather than mutating, since the rows it is
 * given are the cached ones and are shared by every reader in the window.
 *
 * A player carrying a written record keeps his headlines too. The record is
 * still the authority on the row, but "something was said an hour ago" is a
 * fact the record cannot know about itself.
 */
export function attachHeadlines(
  rows: TrackerRow[],
  live: NewsEntry[],
): TrackerRow[] {
  return rows.map((r) => {
    const headlines = headlinesFor(r.name, live);
    return {
      ...r,
      headlines,
      // A hand-written record is the authority on its row and is never
      // supplemented by a composed sentence.
      summary: r.record ? null : summarise(r.body_part, r.notes, headlines),
    };
  });
}

/** Grouped for the page, worst team first. */
export function trackerByTeam(rows: TrackerRow[]): { abbr: string; rows: TrackerRow[] }[] {
  const byTeam = new Map<string, TrackerRow[]>();
  for (const r of rows) {
    const list = byTeam.get(r.team);
    if (list) list.push(r);
    else byTeam.set(r.team, [r]);
  }
  return [...byTeam.entries()]
    .map(([abbr, list]) => ({ abbr, rows: sortRows(list) }))
    .sort(
      (a, b) =>
        b.rows[0].severity - a.rows[0].severity ||
        b.rows.length - a.rows.length ||
        a.abbr.localeCompare(b.abbr),
    );
}


/**
 * Injury headlines, on their own timer.
 *
 * Kept separate from the tracker so the page makes **one** call to each source
 * per window rather than one per section. The first version of this page ran
 * the reconciliation and the tracker side by side and pulled Sleeper's
 * fourteen-megabyte player file twice for the same render, which is not a
 * neighbourly way to use a feed published for free.
 *
 * Headline, source and link only — never body text (§2).
 */
let headlineCache: { at: number; value: NewsEntry[] } | null = null;
let headlineInFlight: Promise<NewsEntry[]> | null = null;

export async function getInjuryHeadlines(): Promise<NewsEntry[]> {
  if (headlineCache && Date.now() - headlineCache.at < INJURY_REVALIDATE_SECONDS * 1000) {
    return headlineCache.value;
  }
  if (headlineInFlight) return headlineInFlight;
  headlineInFlight = pullDraftSharks()
    .then((items) => {
      headlineCache = { at: Date.now(), value: items };
      return items;
    })
    // A headline list is a supplement; if it fails the page loses a section
    // rather than the reader losing the table.
    .catch(() => [] as NewsEntry[])
    .finally(() => {
      headlineInFlight = null;
    });
  return headlineInFlight;
}
