import beatFile from "@/data/beat-posts.json";

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
}

interface BeatFile {
  schema_version: number;
  updated: string;
  note?: string;
  data: BeatPost[];
}

const file = beatFile as unknown as BeatFile;

export const BEAT_POSTS: BeatPost[] = [...file.data].sort((a, b) =>
  b.timestamp.localeCompare(a.timestamp),
);
export const BEAT_UPDATED = file.updated;

/** Ordered by how directly each moves a lineup decision. */
export const BEAT_TOPICS: BeatTopic[] = [
  "Injury",
  "Role",
  "Scheme",
  "Transaction",
  "Evaluation",
];

export const TOPIC_BLURB: Record<BeatTopic, string> = {
  Injury: "Availability and designations",
  Role: "Snaps, touches and depth chart",
  Scheme: "How an offense intends to use people",
  Transaction: "Signings, cuts and roster moves",
  Evaluation: "What coaches and reporters are saying",
};
