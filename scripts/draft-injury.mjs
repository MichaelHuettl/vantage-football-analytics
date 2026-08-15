#!/usr/bin/env node
/**
 * Draft camp-injury records from an article for you to review.
 *
 * Deliberately does not write anything. It reads a page, finds sentences that
 * name a player and describe an injury, and prints candidate JSON. You read the
 * article, correct the draft, and paste what survives into camp-injuries.json.
 *
 * That human step is the point. The clinical fields — diagnosis, grade,
 * expected absence, attribution — are the reason this section is worth reading,
 * and a regex cannot tell "out four weeks" from "avoided a four-week absence".
 *
 * Usage:
 *   node scripts/draft-injury.mjs <url>
 *   pbpaste | node scripts/draft-injury.mjs -        # when a page needs JS
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stampDate } from "./lib/today.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];

if (!arg) {
  console.error("usage: node scripts/draft-injury.mjs <url|->");
  process.exit(1);
}

const players = JSON.parse(readFileSync(join(ROOT, "src/data/players.json"), "utf8")).data;
const camp = JSON.parse(readFileSync(join(ROOT, "src/data/camp-injuries.json"), "utf8")).data;
const known = new Set(camp.map((c) => c.name.toLowerCase()));

const BODY_PARTS = [
  "hamstring", "groin", "quad", "calf", "ankle", "knee", "acl", "mcl", "lcl", "pcl",
  "achilles", "foot", "toe", "hip", "shoulder", "labrum", "elbow", "wrist", "thumb",
  "hand", "rib", "back", "neck", "concussion", "oblique", "abdominal", "hernia",
  "pectoral", "bicep", "triceps", "shin", "fibula", "tibia", "clavicle",
];
const BODY_RE = new RegExp(`\\b(${BODY_PARTS.join("|")})\\b`, "i");
const TIMELINE_RE =
  /\b(week[- ]to[- ]week|day[- ]to[- ]day|out for the season|season[- ]ending|\d+\s*(?:to\s*\d+\s*)?(?:day|week|month)s?|week \d+)\b/i;
const GRADE_RE = /\bgrade\s*(i{1,3}|[123])\b/i;

async function loadText() {
  if (arg === "-") return readFileSync(0, "utf8");
  const res = await fetch(arg, {
    headers: { "user-agent": "VantageFootballAnalytics/1.0 (personal, non-commercial)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

const text = await loadText();
if (text.trim().length < 400) {
  console.error(
    "Only " + text.trim().length + " characters of text came back.\n" +
    "The page is probably JavaScript-rendered. Copy the article and pipe it:\n" +
    "  pbpaste | node scripts/draft-injury.mjs -",
  );
  process.exit(2);
}

const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 25 && s.length < 500);

const drafts = new Map();
for (const s of sentences) {
  if (!BODY_RE.test(s)) continue;
  for (const p of players) {
    const last = p.name.split(" ").pop();
    if (last.length < 4) continue;
    if (!new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(s)) continue;
    if (drafts.has(p.id)) continue;
    const grade = s.match(GRADE_RE);
    const timeline = s.match(TIMELINE_RE);
    drafts.set(p.id, {
      player_id: p.id,
      name: p.name,
      team: p.team ?? "??",
      position: p.position,
      body_part: capitalise(s.match(BODY_RE)[1]),
      diagnosis: grade ? `Grade ${grade[1].toUpperCase()} ${s.match(BODY_RE)[1]}` : "REVIEW",
      status: "REVIEW",
      ...(timeline ? { timeline: timeline[0], attribution: "REVIEW" } : {}),
      latest: "REVIEW",
      reported: stampDate(),
      source: "reported",
      source_url: arg === "-" ? "REVIEW" : arg,
      _sentence: s.trim(),
      _alreadyTracked: known.has(p.name.toLowerCase()),
    });
  }
}

function capitalise(s) {
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

if (drafts.size === 0) {
  console.log("No sentences matched a roster player alongside an injury term.");
  process.exit(0);
}

console.log(`${drafts.size} candidate(s). Every REVIEW field needs a human.\n`);
for (const d of drafts.values()) {
  const { _sentence, _alreadyTracked, ...rec } = d;
  console.log(`── ${rec.name} (${rec.team} ${rec.position})` +
    (_alreadyTracked ? "  [already in camp-injuries.json — update, do not duplicate]" : ""));
  console.log(`   source text: "${_sentence}"`);
  console.log(JSON.stringify(rec, null, 1).split("\n").map((l) => "   " + l).join("\n"));
  console.log();
}
console.log("Unlisted players are not drafted — add those by hand.");
