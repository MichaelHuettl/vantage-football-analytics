/**
 * Parsers for the game tracker's two live sources, kept free of any runtime
 * import so they can be tested against saved pages with plain `node`.
 *
 * Both sources are HTML, not an API. Neither CBS nor nflweather publishes a
 * feed for this, so §11's "do not scrape a site that offers a feed" is not
 * crossed, and both robots.txt files were read on 2026-09-19 before any of
 * this was written: CBS disallows nothing under `/nfl/scoreboard/` for a
 * general agent (it blocks GPTBot by name and nobody else), and nflweather's
 * robots.txt has no rules at all.
 *
 * ESPN, which this section used to read, is not used any more. Its robots.txt
 * names `anthropic-ai` with `Disallow: /` and its API host refuses to serve a
 * robots.txt at all — the same standing call recorded for ESPN in
 * docs/STATE.md.
 *
 * Scraping HTML is brittle by nature, so every field is optional and the
 * caller treats a missing one as "not reported" rather than zero. A layout
 * change degrades the tracker to the committed schedule; it does not break the
 * page.
 */

export type GameState = "pre" | "live" | "final";

export interface CbsGame {
  /** Site abbreviations, after `CBS_TEAM` is applied. */
  away: string;
  home: string;
  /** YYYYMMDD, Eastern, from the card's own id. */
  date: string;
  state: GameState;
  /** "3rd 5:21", "Halftime", "Final", "Final/OT". Absent before kickoff. */
  detail?: string;
  score?: { away: number; home: number };
  /** Negative favours the home side, the convention `schedule.json` uses. */
  spread_line?: number;
  total_line?: number;
}

export interface WeatherGame {
  /** Lowercase nickname slugs as nflweather writes them: "dolphins", "49ers". */
  away: string;
  home: string;
  /** nflweather's dome marking. Means "played indoors", roof type aside. */
  dome: boolean;
  temp_f?: number;
  summary?: string;
  wind_mph?: number;
  wind_dir?: string;
  precip_pct?: number;
}

/** CBS writes Jacksonville as JAC; every other club matches teams.json. */
export const CBS_TEAM: Record<string, string> = { JAC: "JAX" };

/** nflweather slugs Washington by city, not nickname. */
export const NFLW_TEAM: Record<string, string> = { washington: "commanders" };

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const num = (s: string | undefined) => {
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * One cell of a CBS pregame card's odds column.
 *
 * Checked on all fifteen pregame cards of Week 2: the away row always carries
 * the total ("o43.5") and the home row the home side's spread ("-8.5"). That
 * is read by content, not position, so a card that swapped them would still
 * parse — a total is whatever starts with o or u.
 */
function readOdds(away?: string, home?: string) {
  const out: { spread_line?: number; total_line?: number } = {};
  for (const [cell, side] of [
    [away, "away"],
    [home, "home"],
  ] as const) {
    const c = cell?.trim();
    if (!c) continue;
    const total = c.match(/^[ou]\s*(\d+(?:\.\d+)?)$/i);
    if (total) {
      out.total_line = num(total[1]);
      continue;
    }
    if (/^(pk|even)$/i.test(c)) {
      out.spread_line = 0;
      continue;
    }
    const spread = num(c.replace(/^\+/, ""));
    if (spread !== undefined) {
      // Store from the home side's point of view whichever row carried it.
      out.spread_line = side === "home" ? spread : -spread;
    }
  }
  return out;
}

/** Every game card on a CBS week scoreboard. */
export function parseCbsScoreboard(html: string): CbsGame[] {
  const games: CbsGame[] = [];
  for (const card of html.split(/(?=<div id="game-\d+")/).slice(1)) {
    const id = card.match(/data-abbrev="NFL_(\d{8})_([A-Z]+)@([A-Z]+)"/);
    if (!id) continue;
    const cls = card.match(/class="single-score-card nfl ([a-z-]+)/)?.[1] ?? "";
    const state: GameState =
      cls === "pregame" ? "pre" : cls === "postgame" ? "final" : "live";

    const statusHtml = card.match(
      /<div class="game-status[^"]*">([\s\S]*?)<div class="broadcaster/,
    )?.[1];
    const status = statusHtml ? text(statusHtml) : "";

    const totals = [...card.matchAll(/<td class="total">\s*(\d+)\s*<\/td>/g)].map(
      (m) => Number(m[1]),
    );

    const game: CbsGame = {
      away: CBS_TEAM[id[2]] ?? id[2],
      home: CBS_TEAM[id[3]] ?? id[3],
      date: id[1],
      state,
    };
    if (state !== "pre" && totals.length === 2) {
      game.score = { away: totals[0], home: totals[1] };
    }
    if (state === "final") {
      // "final" or "final/ot" on the card; title-cased for the page.
      game.detail = status
        ? status.replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\/Ot\b/, "/OT")
        : "Final";
    } else if (state === "live" && status) {
      game.detail = status;
    }
    if (state === "pre") {
      Object.assign(
        game,
        readOdds(
          card.match(/in-progress-odds-away">\s*([^<]*?)\s*</)?.[1],
          card.match(/in-progress-odds-home">\s*([^<]*?)\s*</)?.[1],
        ),
      );
    }
    games.push(game);
  }
  return games;
}

/** Every game on an nflweather week page. */
export function parseNflWeather(html: string): WeatherGame[] {
  const games: WeatherGame[] = [];
  // Each game's block opens with its kickoff/status column. Checked against
  // Week 2: splitting there puts every forecast with its own matchup, and the
  // four dome markings land on exactly the site's four retractable venues,
  // which a block misaligned by one would not.
  for (const block of html
    .split(/(?=<div class="col-12 col-lg-2 text-center py-lg-0 game-kickoff-status)/)
    .slice(1)) {
    const slug = block.match(/href="\/games\/\d{4}\/week-\d+\/([a-z0-9]+)-at-([a-z0-9]+)"/);
    if (!slug) continue;
    const g: WeatherGame = {
      away: NFLW_TEAM[slug[1]] ?? slug[1],
      home: NFLW_TEAM[slug[2]] ?? slug[2],
      dome: /\/climates\/dome\.png/.test(block),
    };
    const temp = block.match(/>\s*(-?\d+)\s*(?:°|&deg;|&#176;)\s*F\s*</);
    if (temp) g.temp_f = Number(temp[1]);
    const summary = block.match(
      /(?:°|&deg;|&#176;)\s*F\s*<\/span>\s*<\/div>\s*<div class='mx-2'>\s*<span[^>]*>\s*([^<]+?)\s*<\/span>/,
    );
    if (summary) g.summary = text(summary[1]);
    const wind = block.match(
      /(\d+)\s*mph\s*(?:&nbsp;)?\s*<span class="material-icons[^"]*">[a-z_]+<\/span>\s*(?:&nbsp;)?\s*([NSEW]{1,3})\b/,
    );
    if (wind) {
      g.wind_mph = Number(wind[1]);
      g.wind_dir = wind[2];
    }
    const precip = block.match(/precip-prob[^>]*>\s*<b>\s*(\d+)%/);
    if (precip) g.precip_pct = Number(precip[1]);
    games.push(g);
  }
  return games;
}

/**
 * Implied team totals, ported verbatim from scripts/fetch-games.mjs so the
 * live pull and the committed schedule agree to the cent.
 *
 * Two decimals, not one. Totals and spreads move in halves, so their halves
 * are quarters: 49.5 on a 7-point spread is exactly 21.25 and 28.25, and
 * rounding those to 21.3 and 28.3 makes the pair sum to 49.6 on the card.
 */
export function impliedTotals(spread?: number, total?: number) {
  if (spread === undefined || total === undefined) return undefined;
  return {
    away: +(total / 2 + spread / 2).toFixed(2),
    home: +(total / 2 - spread / 2).toFixed(2),
  };
}
