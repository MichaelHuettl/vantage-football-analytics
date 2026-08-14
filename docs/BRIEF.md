# Vantage Football Analytics — project brief

The source of truth for the `§` references throughout the codebase. Comments
cite these section numbers to explain *why* code is the way it is; without this
file those citations are dangling.

Where the built site departs from this brief, the departure and its reason are
recorded in `docs/STATE.md` and in the relevant commit message. **This document
is the original brief, not a description of what was built.**

---

## 1. Project

Fantasy football and NFL analytics site, run by a solo operator with a finance
and risk background who builds his own analytics in Python.

**Audience.** Serious redraft and dynasty players who already know what a target
share is, comparison-shopping against FantasyPros, Sharp Football, Fantasy Life,
PlayerProfiler and 4for4. They do not need "what is PPR" explained.

**The differentiator.** Most fantasy sites publish rankings and ask you to take
them on faith. Vantage publishes the opportunity metrics underneath and shows
where the ranking disagrees with the data. Rankings are a conclusion; you should
be able to audit the argument.

**Not.** A league host, lineup optimiser, social platform, or subscription
product. No user accounts in v1.

## 2. Hard constraints

Legal and licensing boundaries, not stylistic preferences.

- **No NFL team logos, helmet marks, wordmarks, or the shield.** Teams are
  represented by their colour pair plus a three-letter abbreviation, from a
  `teams.json` of `{abbr, city, nickname, primary, secondary}`.
- **No player photography without a licensed source.** Design for
  initials-in-a-shape avatars or position-coloured placeholders from the start.
- **No hosted game footage.** All-22 and broadcast film are NFL-owned. Film
  content is built from (a) embeds of official or verified posts, (b) links out,
  and (c) self-drawn play diagrams from coordinate data. (c) is primary.
- **No licensed data on the public site.** PFF Premium, Fantasy Points, FTN and
  4for4 are licensed for private use. Republishing their columns, or derived
  values that reconstruct them, violates those terms. Keep licensed data in a
  gitignored directory the build cannot read, enforced in code.
- **News: aggregate headline, source, timestamp and link. Never article body
  text.** Any summary must be original and materially shorter. Prefer official
  primary sources. Do not scrape a site that offers a feed or export.

> **Amended during the build.** The operator lifted the photography and
> copyright restrictions for this portfolio, which is non-commercial and
> educational. See `docs/STATE.md`. The no-logo and no-body-text rules still
> hold.

## 3. Stack

Python pipeline (nflreadpy/polars/duckdb) → versioned JSON in `public/data/` →
Next.js App Router + TypeScript → Tailwind with a token layer → visx or Recharts
→ MDX for long-form → GitHub Actions cron → Vercel or Cloudflare Pages.

**The load-bearing rule: the pipeline computes, the site renders.** If a React
component is computing a metric, the metric belongs in the pipeline. This keeps
numbers consistent across the site, charts and any future newsletter, and makes
metric changes testable.

## 4. Data

### 4.1 Artifacts
`teams.json`, `players.json`, `weekly.json`, `seasonal.json`, `rankings.json`,
`injuries.json`, `schedule.json`, `weather.json`, `news.json`, `film.json` —
each wrapped in a `{schema_version, generated_at, data}` envelope so a stale or
mismatched build fails loudly rather than rendering garbage.

### 4.2 Metrics
Implement each as a tested pure function. Do not invent alternative definitions.

- **HVT/G** — high-value touches per game: targets plus carries inside the
  opponent 10, divided by games played.
- **TPRR** — targets per route run.
- **Route participation** — routes run ÷ team dropbacks while on field.
- **Trapezoid of excellence** — TPRR against route participation, productive
  region bounded as a trapezoid rather than a quadrant.
- **WOPR** — decomposed and displayed as target share and air yards share, not
  only as the composite.
- **YBC / YAC split** — for backs, separating line environment from talent.

Every metric on screen must resolve to a glossary entry giving a one-sentence
definition and what a good value looks like. The glossary is a real page.

### 4.3 Sources
nflverse via nflreadpy for play-by-play, rosters, schedules, snap counts and
injuries. Betting lines from nflverse schedules. Weather from Open-Meteo, joined
on stadium coordinates, short-circuiting on roof. News from team and beat RSS.

## 5. Sections

**5.1 Rankings** — position tabs and format toggle, both in the URL so a
ranking is linkable. Tier bands rendered as visual groupings: *tiers are the
actual product — the difference between RB14 and RB17 is noise, the difference
between tiers is not.* Every row links to its player page.

**5.2 Position analysis** — one page per position: methodology statement,
signature chart, and the players who stand out for and against. Charts must be
readable, not decorative: median crosshairs, labelled regions, direct labels
rather than a legend, and a plain-language caption stating the one thing the
chart shows. *If a reader cannot state the takeaway after five seconds, the
chart has failed.*

**5.3 Injuries** — league-wide table with Wed/Thu/Fri practice participation,
filters, per-player designation timelines, and a "changed since your last visit"
marker using local storage. *Explicit non-goal: do not predict return dates or
assign probability of playing. That is a medical claim, you are not qualified to
make it, and being wrong publicly is a credibility cost you cannot recover.*

**5.4 Film** — play diagram viewer drawn as SVG from coordinates, a concept
library, and player route trees. Embeds are supplements, never primary.

**5.5 Game tracker** — one page per week: kickoff, venue and roof, spread and
total, **implied team totals**, weather for outdoor games, and the designations
that matter. Implied totals are the most actionable number and most sites bury
them.

**5.6 News** — reverse-chronological, filterable by team, position and category,
tagged to players, linking out.

**5.7 Player pages** — not a tab, but the connective tissue. Every player
reference anywhere links here.

## 6. Components

`TeamChip`, `PlayerLink`, `MetricValue`, `TierBand`, `ScatterChart`,
`SparkTrend`, `InjuryTimeline`, `GameCard`, `WeatherBadge`, `NewsItem`,
`PlayDiagram`, `DataFreshness`.

*DataFreshness is not decoration. A site whose whole pitch is rigour must always
tell the reader how old the number is.*

## 7. Design system

The brand already exists. Do not redesign it; implement it.

```
--vantage-black:  #0F1318
--vantage-panel:  #101318
--vantage-amber:  #EF9F27
--vantage-white:  #FFFFFF
```

Tokens are the single source of truth — **no arbitrary hex values in
components.** Extend with a neutral ramp and a small categorical palette.

**Amber is reserved.** It marks the highlighted data point, the current week,
the player being viewed. *If amber appears on a button, a border and a chart
series on the same screen, it has stopped meaning anything.*

**Type.** Anton for display, used sparingly and large. Barlow Condensed for
labels and dense table headers, with a normal-width companion for reading text.
Tabular numbers everywhere a number appears in a column.

**The signature element.** The logo mark is a goalpost whose crossbar is a chart
axis. The primary chart container uses an inverted-U frame — two verticals and a
baseline — instead of a box or gridded plot area. *Used consistently, this makes
a Vantage chart identifiable in a screenshot on Twitter, which is the single
highest-leverage design decision on this site. Do not use it for every chart,
only the featured one on each page, or it becomes wallpaper.*

**Quality floor.** Responsive to 360px, visible keyboard focus,
`prefers-reduced-motion` respected, tables usable on mobile without horizontal
scrolling the page, and **colour never the sole carrier of meaning**.

## 8. Voice

Write like an analyst talking to a peer. Sentence case in headings. Active
voice. No hype adjectives — "elite", "league-winning", "smash play" are banned.
State the number and what it means, in that order. Where the model disagrees
with consensus, say so plainly and give the reason. **Empty states are
directions, not apologies.** Errors say what happened and what to do. Every
ranking note is one sentence containing a fact, not a vibe.

## 9. Build phases

1. Pipeline skeleton · 2. Metrics layer · 3. Site shell and design system ·
4. Charts and player pages · 5. Rankings, injuries, game tracker · 6. News and
film. Then: Actions scheduling, error alerting, staleness banners.

## 10. Definition of done

Lighthouse above 90 on rankings with real data volume · no layout shift on
data-backed tables · every metric resolves to a glossary definition · every
data-backed page shows its freshness timestamp · pipeline failures surface
visibly rather than silently serving stale JSON · no licensed data, team logo,
player photograph or article body text anywhere in the repository.

## 11. What not to do

No user accounts, comments or forum in v1 · no lineup optimiser or trade
calculator until the analytical core is finished — *every competitor has one and
they are not why anyone would come here* · do not scrape a site that offers a
feed · **do not add a second accent colour** · do not auto-generate written
analysis and publish it under the operator's name · no third-party API before
the site is finished · **do not let a React component compute a metric**.
