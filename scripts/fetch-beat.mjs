#!/usr/bin/env node
/**
 * Pull beat-writer posts from X into src/data/beat-posts.json.
 *
 * X has no free read API, so this goes through Nitter, a third-party frontend.
 * Be clear-eyed about that: Nitter is not a supported interface, X blocks it
 * periodically, and instances die. The script is built to fail safely rather
 * than to pretend otherwise — it tries several instances, and if none answer it
 * leaves the existing file untouched and exits non-zero so the job goes red
 * instead of silently publishing an empty section.
 *
 * Stored per post: author handle, text, timestamp and a link to the original on
 * x.com. Posts are short enough that the text is the headline, and every one
 * carries attribution and a link back (§2).
 *
 * Run: node scripts/fetch-beat.mjs [--dry] [--only=32BeatWriters]
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { classify } from "./lib/signal.mjs";
import { stampDate } from "./lib/today.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

// Ordered by reliability. The first that answers for a given account wins.
const INSTANCES = ["https://nitter.net", "https://xcancel.com"];

/**
 * Nothing before this date is kept. Each feed only returns ~20 recent posts,
 * but the file merges on every run, so without a floor it grows without bound
 * and fills with material from a season that no longer matters. May 2026 is
 * the start of the relevant cycle: OTAs, minicamp, then camp.
 */
const CUTOFF = "2026-05-01";

/** League-wide aggregator of individual beat writers, plus Sleeper's per-team
 *  accounts. `team: null` means the account covers the whole league and each
 *  post is tagged from its own text instead. */
const ACCOUNTS = [
  { handle: "32BeatWriters", team: null },
  { handle: "SleeperNFL", team: null },
  { handle: "SleeperAZCards", team: "ARI" },
  { handle: "SleeperFalcons", team: "ATL" },
  { handle: "SleeperRavens", team: "BAL" },
  { handle: "SleeperBills", team: "BUF" },
  { handle: "SleeperPanthers", team: "CAR" },
  { handle: "SleeperBears", team: "CHI" },
  { handle: "SleeperBengals", team: "CIN" },
  { handle: "SleeperBrowns", team: "CLE" },
  { handle: "SleeperCowboys", team: "DAL" },
  { handle: "SleeperBroncos", team: "DEN" },
  { handle: "SleeperLions", team: "DET" },
  { handle: "SleeperPackers", team: "GB" },
  { handle: "SleeperTexans", team: "HOU" },
  { handle: "SleeperColts", team: "IND" },
  { handle: "SleeperJaguars", team: "JAX" },
  { handle: "SleeperChiefs", team: "KC" },
  { handle: "SleeperRaiders", team: "LV" },
  { handle: "SleeperChargers", team: "LAC" },
  { handle: "SleeperRams", team: "LAR" },
  { handle: "SleeperDolphins", team: "MIA" },
  { handle: "SleeperVikings", team: "MIN" },
  { handle: "SleeperPatriots", team: "NE" },
  { handle: "SleeperSaints", team: "NO" },
  { handle: "SleeperGiants", team: "NYG" },
  { handle: "SleeperJets", team: "NYJ" },
  { handle: "SleeperEagles", team: "PHI" },
  { handle: "SleeperSteelers", team: "PIT" },
  { handle: "Sleeper49ers", team: "SF" },
  { handle: "SleeperSeahawks", team: "SEA" },
  { handle: "SleeperBucs", team: "TB" },
  { handle: "SleeperTitans", team: "TEN" },
  { handle: "SleeperCommanders", team: "WAS" },
];

const skipped = {};
const players = JSON.parse(readFileSync(join(ROOT, "src/data/players.json"), "utf8")).data;
const teams = JSON.parse(readFileSync(join(ROOT, "src/data/teams.json"), "utf8")).data;

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, " ")
    .trim();

const field = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};

function tagPlayers(text) {
  const hits = [];
  for (const p of players) {
    if (p.position === "DST") continue;
    const parts = p.name.split(" ");
    const last = parts[parts.length - 1];
    if (last.length < 4) continue;
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`\\b${esc(last)}\\b`, "i").test(text)) continue;
    const first = esc(parts[0]);
    if (new RegExp(`\\b(${first}|${first[0]}\\.?)\\s`, "i").test(text)) hits.push(p.id);
  }
  return hits;
}

function tagTeams(text) {
  return teams
    .filter((t) => new RegExp(`\\b(${t.nickname}|#${t.nickname})\\b`, "i").test(text))
    .map((t) => t.abbr);
}

async function pullAccount({ handle, team }) {
  for (const base of INSTANCES) {
    try {
      const res = await fetch(`${base}/${handle}/rss`, {
        headers: { "user-agent": "VantageFootballAnalytics/1.0 (personal, non-commercial)" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.split("<item>").slice(1);
      if (items.length === 0) continue;

      return items.flatMap((raw) => {
        const rawTitle = field(raw, "title");
        const link = field(raw, "link");
        const date = field(raw, "pubDate");
        // Retweets carry the aggregator's handle in the title; the real author
        // is in dc:creator, which is who the reader should be credited to.
        const author = field(raw, "dc:creator") || `@${handle}`;
        const text = rawTitle.replace(/^RT by @[\w]+:\s*/i, "").trim();
        if (!text || !link) return [];

        // Nitter rewrites permalinks to itself; point them back at the source.
        const url = link
          .replace(/^https?:\/\/[^/]+/, "https://x.com")
          .replace(/#m$/, "");

        const ts = new Date(date);
        const iso = Number.isNaN(ts.getTime())
          ? new Date().toISOString()
          : ts.toISOString();
        if (iso.slice(0, 10) < CUTOFF) return [];

        // Most of what these accounts post is not information. Keep only what
        // carries a subject a reader acts on, and record which subject.
        const sig = classify(text);
        if (!sig.keep) { skipped[sig.reason] = (skipped[sig.reason] ?? 0) + 1; return []; }

        const tagged = tagPlayers(text);
        // Team, most reliable source first: the account's own beat, then the
        // teams of any players named, then a mention in the text. Text alone
        // is the weakest — a post about an Arizona back picking up an injury
        // "vs. the Raiders" mentions Las Vegas and means Arizona.
        const teamsHit = team
          ? [team]
          : tagged.length
            ? tagged.flatMap((id) => {
                const pl = players.find((x) => x.id === id);
                return pl?.team ? [pl.team] : [];
              })
            : tagTeams(text);
        return [{
          id: createHash("sha1").update(url).digest("base64url").slice(0, 16),
          text,
          author,
          via: `@${handle}`,
          url,
          timestamp: iso,
          topic: sig.topic,
          ...(teamsHit.length ? { team_abbrs: [...new Set(teamsHit)] } : {}),
          ...(tagged.length ? { player_ids: tagged } : {}),
        }];
      });
    } catch {
      // Try the next instance.
    }
  }
  throw new Error("no instance answered");
}

const list = ONLY ? ACCOUNTS.filter((a) => a.handle === ONLY) : ACCOUNTS;
const fresh = [];
const dead = [];

// Sequential with a short gap: these instances rate-limit aggressively, and a
// burst of 34 parallel requests is the fastest way to get every one refused.
for (const acct of list) {
  try {
    const items = await pullAccount(acct);
    fresh.push(...items);
    console.log(`  ${acct.handle}: ${items.length}`);
  } catch {
    dead.push(acct.handle);
    console.warn(`  ${acct.handle}: no data`);
  }
  await new Promise((r) => setTimeout(r, 400));
}

if (fresh.length === 0) {
  console.error(
    "\nNo posts from any account or instance. Nitter is unofficial and X blocks " +
    "it periodically. Leaving beat-posts.json untouched.",
  );
  process.exit(1);
}

const path = join(ROOT, "src/data/beat-posts.json");
const existing = existsSync(path)
  ? JSON.parse(readFileSync(path, "utf8"))
  : { schema_version: 1, data: [] };

const byId = new Map(existing.data.map((p) => [p.id, p]));
for (const item of fresh) byId.set(item.id, item);

const merged = [...byId.values()]
  .filter((p) => p.timestamp.slice(0, 10) >= CUTOFF)
  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  .slice(0, 250);

const filteredOut = Object.values(skipped).reduce((a, b) => a + b, 0);
console.log(
  `\n${fresh.length} kept of ${fresh.length + filteredOut} from ` +
  `${list.length - dead.length}/${list.length} accounts, ${merged.length} stored.` +
  `\nfiltered: ${Object.entries(skipped).map(([k, v]) => `${k} ${v}`).join(", ")}` +
  (dead.length ? `\nno data: ${dead.join(", ")}` : ""),
);

if (DRY) {
  console.log("--dry: not writing.");
} else {
  writeFileSync(path, JSON.stringify({
    schema_version: 1,
    updated: stampDate(),
    note: "Beat-writer posts from X, via Nitter. Author handle, text, timestamp and a link to the original post. Nitter is a third-party frontend that X blocks periodically; if this file stops updating, that is the first thing to check.",
    data: merged,
  }, null, 1) + "\n");
  console.log("wrote src/data/beat-posts.json");
}
