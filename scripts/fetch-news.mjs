#!/usr/bin/env node
/**
 * Pull headlines from publisher RSS feeds into src/data/news.json.
 *
 * Stores headline, source, timestamp and link only — never article body text
 * (§2). RSS is the route publishers offer for exactly this, which is why the
 * feeds are used rather than their tracker pages: the pages are their editorial
 * product, the feed is their invitation.
 *
 * The pipeline itself — fetching, parsing, categorising and tagging — lives in
 * `src/lib/feed.ts`, shared with the live news route so the committed archive
 * and the page cannot disagree about which player a headline is about. Node
 * runs the TypeScript directly. This file is now only the part that is specific
 * to writing the archive: read, merge, stamp, write.
 *
 * Still worth running even though the page pulls live: this file is the floor
 * the page falls back to when publishers are unreachable, and it is the only
 * copy of the history that survives a feed dropping an item.
 *
 * Run: node scripts/fetch-news.mjs [--dry]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mergeNews, pullAll } from "../src/lib/feed.ts";
import { stampDate } from "./lib/today.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const players = read("src/data/players.json").data;
const teams = read("src/data/teams.json").data;

const { items: fresh, counts, failures } = await pullAll(players, teams);

for (const c of counts) console.log(`  ${c.name}: ${c.count} items`);
for (const f of failures) console.error(`  ${f.name}: FAILED — ${f.reason}`);

// A total outage should fail the job rather than quietly commit an empty feed.
if (!counts.length) {
  console.error("\nAll feeds failed. Leaving news.json untouched.");
  process.exit(1);
}

const existing = read("src/data/news.json");
const merged = mergeNews(existing.data, fresh);

const out = {
  schema_version: existing.schema_version ?? 1,
  updated: stampDate(),
  note: "Headlines pulled from publisher RSS by scripts/fetch-news.mjs. Headline, source, timestamp and link only — no article body text (§2). Follow the link to read the piece. The news page also pulls these feeds live; this file is the archive it merges over and falls back to.",
  data: merged,
};

console.log(
  `\n${fresh.length} pulled, ${merged.length} stored ` +
  `(${merged.filter((n) => n.category === "injury").length} injury).`,
);

if (DRY) {
  console.log("--dry: not writing.");
} else {
  writeFileSync(join(ROOT, "src/data/news.json"), JSON.stringify(out, null, 1) + "\n");
  console.log("wrote src/data/news.json");
}
