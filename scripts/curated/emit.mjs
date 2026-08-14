import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { classify } from "/Users/michaelhuettl/Desktop/Claude Code/vantage/scripts/lib/signal.mjs";

const raw = JSON.parse(readFileSync("curated_raw.json", "utf8"));
const out = raw.map((r) => {
  // Topic only — the keep decision is ignored. These were selected by hand, so
  // the curation has already happened and re-filtering would discard the
  // operator's own judgement.
  const sig = classify(r.text);
  return {
    id: "c" + createHash("sha1").update(r.text).digest("base64url").slice(0, 14),
    text: r.text,
    author: r.author,
    via: "@" + "workbook",
    url: `https://x.com/${r.author.replace("@", "")}`,
    timestamp: (r.date ?? "2026-07-15") + "T12:00:00.000Z",
    approx_date: r.approx_date,
    topic: sig.topic ?? "Evaluation",
    ...(r.team_abbrs.length ? { team_abbrs: r.team_abbrs } : {}),
    ...(r.player_ids.length ? { player_ids: r.player_ids } : {}),
  };
});
const byTopic = {};
for (const p of out) byTopic[p.topic] = (byTopic[p.topic] ?? 0) + 1;
console.log(`${out.length} curated posts`, JSON.stringify(byTopic));
writeFileSync("/Users/michaelhuettl/Desktop/Claude Code/vantage/src/data/curated-posts.json",
  JSON.stringify({
    schema_version: 1,
    updated: "2026-08-14",
    note: "June and July X posts, collected by hand in the workbook's Offseason News sheet and read off the screenshots by OCR. Selected by the operator, so the signal filter that governs the live feed is not applied — only a topic is assigned. Where a post carried a relative timestamp the exact day is unknown and `approx_date` is set; those are shown as the collection window rather than given a fabricated date.",
    data: out,
  }, null, 1) + "\n");
console.log("wrote src/data/curated-posts.json");
