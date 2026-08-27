/**
 * Naming the injury on a row nobody has written up.
 *
 * The rule here is plainness, set by the operator on 2026-08-27: the column
 * says what the injury is and nothing else. Not "the wire lists a knee injury",
 * not "not stated", not a report about a report — just *Hyperextended knee*,
 * *ACL and MCL, surgery*, *Foot sprain*, *Undisclosed*.
 *
 * That last one matters. "Undisclosed" is what the wire actually says when a
 * club withholds the detail, so printing it is both true and shorter than any
 * phrasing of "nothing is known". A row genuinely carrying nothing prints
 * nothing at all rather than an apology for it (§8).
 *
 * ## Where the words come from
 *
 * A controlled vocabulary and fixed patterns, never free generation. A phrase
 * is lifted from a matched headline when one plainly contains an injury —
 * "hyperextended right knee", "high ankle sprain", "ACL tear" — because a
 * headline is the only place a real diagnosis ever appears. Otherwise the
 * wire's own structured fields are stated directly. Where a headline names a
 * different body part from the wire's, the wire wins: that case is nearly
 * always a headline about a second, older injury, and the wrong injury on a
 * row is the failure worth avoiding.
 *
 * **There is no timeline guard here any more and none is needed.** The
 * extraction patterns match a body part plus an injury noun, or a verb plus a
 * body part. Neither shape can capture a duration, so "out several weeks with a
 * hyperextended right knee" yields "hyperextended right knee" and cannot yield
 * anything else. The guard that used to sit here was checking for something the
 * grammar cannot produce.
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

/** Body parts that are already the condition and need no "injury" after them. */
const SELF_DESCRIBING = new Set(["concussion", "illness"]);

/** Attributive form: "a rib injury", not "a ribs injury". */
const SINGULAR: Record<string, string> = {
  ribs: "rib", hamstrings: "hamstring", abs: "abdominal", quads: "quad",
};

/** Wire values that describe no injury at all. */
const NOT_AN_INJURY = /undisclosed|not disclosed|suspension|personal|coach/i;

/** First letter up, initialisms left alone: "Hyperextended knee", "ACL tear". */
function sentenceCase(phrase: string): string {
  const first = phrase.split(/\s+/)[0] ?? "";
  if (/^[A-Z]{2,}$/.test(first)) return phrase;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
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

  // A headline is the only place a real diagnosis ever appears, so it wins.
  for (const h of headlines) {
    const detail = detailFrom(h.headline);
    if (!detail) continue;
    // A headline naming a different body part is almost always about a second,
    // older injury. The wire wins; putting the wrong one on a row is the
    // failure that matters.
    const detailBody = bodyOf(detail);
    if (!vague && wireBody && detailBody && detailBody !== wireBody) continue;
    return {
      text: sentenceCase(detail),
      credit: { source: h.source, url: h.url },
      basis: "headline",
    };
  }

  // The values that are not a body part are handled first. Run through
  // wirePhrase they came out as "Undisclosed injury" and, worse, "Suspension
  // injury" — a suspension is not an injury and the column must not say it is.
  if (bodyPart && NOT_AN_INJURY.test(bodyPart)) {
    const text = /suspension/i.test(bodyPart) ? "Suspension" : "Undisclosed";
    return { text, credit: null, basis: "wire" };
  }

  // Otherwise the wire's own fields, stated as the injury rather than as a
  // report about the injury.
  const phrase = bodyPart ? wirePhrase(bodyPart, notes) : null;
  if (phrase) {
    const surgery = notes && /surgery/i.test(notes) ? ", surgery" : "";
    return { text: sentenceCase(phrase + surgery), credit: null, basis: "wire" };
  }
  return null;
}
