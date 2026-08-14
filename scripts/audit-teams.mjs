#!/usr/bin/env node
/**
 * Check every team in players.json against a live roster, and print what
 * disagrees. Writes nothing.
 *
 * The teams in players.json came out of the workbook's 2025 target-share sheet,
 * which means every 2026 move was silently wrong until it was checked — and a
 * wrong team is also a wrong bye week on the rankings page. Rosters keep moving
 * (cuts, a free agent signing in September), so this is a check to re-run, not
 * a one-time repair.
 *
 * Sleeper's player endpoint is public, unauthenticated, and carries the current
 * team for every player in the league. It is used here as a check on authored
 * data, not as a site data source — §11's "no third-party API" rule is about
 * what the site depends on at build time, and nothing here reaches the site.
 *
 * Matching is the part that can lie to you. Names collide: the league has two
 * Kenneth Walkers (a UCLA receiver and the Michigan State back) and two Josh
 * Allens. So a match must agree on position as well as name, and where more
 * than one candidate still survives this reports the ambiguity instead of
 * picking one. An unreviewed guess here is worse than no answer.
 *
 * Usage:
 *   node scripts/audit-teams.mjs
 *
 * Exits non-zero when anything disagrees, so a silent pass means agreement.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://api.sleeper.app/v1/players/nfl";

/** Suffixes are written inconsistently across sources — "Travis Etienne" here,
 *  "Travis Etienne Jr." there — so they are dropped on both sides. */
const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

function norm(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .filter((part) => part && !SUFFIXES.has(part))
    .join("");
}

const players = JSON.parse(
  readFileSync(join(ROOT, "src/data/players.json"), "utf8"),
).data;

// The response is ~14MB. It is the only endpoint that carries every player,
// and this runs by hand a few times a season, so the size is acceptable.
const res = await fetch(ENDPOINT, {
  headers: { "user-agent": "VantageFootballAnalytics/1.0 (personal, non-commercial)" },
  signal: AbortSignal.timeout(120_000),
});
if (!res.ok) throw new Error(`HTTP ${res.status} from ${ENDPOINT}`);
const roster = await res.json();

const byName = new Map();
for (const rec of Object.values(roster)) {
  if (!rec.full_name) continue;
  const key = norm(rec.full_name);
  const list = byName.get(key) ?? [];
  list.push(rec);
  byName.set(key, list);
}

const agree = [];
const differ = [];
const ambiguous = [];
const missing = [];

for (const player of players) {
  // A defence carries its own team by construction, so there is nothing to check.
  if (player.position === "DST") continue;

  const candidates = byName.get(norm(player.name)) ?? [];
  const samePosition = candidates.filter((rec) =>
    [rec.position, ...(rec.fantasy_positions ?? [])].includes(player.position),
  );
  // A retired namesake keeps his record with no team on it, so preferring the
  // rostered candidate resolves most collisions without a judgment call.
  const rostered = samePosition.filter((rec) => rec.team);
  const pool = rostered.length > 0 ? rostered : samePosition;

  if (candidates.length === 0) {
    missing.push([player, "no name match"]);
  } else if (samePosition.length === 0) {
    const seen = candidates.map((c) => `${c.position} ${c.team ?? "FA"}`).join(", ");
    missing.push([player, `name matched but position differs: ${seen}`]);
  } else if (pool.length > 1) {
    ambiguous.push([player, pool]);
  } else {
    const theirs = pool[0].team ?? undefined;
    (theirs === player.team ? agree : differ).push([player, theirs]);
  }
}

const label = (team, status) => team ?? (status === "fa" ? "unsigned" : "none");

console.log(`Checked ${players.filter((p) => p.position !== "DST").length} players against Sleeper.`);
console.log(`  agree      ${agree.length}`);
console.log(`  disagree   ${differ.length}`);
console.log(`  ambiguous  ${ambiguous.length}`);
console.log(`  unmatched  ${missing.length}`);

if (differ.length > 0) {
  console.log("\nDisagreements — confirm each against a second source before editing:");
  for (const [player, theirs] of differ) {
    console.log(
      `  ${player.position.padEnd(3)} ${player.name.padEnd(24)} ` +
        `players.json says ${label(player.team, player.status).padEnd(8)} → roster says ${label(theirs)}`,
    );
  }
}

if (ambiguous.length > 0) {
  console.log("\nAmbiguous — more than one player matches this name and position:");
  for (const [player, pool] of ambiguous) {
    console.log(`  ${player.position} ${player.name} (players.json: ${label(player.team, player.status)})`);
    for (const rec of pool) {
      console.log(`      team=${rec.team ?? "FA"} college=${rec.college ?? "?"} born=${rec.birth_date ?? "?"}`);
    }
  }
}

if (missing.length > 0) {
  console.log("\nUnmatched — check the spelling in players.json:");
  for (const [player, why] of missing) {
    console.log(`  ${player.position} ${player.name} — ${why}`);
  }
}

const problems = differ.length + ambiguous.length + missing.length;
if (problems === 0) console.log("\nEvery team agrees with the live roster.");
process.exit(problems === 0 ? 0 : 1);
