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
  INJURY_REVALIDATE_SECONDS, SERIOUS_WIRE, isVaguePart, officialKey,
  pullBoards, pullDraftSharks, pullOfficialInjuries, pullWire,
} from "./injury-feed";
import type {
  ExternalInjury, OfficialInjuries, OfficialReport, WireInjury, WireStatus,
} from "./injury-feed";
import { SEASON, gamesForWeek } from "./games";
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

/** The club's own game designation, on the same scale and low for the same
 *  reason: `Questionable` is filed freely and means little by itself. */
const GAME_SEVERITY: Record<string, number> = { Out: 4, Doubtful: 3, Questionable: 1 };

/**
 * On this week's report with an injury, but practicing and undesignated. Under
 * a bare `Questionable` and over the players carrying nothing at all, so a team
 * block runs worst first and ends with the ones who are fine.
 */
const ON_REPORT = 0.5;

/**
 * One scale for both paths, so where a row lands does not depend on which
 * source found the player. Without it George Kittle, on the Week 2 report with
 * an Achilles, sorted level with Christian McCaffrey, who is on it for a rest
 * day, and the two read as equally worrying when only one is on it for an
 * injury at all.
 */
function severityOf(
  wire: WireStatus | null,
  game: OfficialReport["game"] | undefined,
  current: string | null,
  historical: boolean,
): number {
  // No wire designation: a record the report has moved past sinks to the floor,
  // while one it has not is real reporting and outranks a silent wire.
  const wireScore = wire ? (WIRE_SEVERITY[wire] ?? 2) : historical ? 0 : 2;
  return Math.max(
    wireScore,
    game ? (GAME_SEVERITY[game] ?? 2) : 0,
    current ? ON_REPORT : 0,
  );
}

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
  /** What CBS or Sharp says about him, when either does. Used to name an
   *  injury Sleeper left as "Undisclosed", and to give the Latest column a
   *  plain status line on a row carrying no record and no headline. */
  board: ExternalInjury | null;
  /**
   * His entry on this week's NFL injury report: the injury as the club filed
   * it, his practice participation and his game designation. Null when he is
   * not on it, or when the report did not load.
   */
  official: OfficialReport | null;
  /**
   * His club filed this week's report and he is not on it. Only ever true when
   * the club filed: a club on its bye has no report for him to be missing from.
   */
  offReport: boolean;
  /**
   * The written record is about a different injury from the one he carries
   * now: its body region and the current one's differ. De'Zhaun Stribling's
   * record, from 2026-08-17, is hamstring tightness; in Week 2 he is out with
   * an ankle injury on both the NFL report and the wire. The row then leads
   * with the current injury and keeps the record, dated, as the earlier one.
   */
  recordSuperseded: boolean;
  /**
   * The written record predates this week's official report, so it is history
   * rather than his status now.
   *
   * Every record in `camp-injuries.json` is camp reporting from July and
   * August, and by Week 2 the report contradicted 28 of them: Christian
   * McCaffrey's said "Out" while he practised fully, George Kittle's said
   * "PUP" while he did the same. The record still renders — the archive is the
   * floor and the reporting is not lost — but dated, quiet, and never as a
   * live designation.
   */
  recordHistorical: boolean;
  /**
   * What he is carrying now, from the report first and the wire second. Null
   * when neither names an injury, which is what "healthy" looks like here.
   */
  currentInjury: string | null;
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
  /** The week of the NFL injury report the rows carry, or null if it did not load. */
  officialWeek: number | null;
  /** Why the NFL injury report did not load, for the page to say (§10). */
  officialError: string | null;
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
    record, conflict: false, board: null, headlines: [], summary: null,
    official: null, offReport: false, recordSuperseded: false,
    recordHistorical: false, currentInjury: null,
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
    officialWeek: null,
    officialError: null,
  };
}

function sortRows(rows: TrackerRow[]): TrackerRow[] {
  return [...rows].sort(
    (a, b) => b.severity - a.severity || a.name.localeCompare(b.name),
  );
}

/**
 * Anatomy grouped into regions, so two sources describing one injury in
 * different words are read as one — "PCL" and "knee", "adductor" and "groin",
 * "psoas" and "hip", "herniated disc" and "back" — and two genuinely different
 * injuries are not. A word-level comparison flagged 21 rows on 2026-09-19 and
 * 17 of them were the same injury. Generic entries ("lower body", "leg",
 * "undisclosed") belong to no region and so can never count as a difference.
 */
const REGIONS: [RegExp, string][] = [
  [/\b(knee|acl|mcl|pcl|lcl|meniscus|patella)/, "knee"],
  [/\b(hamstring|quad|thigh)/, "thigh"],
  [/\b(hip|groin|adductor|abductor|psoas|pelvi)/, "hip"],
  [/\b(ankle|foot|toe|heel|achilles|lisfranc|plantar)/, "foot"],
  [/\b(calf|shin|tibia|fibula)/, "calf"],
  [/\b(shoulder|labrum|collarbone|clavicle|rotator)/, "shoulder"],
  [/\b(back|spine|disc|lumbar)/, "back"],
  [/\b(rib|chest|pectoral|sternum|oblique|abdom|hernia|core)/, "trunk"],
  [/\b(hand|thumb|finger|wrist)/, "hand"],
  [/\b(elbow|forearm|bicep|tricep)/, "arm"],
  [/\b(head|concussion|neck)/, "head"],
];
const anatomy = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const s = v.toLowerCase();
  return REGIONS.find(([rx]) => rx.test(s))?.[1] ?? null;
};
/** Two injuries in different body regions. Unknown regions never differ. */
const differentInjury = (a: string | null | undefined, b: string | null | undefined) => {
  const [x, y] = [anatomy(a), anatomy(b)];
  return !!x && !!y && x !== y;
};

/** An injury's first word, singular, for comparing two sources' anatomy:
 *  "Knee - ACL" and "Knee" meet, "Quadriceps" and "Quadricep" meet. */
const region = (v: string) =>
  (v.toLowerCase().match(/[a-z]+/)?.[0] ?? "").replace(/s$/, "");

/** Same reduction `headline-match` uses, so one key serves both. */
const boardKey = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

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

  // CBS and Sharp, pulled alongside the wire and inside the same TTL window.
  // Never fatal: a board that fails contributes an empty map and the rows keep
  // Sleeper's own field, which is what they had before these existed.
  //
  // The NFL's own report is pulled in the same window. It fails soft like the
  // boards, but its failure is kept and printed: a row missing its practice
  // line should not look like a player with nothing on the report (§10).
  let officialError: string | null = null;
  const [boards, official] = await Promise.all([
    pullBoards().catch(() => new Map<string, ExternalInjury>()),
    pullOfficialInjuries(SEASON).catch((err: unknown): OfficialInjuries => {
      officialError = err instanceof Error ? err.message : String(err);
      return { week: null, byPlayer: new Map(), teamsReported: new Set() };
    }),
  ]);
  // The start of the report week's practice cycle: its first kickoff, less six
  // days. A record written before it describes an earlier point in the season.
  const reportWeekStart = (() => {
    if (official.week == null) return null;
    const first = gamesForWeek(official.week)[0];
    if (!first) return null;
    return new Date(new Date(first.kickoff).getTime() - 6 * 864e5)
      .toISOString()
      .slice(0, 10);
  })();
  const isHistorical = (record: CampInjury | null, team: string) =>
    !!record && !!reportWeekStart && official.teamsReported.has(team) &&
    record.reported < reportWeekStart;

  const officialFor = (name: string, team: string) => {
    const k = officialKey(name, team);
    const entry = official.byPlayer.get(k) ?? null;
    return { official: entry, offReport: !entry && official.teamsReported.has(team) };
  };

  const records = new Map(camp.data.map((r) => [key(r.name, r.position), r]));
  const seen = new Set<string>();
  const rows: TrackerRow[] = [];

  for (const w of wire) {
    const k = key(w.name, w.position);
    const record = records.get(k) ?? null;
    // Every fantasy skill position carrying a designation, with no relevance
    // cutoff. There used to be one at search rank 400, and on 2026-08-27 it was
    // hiding 90 of the 158 designated players Sleeper carries — 36 of them on a
    // serious status. The operator's call is that position is the filter and
    // popularity is not: a backup tight end on IR is still an injury this page
    // is for.
    // `pullWire` already drops teamless players, but the type still allows it:
    // a designation with no club is not actionable on this page, and a written
    // record is the better source for the club if it has one.
    const team = w.team ?? record?.team;
    if (!team) continue;
    seen.add(k);
    const historical = isHistorical(record, team);
    // A board only ever fills a gap. Where Sleeper names anatomy that stands;
    // where it says "Undisclosed" and CBS says "Groin", the reader gets
    // "Groin", because a column whose job is to name the injury cannot do it
    // from the word undisclosed.
    const board = boards.get(boardKey(record?.name ?? w.name)) ?? null;
    const fromReport = officialFor(record?.name ?? w.name, team);
    // The league's report is the primary source for what is wrong with him
    // this week (§2). Where it and Sleeper name the same body part, Sleeper's
    // wording stays, because it is often the more specific ("Knee - ACL +
    // MCL" against "Knee"). Where they differ, the report wins: Kaelon Black
    // was "Illness" on the wire and "Groin" on the report in Week 2.
    const off = fromReport.official?.primary ?? null;
    const sleeperPart = !isVaguePart(w.body_part) ? w.body_part : null;
    const bodyPart =
      (off && sleeperPart && region(off) === region(sleeperPart) ? sleeperPart : null) ||
      off ||
      sleeperPart ||
      record?.body_part ||
      board?.part ||
      w.body_part ||
      null;
    // What he carries now, from the report first, then the wire. A report entry
    // for a rest day or a personal matter names no injury and cannot supersede.
    const current =
      (fromReport.official && !fromReport.official.notInjury
        ? fromReport.official.primary
        : null) ?? sleeperPart;
    rows.push({
      name: record?.name ?? w.name,
      team,
      position: w.position as CampInjury["position"],
      wire: w.status,
      body_part: bodyPart,
      recordSuperseded: !!record && differentInjury(record.body_part ?? record.diagnosis, current),
      recordHistorical: historical,
      currentInjury: current ?? null,
      board,
      notes: w.notes ?? null,
      record,
      // A record that predates this week is not disagreeing with the wire, it
      // is simply older, and badging it as a conflict was noise.
      conflict: record && !historical ? disagrees(record.status, w.status) : false,
      ...fromReport,
      headlines: [], summary: null,
      // A historical record no longer dates the row: the page stopped printing
      // it, and an "Updated Aug 17" under a line about this week's report is
      // the same stale claim in the one column that is meant to date it.
      lastUpdate: lastUpdateOf(w.updated, historical ? null : record),
      severity: severityOf(
        w.status,
        fromReport.official?.game ?? undefined,
        current ?? null,
        historical,
      ),
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
    // Only the report can speak for a player the wire has dropped.
    const rep = officialFor(record.name, record.team);
    const superseded =
      !!rep.official && !rep.official.notInjury &&
      differentInjury(record.body_part ?? record.diagnosis, rep.official.primary);
    const current =
      rep.official && !rep.official.notInjury ? rep.official.primary : null;
    const historical = isHistorical(record, record.team);
    rows.push({
      name: record.name, team: record.team, position: record.position,
      // The current injury when the record is about an earlier one. Taking the
      // record's here made the row print its old injury as the current one:
      // Jerry Jeudy read "Hamstring injury" twice, when the Week 2 practice
      // report lists his wrist and the hamstring is from August 3.
      wire: null,
      body_part: superseded ? rep.official!.primary : (record.body_part ?? null),
      notes: null,
      record, conflict: false, board: null, headlines: [], summary: null,
      ...rep,
      recordSuperseded: superseded,
      recordHistorical: historical,
      currentInjury: current,
      lastUpdate: lastUpdateOf(null, historical ? null : record),
      severity: severityOf(null, rep.official?.game ?? undefined, current, historical),
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
    officialWeek: official.week,
    officialError,
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
      // supplemented by a composed sentence, unless it is about an earlier
      // injury: then the current one has to be named from somewhere.
      // A record the report has moved past is not printed at all any more, so
      // it cannot be the authority on its row either: without this the Injury
      // column fell back to the bare body part, and George Kittle read
      // "Achilles" where the composed line says what the week actually holds.
      summary: r.record && !r.recordSuperseded && !r.recordHistorical
        ? null
        : summarise(r.body_part, r.notes, headlines),
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
