import beatFile from "@/data/beat-posts.json";
import curatedFile from "@/data/curated-posts.json";

export type BeatTopic =
  | "Injury"
  | "Role"
  | "Scheme"
  | "Evaluation"
  | "Transaction";

export interface BeatPost {
  id: string;
  text: string;
  /** The reporter who wrote it, not the account that reshared it. */
  author: string;
  /** The account it was pulled through. */
  via: string;
  url: string;
  timestamp: string;
  topic: BeatTopic;
  team_abbrs?: string[];
  player_ids?: string[];
  /** The source post carried a relative timestamp, so the exact day is not
   *  known. Shown as the collection window rather than a fabricated date. */
  approx_date?: boolean;
  /** Hand-collected from the workbook rather than pulled from a feed. */
  curated?: boolean;
}

interface BeatFile {
  schema_version: number;
  updated: string;
  note?: string;
  data: BeatPost[];
}

const file = beatFile as unknown as BeatFile;

const curated = curatedFile as unknown as BeatFile;

/** Live feed first, then the hand-collected June-July archive. Both render
 *  identically; only their provenance and date confidence differ. */
export const BEAT_POSTS: BeatPost[] = [
  ...file.data,
  ...curated.data.map((p) => ({ ...p, curated: true })),
].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

export const BEAT_UPDATED = file.updated;
export const CURATED_COUNT = curated.data.length;

/** Ordered by how directly each moves a lineup decision. */
export const BEAT_TOPICS: BeatTopic[] = [
  "Injury",
  "Role",
  "Scheme",
  "Transaction",
  "Evaluation",
];

/**
 * The clause a reader is actually here for.
 *
 * These posts bury one useful line inside setup, hashtags and attribution. The
 * takeaway is found rather than the whole post being emphasised, so the eye
 * lands on the meaning and the surrounding text stays available as context.
 *
 * Order matters: a direct quote is the strongest signal a human said something
 * that matters, so it wins outright. Failing that, the sentence carrying the
 * topic's own vocabulary is the one that earned the post its topic.
 */
const TOPIC_CUE: Record<BeatTopic, RegExp> = {
  Injury:
    /\b(injur\w*|hamstring|acl|mcl|lcl|pcl|achilles|concussion|strain|sprain|surgery|pup|carted|did not practice|ruled out|day-to-day|week-to-week|questionable|doubtful)\b/i,
  Role: /\b(start\w*|first team|1'?s\b|depth chart|snaps?|reps?|workload|touches|carries|targets|rotation|committee|lead back|no\.? ?1)\b/i,
  Scheme:
    /\b(scheme|install|package|personnel|under center|shotgun|play-action|motion|alignment|lined up|system)\b/i,
  Transaction:
    /\b(sign\w*|trad\w*|waiv\w*|releas\w*|claim\w*|activat\w*|extension|cut|53-man|roster spot|practice squad)\b/i,
  Evaluation: /\b(said|told|per |according to|revealed|looked|impress\w*|stood out|expect\w*|believes?|praised)\b/i,
};

export function takeaway(post: BeatPost): string | undefined {
  const text = post.text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');

  // A quote of real length is the takeaway, whatever else is in the post.
  const quoted = text.match(/"([^"]{20,240})"/);
  if (quoted) return quoted[1].trim();

  // Otherwise the sentence that carries the topic's vocabulary.
  const cue = TOPIC_CUE[post.topic];

  // Abbreviations end in a period without ending a sentence. Splitting naively
  // cut "14 touches vs. the Raiders" into a fragment ending at "vs." — so the
  // periods are masked, split, then restored.
  const MASK = "\u0000";
  const ABBREV = /\b(vs|No|Jr|Sr|St|Dr|Mr|Mrs|Inc|Jan|Feb|Aug|Sept?|Oct|Nov|Dec|a\.m|p\.m)\./gi;
  const sentences = text
    .replace(ABBREV, (m) => m.slice(0, -1) + MASK)
    .split(/(?<=[.!?])\s+|\s*•\s*|\s*▪️\s*/)
    .map((s) =>
      s
        .replace(new RegExp(MASK, "g"), ".")
        // OCR and reshare prefixes leave leading dots and bullets behind.
        .replace(/^[\s.·•…"']+/, "")
        .trim(),
    )
    // A highlight has to be a claim, not a fragment. "downright dangerous."
    // is technically a sentence and tells the reader nothing on its own.
    .filter((s) => s.length >= 30)
    // A segment ending in a colon is a label for what follows, not the point.
    .filter((s) => !/:$/.test(s));

  const hit = sentences.find((s) => cue.test(s));
  if (hit && hit.length <= 220) return hit;

  // A single long sentence: highlight nothing rather than the whole post.
  return sentences.length > 1 ? sentences[0] : undefined;
}

/** Splits a post around its takeaway so the page can emphasise the middle. */
export function splitOnTakeaway(post: BeatPost): {
  before: string;
  mark?: string;
  after: string;
} {
  const mark = takeaway(post);
  if (!mark) return { before: post.text, after: "" };
  // Search the normalised text, then map back by index onto the original so
  // curly punctuation is preserved in what the reader sees.
  const norm = post.text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
  const i = norm.indexOf(mark);
  if (i === -1) return { before: post.text, after: "" };
  return {
    before: post.text.slice(0, i),
    mark: post.text.slice(i, i + mark.length),
    after: post.text.slice(i + mark.length),
  };
}

export const TOPIC_BLURB: Record<BeatTopic, string> = {
  Injury: "Availability and designations",
  Role: "Snaps, touches and depth chart",
  Scheme: "How an offense intends to use people",
  Transaction: "Signings, cuts and roster moves",
  Evaluation: "What coaches and reporters are saying",
};
