#!/usr/bin/env node
/**
 * Fill the game tracker: scores, Vegas lines, implied totals, per-team leaders
 * and weather, into src/data/schedule.json.
 *
 * The matchups themselves are never touched. This script only fills the slots
 * the card draws empty — a schedule is settled months ahead, and re-deriving it
 * every run would risk rewriting a fixture over a bad response.
 *
 * **Implied team totals are computed here, not on the page.** They are a metric
 * and §11 does not let a component compute one. This script is the closest
 * thing this project has to the pipeline §3 describes, so the arithmetic lives
 * here and the site renders the result.
 *
 * Sources:
 *   - Scores, lines and leaders: ESPN. The scoreboard carries the odds and the
 *     final score; per-team leaders only exist on the per-game summary, so a
 *     finished game costs one extra request.
 *   - Weather: Open-Meteo primary (§4.3 names it, it is a JSON API licensed for
 *     reuse), nflweather.com as a fallback. Weather is skipped entirely for
 *     roofed games and for kickoffs beyond the forecast horizon — no provider
 *     publishes a useful forecast a month out, and an empty weather block is
 *     the honest answer rather than a failure.
 *
 * Run: node scripts/fetch-games.mjs [--week=N] [--all] [--dry]
 *      no flag  → every week with a game between 7 days ago and 14 days ahead
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stampDate } from "./lib/today.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const ALL = process.argv.includes("--all");
const WEEK_ARG = process.argv.find((a) => a.startsWith("--week="));

const SEASON = 2026;
const UA = "VantageFootballAnalytics/1.0 (personal, non-commercial)";

/** ESPN uses WSH; teams.json uses WAS. */
const ESPN_TEAM = { WSH: "WAS" };
const fixTeam = (a) => ESPN_TEAM[a] ?? a;

const schedule = JSON.parse(readFileSync(join(ROOT, "src/data/schedule.json"), "utf8"));
const stadiums = JSON.parse(readFileSync(join(ROOT, "src/data/stadiums.json"), "utf8")).data;
const teams = JSON.parse(readFileSync(join(ROOT, "src/data/teams.json"), "utf8")).data;
const nicknameOf = Object.fromEntries(teams.map((t) => [t.abbr, t.nickname]));

const json = async (url) => {
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
};

// ---------------------------------------------------------------- weeks ----

function targetWeeks() {
  if (WEEK_ARG) return [Number(WEEK_ARG.split("=")[1])];
  if (ALL) return [...new Set(schedule.data.map((g) => g.week))].sort((a, b) => a - b);
  const now = Date.now();
  const from = now - 7 * 864e5;
  const to = now + 14 * 864e5;
  const weeks = new Set();
  for (const g of schedule.data) {
    const t = new Date(g.kickoff).getTime();
    if (t >= from && t <= to) weeks.add(g.week);
  }
  return [...weeks].sort((a, b) => a - b);
}

// ----------------------------------------------------------------- odds ----

/**
 * Implied team totals from the spread and the game total.
 *
 * spread_line is negative when the home side is favoured, which is how a
 * spread is published. The favourite's implied total is half the game total
 * plus half the margin; the underdog's is half minus half.
 *
 * Kept to two decimals rather than one. Totals and spreads move in halves, so
 * the halves of them are quarters: a 49.5 total on a 7-point spread is exactly
 * 21.25 and 28.25. Rounded to a tenth those become 21.3 and 28.3, which sum to
 * 49.6 — a reader can add the two numbers on the card and catch the site out.
 */
function impliedTotals(spread, total) {
  if (spread === undefined || total === undefined) return undefined;
  return {
    away: +(total / 2 + spread / 2).toFixed(2),
    home: +(total / 2 - spread / 2).toFixed(2),
  };
}

function readOdds(competition) {
  const o = competition.odds?.[0];
  if (!o) return {};
  const spread = typeof o.spread === "number" ? o.spread : undefined;
  const total = typeof o.overUnder === "number" ? o.overUnder : undefined;
  const away = o.awayTeamOdds?.moneyLine;
  const home = o.homeTeamOdds?.moneyLine;
  return {
    spread_line: spread,
    total_line: total,
    moneyline:
      typeof away === "number" && typeof home === "number" ? { away, home } : undefined,
    implied: impliedTotals(spread, total),
  };
}

// -------------------------------------------------------------- leaders ----

const LEADER_SLOT = {
  passingYards: "qb",
  rushingYards: "rusher",
  receivingYards: "receiver",
};

/** Per-team leaders live on the summary endpoint, not the scoreboard. Defence
 *  prefers the sack leader and falls back to tackles — neither is "who decided
 *  it", but a sack leader is the closer proxy. */
async function readLeaders(eventId) {
  const s = await json(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`,
  );
  const out = {};
  for (const side of s.leaders ?? []) {
    const abbr = fixTeam(side.team?.abbreviation);
    if (!abbr) continue;
    const slots = {};
    let defense;
    for (const cat of side.leaders ?? []) {
      const top = cat.leaders?.[0];
      if (!top?.athlete?.displayName) continue;
      const entry = { name: top.athlete.displayName, stat: top.displayValue };
      const slot = LEADER_SLOT[cat.name];
      if (slot) slots[slot] = entry;
      if (cat.name === "sacks") defense = entry;
      else if (cat.name === "totalTackles" && !defense) defense = entry;
    }
    if (defense) slots.defense = defense;
    if (Object.keys(slots).length) out[abbr] = slots;
  }
  return out;
}

// -------------------------------------------------------------- weather ----

/** WMO weather codes, collapsed to the words a reader needs. */
const WMO = [
  [[0], "Clear"], [[1, 2], "Partly cloudy"], [[3], "Overcast"],
  [[45, 48], "Fog"], [[51, 53, 55, 56, 57], "Drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Rain"],
  [[71, 73, 75, 77, 85, 86], "Snow"], [[95, 96, 99], "Thunderstorms"],
];
const describe = (code) =>
  WMO.find(([codes]) => codes.includes(code))?.[1] ?? "Unsettled";

async function openMeteo(game) {
  const s = stadiums[game.venue];
  if (!s) return undefined;
  const day = game.kickoff.slice(0, 10);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}` +
    `&hourly=temperature_2m,wind_speed_10m,precipitation_probability,weather_code` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=UTC` +
    `&start_date=${day}&end_date=${day}`;
  const j = await json(url);
  const times = j.hourly?.time ?? [];
  if (!times.length) return undefined;
  // Nearest hour to kickoff, not the day's average — a 1pm and an 8pm kickoff
  // in the same stadium are different games.
  const target = new Date(game.kickoff).getTime();
  let best = 0;
  for (let i = 1; i < times.length; i++) {
    if (
      Math.abs(new Date(times[i] + "Z").getTime() - target) <
      Math.abs(new Date(times[best] + "Z").getTime() - target)
    )
      best = i;
  }
  return {
    temp_f: Math.round(j.hourly.temperature_2m[best]),
    wind_mph: Math.round(j.hourly.wind_speed_10m[best]),
    precip_pct: Math.round(j.hourly.precipitation_probability[best] ?? 0),
    summary: describe(j.hourly.weather_code[best]),
  };
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * nflweather.com fallback.
 *
 * Their week page lists a row per game. The readings are rendered client-side,
 * so this finds them only when they are in the served HTML; when they are not,
 * it returns nothing and says so rather than guessing. Weeks more than a
 * fortnight out have no readings at all, from anyone.
 */
async function nflWeather(game) {
  const slug = `${slugify(nicknameOf[game.away] ?? game.away)}-at-${slugify(nicknameOf[game.home] ?? game.home)}`;
  const url = `https://nflweather.com/games/${SEASON}/week-${game.week}/${slug}`;
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return undefined;
  const html = await res.text();
  const temp = html.match(/(-?\d{1,3})\s*°\s*F/i);
  const wind = html.match(/(\d{1,2})\s*mph/i);
  if (!temp && !wind) return undefined;
  return {
    temp_f: temp ? Number(temp[1]) : 0,
    wind_mph: wind ? Number(wind[1]) : 0,
    precip_pct: Number(html.match(/(\d{1,3})\s*%/)?.[1] ?? 0),
    summary: "Reported by nflweather.com",
  };
}

const FORECAST_HORIZON_DAYS = 16;

async function weatherFor(game) {
  if (game.roof === "dome" || game.roof === "closed") return undefined;
  const days = (new Date(game.kickoff).getTime() - Date.now()) / 864e5;
  if (days > FORECAST_HORIZON_DAYS) return undefined;
  try {
    const w = await openMeteo(game);
    if (w) return w;
  } catch (e) {
    console.error(`    open-meteo failed for ${game.id}: ${e.message}`);
  }
  try {
    return await nflWeather(game);
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------------ run ----

const weeks = targetWeeks();
if (!weeks.length) {
  console.log("No week has a game in the window. Use --week=N or --all.");
  process.exit(0);
}
console.log(`Weeks: ${weeks.join(", ")}`);

const byId = new Map(schedule.data.map((g) => [g.id, g]));
let touched = 0, scored = 0, lined = 0, weathered = 0, failures = 0;

for (const week of weeks) {
  let board;
  try {
    board = await json(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${SEASON}&seasontype=2&week=${week}`,
    );
  } catch (e) {
    console.error(`  week ${week}: FAILED — ${e.message}`);
    failures++;
    continue;
  }

  for (const event of board.events ?? []) {
    const c = event.competitions[0];
    const away = fixTeam(c.competitors.find((x) => x.homeAway === "away")?.team.abbreviation);
    const home = fixTeam(c.competitors.find((x) => x.homeAway === "home")?.team.abbreviation);
    const game = byId.get(`${SEASON}-w${week}-${away.toLowerCase()}-${home.toLowerCase()}`);
    if (!game) {
      console.error(`  week ${week}: ${away}@${home} not in schedule.json — skipped`);
      continue;
    }

    const odds = readOdds(c);
    if (odds.spread_line !== undefined) {
      Object.assign(game, odds);
      lined++;
    }

    const final = c.status?.type?.completed === true;
    if (final) {
      const a = c.competitors.find((x) => x.homeAway === "away")?.score;
      const h = c.competitors.find((x) => x.homeAway === "home")?.score;
      if (a !== undefined && h !== undefined) {
        game.score = { away: Number(a), home: Number(h) };
        scored++;
      }
      try {
        const led = await readLeaders(event.id);
        if (led[away] || led[home]) {
          game.leaders = {
            ...(led[away] ? { away: led[away] } : {}),
            ...(led[home] ? { home: led[home] } : {}),
          };
        }
      } catch (e) {
        console.error(`    leaders failed for ${game.id}: ${e.message}`);
      }
    }

    const w = await weatherFor(game);
    if (w) {
      game.weather = w;
      weathered++;
    }
    touched++;
  }
  console.log(`  week ${week}: ${board.events?.length ?? 0} games read`);
}

console.log(
  `\n${touched} games touched — ${lined} with lines, ${scored} final, ${weathered} with a forecast.`,
);
if (failures) console.error(`${failures} week(s) failed; their games were left untouched.`);

if (DRY) {
  console.log("--dry: not writing.");
} else if (touched === 0) {
  console.error("Nothing read. Leaving schedule.json untouched.");
  process.exit(1);
} else {
  schedule.updated = stampDate();
  writeFileSync(join(ROOT, "src/data/schedule.json"), JSON.stringify(schedule, null, 1) + "\n");
  console.log("wrote src/data/schedule.json");
}
