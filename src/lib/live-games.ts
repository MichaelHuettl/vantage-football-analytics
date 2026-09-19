/**
 * The game tracker's data, pulled at request time — the same pattern as the
 * news and injury wires.
 *
 * Before 2026-09-19 the tracker was filled only when someone ran
 * `npm run games`, and nobody had since 2026-08-14: Week 1 was played with no
 * score on the site at all. The operator asked for it to pull live like the
 * news and injury sections, from CBS for scores and nflweather for weather.
 *
 * Three things keep that honest, as they do for news:
 *
 *  - **The committed schedule is the floor.** Live results merge *over*
 *    `src/data/schedule.json`, never replace it. A source outage leaves the
 *    week as the fixtures, venues and roofs the schedule already knows; it
 *    never empties the page (§8).
 *  - **Each source is reported separately**, so the page can say which half is
 *    missing rather than going quietly stale (§6). Scores failing and weather
 *    failing are different problems with different effects on a reader.
 *  - **Neither source is hammered.** Polls are bounded by an in-process cache,
 *    shared in-flight, so a burst of readers makes one call. Scores refresh
 *    every minute only while a game in the week is on and every fifteen
 *    otherwise; weather, which moves slowly, every thirty.
 *
 * Arithmetic stays out of components (§11): implied totals are derived here,
 * in the server-side data layer, with the formula scripts/fetch-games.mjs
 * uses, so a card never computes one.
 */
import teamsFile from "@/data/teams.json";
import { SCHEDULE_UPDATED, SEASON, gamesForWeek } from "./games";
import {
  impliedTotals,
  parseCbsScoreboard,
  parseNflWeather,
  type CbsGame,
  type WeatherGame,
} from "./scoreboard-parse";
import type { Game } from "./types";

const UA = "VantageFootballAnalytics/1.0 (personal, non-commercial)";
const cbsUrl = (week: number) =>
  `https://www.cbssports.com/nfl/scoreboard/all/${SEASON}/regular/${week}/`;
const weatherUrl = (week: number) => `https://www.nflweather.com/week/${SEASON}/week-${week}`;

/** Seconds a scores pull is reused while a game in its week is on. */
export const SCORES_TTL_LIVE = 60;
/** ...and when nothing is. A Tuesday reader does not need a per-minute poll. */
export const SCORES_TTL_IDLE = 15 * 60;
export const WEATHER_TTL = 30 * 60;

/** A game counts as "on" from half an hour before kickoff to 4.5 hours after. */
const WINDOW_BEFORE_MS = 30 * 60_000;
const WINDOW_AFTER_MS = 4.5 * 3_600_000;

const nicknameToAbbr = new Map(
  (teamsFile as { data: { abbr: string; nickname: string }[] }).data.map((t) => [
    t.nickname.toLowerCase(),
    t.abbr,
  ]),
);

export interface SourceReport {
  /** Whether this source answered on the pull being shown. */
  ok: boolean;
  /** Games in the week this source matched to the schedule. */
  matched: number;
  /** Why it did not answer, in its own words, for the page to print. */
  error?: string;
}

export interface LiveWeek {
  games: Game[];
  scores: SourceReport;
  weather: SourceReport;
  /** True when the scores source answered — the thing "live" means here. */
  live: boolean;
  /** Date for DataFreshness: today in Eastern when live, else the schedule's. */
  updated: string;
  /** "4:21 PM ET", when the scores in view were pulled. */
  pulledAt?: string;
  /** A game in this week is on now, so the page should refresh briskly. */
  inWindow: boolean;
}

/** Eastern, not UTC: an evening pull stamped in UTC reads as tomorrow. */
const easternDate = (d = new Date()) =>
  d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const easternTime = (d: Date) =>
  `${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET`;

/** Whether any game in `games` is inside its live window at `now`. */
export function weekInWindow(games: Game[], now = Date.now()): boolean {
  return games.some((g) => {
    const k = new Date(g.kickoff).getTime();
    return now >= k - WINDOW_BEFORE_MS && now <= k + WINDOW_AFTER_MS;
  });
}

// ------------------------------------------------------------------ cache --

type Pull<T> = { at: number; ok: true; value: T } | { at: number; ok: false; error: string };
const cache = new Map<string, Pull<unknown>>();
const inFlight = new Map<string, Promise<Pull<unknown>>>();

/**
 * One source, fetched at most once per `ttl`, with concurrent callers sharing
 * the request. Failures are cached for a short while too — a source that is
 * down should not be retried by every reader who arrives in the next second —
 * but only for a fifth of the TTL, so a brief outage clears quickly.
 */
async function pull<T>(key: string, ttl: number, load: () => Promise<T>): Promise<Pull<T>> {
  const hit = cache.get(key) as Pull<T> | undefined;
  const life = hit && (hit.ok ? ttl : ttl / 5) * 1000;
  if (hit && life && Date.now() - hit.at < life) return hit;
  const running = inFlight.get(key) as Promise<Pull<T>> | undefined;
  if (running) return running;

  const p: Promise<Pull<T>> = load()
    .then((value) => ({ at: Date.now(), ok: true as const, value }))
    .catch((err: unknown) => ({
      at: Date.now(),
      ok: false as const,
      error: err instanceof Error ? err.message : String(err),
    }))
    .then((result) => {
      cache.set(key, result);
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function fetchText(url: string): Promise<string> {
  // `no-store` for the reason src/lib/feed.ts gives: a revalidated fetch is
  // served stale-while-revalidate, so the page would always be one pull
  // behind. The TTL cache above is what keeps the call rate polite.
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ------------------------------------------------------------------ merge --

function mergeScores(g: Game, c: CbsGame): Game {
  const out: Game = { ...g, status: { state: c.state, detail: c.detail } };
  if (c.score) out.score = c.score;
  // Pregame cards carry the current line. Once a game kicks off CBS stops
  // showing one, so the committed line is kept rather than blanked.
  if (c.spread_line !== undefined || c.total_line !== undefined) {
    out.spread_line = c.spread_line ?? g.spread_line;
    out.total_line = c.total_line ?? g.total_line;
    out.implied = impliedTotals(out.spread_line, out.total_line);
  }
  return out;
}

function mergeWeather(g: Game, w: WeatherGame): Game {
  const out: Game = { ...g };
  // nflweather marks a game "dome" when it expects it indoors. That can only
  // narrow the site's roof data, never widen it: a retractable venue marked
  // dome is taken as closed, and a fixed dome needs no telling.
  if (w.dome && g.roof === "retractable") out.roof_closed = true;
  if (w.temp_f !== undefined && w.summary && w.wind_mph !== undefined) {
    out.weather = {
      temp_f: w.temp_f,
      wind_mph: w.wind_mph,
      wind_dir: w.wind_dir,
      precip_pct: w.precip_pct,
      summary: w.summary,
    };
  }
  return out;
}

// ------------------------------------------------------------------- week --

/**
 * One week of the tracker: the committed schedule with live scores, lines and
 * weather laid over it. Never throws — a failure is reported, not raised.
 */
export async function getLiveWeek(week: number): Promise<LiveWeek> {
  const floor = gamesForWeek(week);
  const inWindow = weekInWindow(floor);

  const [scores, weather] = await Promise.all([
    pull(`cbs:${week}`, inWindow ? SCORES_TTL_LIVE : SCORES_TTL_IDLE, async () =>
      parseCbsScoreboard(await fetchText(cbsUrl(week))),
    ),
    pull(`wx:${week}`, WEATHER_TTL, async () =>
      parseNflWeather(await fetchText(weatherUrl(week))),
    ),
  ]);

  let scoresMatched = 0;
  let weatherMatched = 0;
  const games = floor.map((g) => {
    let out = g;
    if (scores.ok) {
      const c = scores.value.find((x) => x.away === g.away && x.home === g.home);
      if (c) {
        out = mergeScores(out, c);
        scoresMatched++;
      }
    }
    if (weather.ok) {
      const w = weather.value.find(
        (x) => nicknameToAbbr.get(x.away) === g.away && nicknameToAbbr.get(x.home) === g.home,
      );
      if (w) {
        out = mergeWeather(out, w);
        weatherMatched++;
      }
    }
    return out;
  });

  // A source that answered but matched nothing is not live either: that is
  // what a layout change looks like, and it should read as a failure.
  const scoresOk = scores.ok && scoresMatched > 0;
  const weatherOk = weather.ok && weatherMatched > 0;
  const noMatch = "answered, but no game on it matched the schedule";

  return {
    games,
    scores: {
      ok: scoresOk,
      matched: scoresMatched,
      error: scores.ok ? (scoresOk ? undefined : noMatch) : scores.error,
    },
    weather: {
      ok: weatherOk,
      matched: weatherMatched,
      error: weather.ok ? (weatherOk ? undefined : noMatch) : weather.error,
    },
    live: scoresOk,
    updated: scoresOk ? easternDate(new Date(scores.at)) : SCHEDULE_UPDATED,
    pulledAt: scoresOk ? easternTime(new Date(scores.at)) : undefined,
    inWindow,
  };
}
