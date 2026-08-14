/**
 * Decide whether a beat post is worth publishing, and what it is about.
 *
 * These accounts post constantly and most of it is not information: highlight
 * calls, uniform reveals, birthdays, engagement bait, app promos, and
 * single-rep practice results. A reader does not need to know a quarterback
 * went 0-for-3 against one corner on one afternoon. They need to know what a
 * coach said about a player's role, how the scheme is expected to use him, and
 * who is hurt.
 *
 * A post is kept only if it clears the noise rules and matches at least one
 * topic. The topic is then shown, so the section can be read by subject
 * instead of scrolled.
 */

/** Dropped outright, whatever else the post contains. */
const NOISE = [
  /^image$/i,                                   // media-only post, no text
  /^R to @/i,                                   // bare reshare of a link
  /\b(happy birthday|birthday)\b/i,
  /\b(uniform|threads for|jersey combo|helmet combo)\b/i,
  /\b(giveaway|sweepstakes|promo code|download the app|sign up|sleepersafe|enter to win)\b/i,
  /\b(anybody else|what do we think|prove me wrong|am i wrong|hot take)\b/i,
  /\bmost valuable (nfl )?franchises?\b/i,
  /^\W*(lfg|let's go|wow|omg)\W*$/i,
  // First-person opinion. These accounts editorialise constantly, and a
  // poster's own take is not a report — "I've seen enough" matched Role on
  // the word "snap" before this.
  /\b(i've seen|i don't|i think|i'd|my take|leaning (no|yes)|jury still out|not sure i)\b/i,
];

/**
 * Single-practice minutiae. A rep count against one defender on one day is
 * the canonical example of something that reads like information and is not.
 */
const REP_MINUTIAE =
  /\b(\d+\s*[-\/]\s*(?:for\s*)?\d+|went \d+ for \d+|0 for \d+)\b.*\b(1[-\s]?on[-\s]?1|7[-\s]?on[-\s]?7|red ?zone drill|team drill|rep)\b/i;

/** Topics worth publishing, most specific first — the first match wins. */
const TOPICS = [
  ["Injury", /\b(injur|hamstring|acl|mcl|lcl|pcl|achilles|concussion|strain|sprain|surgery|pup|\bir\b|carted|did not practice|dnp|limited|questionable|doubtful|ruled out|day[- ]to[- ]day|week[- ]to[- ]week)\b/i],
  ["Transaction", /\b(signed?|signing|traded?|waived?|released?|claimed?|activated?|extension|restructur|cut|53[- ]man|roster bubble|roster spot|make the roster|practice squad|in danger of not making)\b/i],
  ["Role", /\b(starter|starting(?!\s+(strong|fast|hot|off)\b)|will start|first team|with the 1s|depth chart|snap|reps with|workload|touches|carries|targets|rb1|wr1|te1|qb1|rotation|committee|lead back|no\.? ?1)\b/i],
  ["Scheme", /\b(scheme|install|package|personnel|under center|shotgun|play[- ]action|motion|alignment|lined up|offense will|defense will|system)\b/i],
  ["Evaluation", /\b(said|told|per |according to|revealed|looked|impress|stood out|breakout|expects?|expected to|believes?|praised|hyped)\b/i],
];

/** Attribution or a real quote — evidence someone said this, not a poster's take. */
const ATTRIBUTED = /(\bper\s+@?\w|according to|\bsaid\b|\btold\b|".{12,}"|:\s*")/i;

export function classify(text) {
  // Normalise smart punctuation first. These posts are full of curly
  // apostrophes, and "I\u2019ve seen enough" slipped past a filter written
  // with a straight one — a whole class of silent misses.
  const t = (text ?? "")
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();

  if (t.length < 32) return { keep: false, reason: "too short" };
  if (NOISE.some((re) => re.test(t))) return { keep: false, reason: "noise" };
  if (REP_MINUTIAE.test(t)) return { keep: false, reason: "single-rep minutiae" };

  // Mostly emoji or decoration rather than words.
  const letters = (t.match(/[a-z]/gi) ?? []).length;
  if (letters / t.length < 0.55) return { keep: false, reason: "low text density" };

  // All-caps shouting is a highlight call, not a report.
  const caps = (t.match(/[A-Z]/g) ?? []).length;
  if (letters > 20 && caps / letters > 0.6) return { keep: false, reason: "highlight call" };

  const topic = TOPICS.find(([, re]) => re.test(t));
  if (!topic) return { keep: false, reason: "no topic" };

  // Evaluation is the loosest bucket, so it additionally has to be attributed
  // — otherwise every opinion a poster has about a player qualifies.
  if (topic[0] === "Evaluation" && !ATTRIBUTED.test(t)) {
    return { keep: false, reason: "unattributed opinion" };
  }

  return { keep: true, topic: topic[0] };
}
