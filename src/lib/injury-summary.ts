/**
 * Composing a one-line injury description for a row nobody has written up.
 *
 * The operator asked for this explicitly, having weighed it against §11: the
 * tracker has to run unattended, and an injury description has essentially one
 * sensible phrasing, so the rule against publishing generated prose under his
 * name is being spent here deliberately. Two things follow from that being a
 * decision rather than an oversight.
 *
 * **It is always labelled.** The page marks these rows so a reader can tell
 * composed text from the hand-written records beside it. The site's pitch is
 * that you can audit the argument; silently mixing the two would break that
 * more than the generated sentence itself ever could.
 *
 * **It never states a timeline** (§5.3). That rule is separate from §11 and was
 * not part of what was set aside. "Out several weeks" and "hoping for a Week 1
 * return" appear in these headlines constantly and are deliberately not
 * extracted: a return date is the part that actually costs a reader something
 * when it is wrong, and it already appears on the row inside the headline,
 * where its publisher's name is attached to it. `assertNoTimeline` below is a
 * hard stop, not a style preference.
 *
 * ## How it composes
 *
 * From a controlled vocabulary and fixed patterns, never free generation. A
 * phrase is lifted from a matched headline when one plainly contains an injury
 * ("hyperextended right knee", "high ankle sprain", "ACL tear") and credited to
 * that publisher. Otherwise it falls back to the wire's own structured fields,
 * which are always true even when they are vague. **Failing back is the correct
 * outcome, not a degraded one** — Sleeper's "Knee - ACL + MCL" plus "Surgery"
 * says more than most headlines do.
 *
 * When a headline names a different body part from the one the wire lists, the
 * wire wins and the headline phrase is dropped. That case is nearly always a
 * headline about a second, older injury, and putting the wrong one on a row is
 * the failure worth avoiding.
 */
import type { NewsEntry } from "./types";

/** Anatomy the wire and headlines both use. Order matters: longest first, so
 *  "lower body" is not matched as "body". */
const BODY = [
  "lower body", "upper body", "high ankle", "achilles", "hamstring", "shoulder",
  "quadriceps", "collarbone", "abdomen", "pectoral", "forearm", "oblique",
  "triceps", "biceps", "sternum", "clavicle", "groin", "ankle", "thumb",
  "wrist", "elbow", "chest", "shin", "quad", "calf", "knee", "foot", "hand",
  "back", "ribs", "hip", "toe", "neck", "thigh", "heel", "finger", "head",
  "concussion", "illness",
];

/** Named structures, printed in capitals because that is how they are written. */
const STRUCTURE = ["acl", "mcl", "pcl", "lcl", "ucl", "meniscus", "labrum", "achilles"];

/** What a headline calls the thing that happened. */
const NOUN = [
  "sprain", "strain", "tear", "fracture", "injury", "soreness", "contusion",
  "dislocation", "spasms", "surgery", "bruise", "inflammation",
];

/** Verbs, mapped to the participle the sentence needs. */
const VERB: Record<string, string> = {
  hyperextended: "hyperextended", hyperextending: "hyperextended",
  hyperextends: "hyperextended",
  tore: "torn", torn: "torn", tears: "torn",
  fractured: "fractured", fractures: "fractured", fracturing: "fractured",
  sprained: "sprained", sprains: "sprained", spraining: "sprained",
  strained: "strained", strains: "strained", straining: "strained",
  dislocated: "dislocated", dislocates: "dislocated", dislocating: "dislocated",
  ruptured: "ruptured", ruptures: "ruptured", rupturing: "ruptured",
  separated: "separated", broke: "broken", broken: "broken",
};

const QUALIFIER = ["high", "low", "mild", "minor", "severe", "partial", "complete", "grade 1", "grade 2", "grade 3"];
const SIDE = ["left", "right"];

const alt = (xs: string[]) => xs.join("|");

/**
 * Anything that could be read as a return date. If one of these survives into a
 * composed sentence, the sentence is thrown away rather than published (§5.3).
 */
const TIMELINE =
  /\b(week|weeks|month|months|day|days|season|return|returns|returning|back|out for|miss|misses|missing|timetable|timeline|expected|questionable for|doubtful for|game[s]?)\b/i;

/** Capitalised only where the league capitalises it. */
function tidy(phrase: string): string {
  return phrase
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (STRUCTURE.includes(w) && w !== "meniscus" && w !== "labrum" && w !== "achilles"
      ? w.toUpperCase()
      : w))
    .join(" ")
    .trim();
}

/** The body part a phrase is about, for the cross-check against the wire. */
function bodyOf(phrase: string): string | null {
  const p = phrase.toLowerCase();
  // Structures imply their joint, so an "ACL tear" does not read as a conflict
  // with a wire that says "Knee".
  if (/\bacl|mcl|pcl|lcl|meniscus\b/.test(p)) return "knee";
  if (/\bucl\b/.test(p)) return "elbow";
  if (/\blabrum\b/.test(p)) return "shoulder";
  for (const b of BODY) if (p.includes(b)) return b === "high ankle" ? "ankle" : b;
  return null;
}

/** The injury phrase a headline plainly contains, or null. */
export function detailFrom(headline: string): string | null {
  const h = headline.toLowerCase().replace(/[’‘]/g, "'");

  // "high ankle sprain", "ACL tear", "groin injury", "right knee soreness"
  const nounFirst = new RegExp(
    `\\b(?:(${alt(QUALIFIER)})\\s+)?(?:(${alt(SIDE)})\\s+)?(${alt([...BODY, ...STRUCTURE])})\\s+(${alt(NOUN)})\\b`,
  );
  // "hyperextending knee", "tore his right ACL", "fractured a rib"
  const verbFirst = new RegExp(
    `\\b(${alt(Object.keys(VERB))})\\s+(?:his|the|a|an)?\\s*(?:(${alt(SIDE)})\\s+)?(${alt([...BODY, ...STRUCTURE])})\\b`,
  );

  const n = nounFirst.exec(h);
  if (n) {
    const [, qual, side, body, noun] = n;
    return tidy([qual, side, body, noun].filter(Boolean).join(" "));
  }
  const v = verbFirst.exec(h);
  if (v) {
    const [, verb, side, body] = v;
    return tidy([VERB[verb], side, body].filter(Boolean).join(" "));
  }
  return null;
}

/** Nouns that take no article: "knee soreness", not "a knee soreness". */
const UNCOUNTABLE = new Set([
  "soreness", "spasms", "inflammation", "surgery", "tightness", "stiffness",
]);

/** Body parts that are already the condition and need no "injury" after them. */
const SELF_DESCRIBING = new Set(["concussion", "illness"]);

/** Attributive form: "a rib injury", not "a ribs injury". */
const SINGULAR: Record<string, string> = {
  ribs: "rib", hamstrings: "hamstring", abs: "abdominal", quads: "quad",
};

/** Wire values that describe no injury at all. */
const NOT_AN_INJURY = /undisclosed|not disclosed|suspension|personal|coach/i;

/**
 * "a" or "an", including for the initialisms this vocabulary is full of.
 *
 * An acronym takes the article its first *letter name* wants, which is not the
 * same rule as for words: "an ACL tear" and "an MCL sprain" but "a PCL tear",
 * because L, M and N are said "el", "em", "en" while P is said "pee".
 */
const AN_LETTERS = new Set(["a", "e", "f", "h", "i", "l", "m", "n", "o", "r", "s", "x"]);
function article(phrase: string): string {
  const first = phrase.split(/\s+/)[0] ?? "";
  if (/^[A-Z]{2,}$/.test(first)) {
    return AN_LETTERS.has(first[0].toLowerCase()) ? "an" : "a";
  }
  return /^[aeiou]/i.test(first) ? "an" : "a";
}

/** "a hyperextended knee", "an ACL tear", "knee soreness". */
function withArticle(phrase: string): string {
  const head = phrase.split(/\s+/).pop() ?? "";
  return UNCOUNTABLE.has(head) ? phrase : `${article(phrase)} ${phrase}`;
}

/**
 * The wire's own fields as a phrase: "knee injury (ACL and MCL)", "foot
 * sprain", "upper-body injury", "concussion".
 */
function wirePhrase(bodyPart: string, notes: string | null): string | null {
  const [rawJoint, ...rest] = bodyPart.split(/\s*-\s*/);
  const raw = tidy(rawJoint).replace(/^(upper|lower) body$/, "$1-body");
  const joint = SINGULAR[raw] ?? raw;
  if (!joint) return null;

  const note = notes ? tidy(notes) : null;
  // Sleeper's note is either the kind of injury ("Sprain", "Soreness") or the
  // treatment ("Surgery"). Only the first belongs inside the noun phrase; the
  // treatment gets its own clause. Uncountable kinds are kept — "knee
  // soreness" is the point of the note, and `withArticle` drops the article
  // for them on its own.
  const kind = note && NOUN.includes(note) && note !== "surgery" ? note : null;

  const head = SELF_DESCRIBING.has(joint)
    ? joint
    : `${joint} ${kind ?? "injury"}`;

  const structures = rest.length
    ? ` (${rest.join(" ").split(/\s*\+\s*/).map((x) => tidy(x).toUpperCase()).join(" and ")})`
    : "";

  return `${head}${structures}`;
}

export interface AutoSummary {
  /** The composed sentence. Never contains a timeline. */
  text: string;
  /** The publisher the detail came from, when it came from one. */
  credit: { source: string; url: string } | null;
  /** Which way it was built, so the page can be honest about it. */
  basis: "headline" | "wire";
}

/**
 * Compose a description for a row with no hand-written record.
 *
 * Returns null when there is genuinely nothing to say. "Undisclosed" is the
 * commonest wire value on this page and a sentence reporting that the wire
 * reported nothing is worse than the honest blank the column already has.
 */
export function summarise(
  bodyPart: string | null,
  notes: string | null,
  headlines: NewsEntry[],
): AutoSummary | null {
  const wireBody = bodyPart ? bodyOf(bodyPart) : null;
  const vague = !bodyPart || NOT_AN_INJURY.test(bodyPart);

  for (const h of headlines) {
    const detail = detailFrom(h.headline);
    if (!detail) continue;
    // A headline naming a different body part is almost always about a second,
    // older injury. The wire wins; putting the wrong one on a row is the
    // failure that matters.
    const detailBody = bodyOf(detail);
    if (!vague && wireBody && detailBody && detailBody !== wireBody) continue;
    const text = `${h.source} reports ${withArticle(detail)}.`;
    if (TIMELINE.test(text)) continue; // §5.3, hard stop
    return { text, credit: { source: h.source, url: h.url }, basis: "headline" };
  }

  if (!bodyPart || NOT_AN_INJURY.test(bodyPart)) return null;
  const phrase = wirePhrase(bodyPart, notes);
  if (!phrase) return null;

  const surgery = notes && /surgery/i.test(notes) ? " and surgery" : "";
  const text = `The wire lists ${withArticle(phrase)}${surgery}. No further detail has been published.`;
  return TIMELINE.test(text) ? null : { text, credit: null, basis: "wire" };
}
