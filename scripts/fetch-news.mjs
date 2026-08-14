#!/usr/bin/env node
/**
 * Pull headlines from publisher RSS feeds into src/data/news.json.
 *
 * Stores headline, source, timestamp and link only — never article body text
 * (§2). RSS is the route publishers offer for exactly this, which is why the
 * feeds are used rather than their tracker pages: the pages are their editorial
 * product, the feed is their invitation.
 *
 * Headlines are tagged to players and teams by name match so the injury page
 * can surface fresh news against a player without anyone re-keying it.
 *
 * Run: node scripts/fetch-news.mjs [--dry]
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

const FEEDS = [
  { name: "CBS Sports", url: "https://www.cbssports.com/rss/headlines/nfl/" },
  { name: "Yahoo Sports", url: "https://sports.yahoo.com/nfl/rss.xml" },
  { name: "Pro Football Rumors", url: "https://www.profootballrumors.com/feed" },
  { name: "RotoWire", url: "https://www.rotowire.com/rss/news.php?sport=NFL" },
];

/** Only football-relevant headlines are kept; these feeds carry all sports. */
const NFL_HINT =
  /\b(nfl|quarterback|running back|wide receiver|tight end|preseason|training camp|week \d|snap|touchdown|depth chart)\b/i;

const CATEGORY = [
  [/\b(injur|hamstring|acl|mcl|lcl|pcl|achilles|concussion|strain|sprain|surgery|pup|ir\b|carted|tear|fracture)/i, "injury"],
  [/\b(sign|trade|waive|release|claim|extension|restructure|cut)\b/i, "transaction"],
  [/\b(practice|dnp|limited participant|full participant|walkthrough)\b/i, "practice"],
  [/\b(camp|otas?|minicamp|preseason)\b/i, "camp"],
];

const players = JSON.parse(readFileSync(join(ROOT, "src/data/players.json"), "utf8")).data;
const teams = JSON.parse(readFileSync(join(ROOT, "src/data/teams.json"), "utf8")).data;

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")
    // Numeric entities in any form: feeds mix &#39; and &#039; and &#x27;.
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};

function categorise(text) {
  for (const [re, cat] of CATEGORY) if (re.test(text)) return cat;
  return "breaking";
}

/** Surname match, then confirm the first initial or full first name is nearby,
 *  so "Smith" alone does not tag every Smith on the roster. */
function tagPlayers(headline) {
  const hits = [];
  for (const p of players) {
    if (p.position === "DST") continue;
    const parts = p.name.split(" ");
    const last = parts[parts.length - 1];
    if (last.length < 4) continue;
    if (!new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(headline)) continue;
    const first = parts[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b(${first}|${first[0]}\\.?)\\s`, "i").test(headline)) hits.push(p.id);
  }
  return hits;
}

function tagTeams(headline) {
  return teams
    .filter((t) =>
      new RegExp(`\\b(${t.nickname}|${t.city} ${t.nickname})\\b`, "i").test(headline),
    )
    .map((t) => t.abbr);
}

async function pull(feed) {
  const res = await fetch(feed.url, {
    headers: { "user-agent": "VantageFootballAnalytics/1.0 (personal, non-commercial)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${feed.name}: HTTP ${res.status}`);
  const xml = await res.text();
  const items = xml.split(/<item[\s>]/i).slice(1);

  return items.flatMap((raw) => {
    const headline = tag(raw, "title");
    const link = tag(raw, "link");
    const date = tag(raw, "pubDate") || tag(raw, "published");
    if (!headline || !link) return [];

    const teamsHit = tagTeams(headline);
    const playersHit = tagPlayers(headline);
    // Keep it only if it is recognisably football.
    if (!teamsHit.length && !playersHit.length && !NFL_HINT.test(headline)) return [];

    const ts = new Date(date);
    return [{
      // Hash, not a prefix of the URL: every CBS link starts with the same
      // characters, so a truncated encoding collides across the whole feed.
      id: createHash("sha1").update(link).digest("base64url").slice(0, 16),
      headline,
      source: feed.name,
      url: link,
      timestamp: Number.isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString(),
      category: categorise(headline),
      ...(playersHit.length ? { player_ids: playersHit } : {}),
      ...(teamsHit.length ? { team_abbrs: teamsHit } : {}),
    }];
  });
}

const results = await Promise.allSettled(FEEDS.map(pull));

const fresh = [];
let failures = 0;
results.forEach((r, i) => {
  if (r.status === "fulfilled") {
    console.log(`  ${FEEDS[i].name}: ${r.value.length} items`);
    fresh.push(...r.value);
  } else {
    failures++;
    console.error(`  ${FEEDS[i].name}: FAILED — ${r.reason.message}`);
  }
});

// A total outage should fail the job rather than quietly commit an empty feed.
if (failures === FEEDS.length) {
  console.error("\nAll feeds failed. Leaving news.json untouched.");
  process.exit(1);
}

const existing = JSON.parse(readFileSync(join(ROOT, "src/data/news.json"), "utf8"));
const byId = new Map(existing.data.map((n) => [n.id, n]));
for (const item of fresh) byId.set(item.id, item);

const merged = [...byId.values()]
  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  .slice(0, 150);

const out = {
  schema_version: existing.schema_version ?? 1,
  updated: new Date().toISOString().slice(0, 10),
  note: "Headlines pulled from publisher RSS by scripts/fetch-news.mjs. Headline, source, timestamp and link only — no article body text (§2). Follow the link to read the piece.",
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
