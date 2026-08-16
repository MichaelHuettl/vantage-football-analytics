# Project state

Read `docs/BRIEF.md` first — it defines the `§` references in code comments.
This file records where the build actually is, what was decided against the
brief, and what is still open.

Last updated: 2026-08-15.

---

## What the site is

**Not what §3 describes.** There is no Python pipeline. The operator already
has his analytics in a workbook, so v1 is the site: hand-authored JSON in
`src/data/` plus PNG charts, rendered by Next.js. §11's rule still holds —
no React component computes a metric.

Content lives in `src/data/` rather than `public/data/` deliberately: files
under `src/` are typechecked and bundled, so a stray comma fails `npm run
build` with a line number instead of shipping a broken page.

| Section | State |
| --- | --- |
| Home | Built. Lambeau hero, section cards, Walsh "audit the argument" band |
| Rankings | **Live with real data** — 120 players, 6 positions, PPR draft ranks |
| Positions | Six pages. **RB and K are built** — one column: methodology, then the evidence. WR/TE/QB/DST keep the two-column slot-and-pool layout |
| Injuries | Training camp section live (49 entries), team filter in the URL. Weekly report empty until Week 1 |
| Film | Three concepts with SVG diagrams, by-team index |
| Games | **All 18 weeks navigable** — 272 matchups, week selector, key players per team. Lines/scores/weather come from `npm run games` |
| News | **Live, but refreshed by hand** — RSS headlines + 118-post beat archive. The cron cannot run yet; see open item 1 |
| Player pages | 120 generated. Chart slots empty |
| Glossary | Built |

## Departures from the brief, and why

- **TPRR, route participation and the trapezoid are cut** (§4.2, §5.2). No open
  source publishes routes run — `nflreadpy` has no loader, and nflverse's
  participation data is FTN-sourced and does not update in-season. The operator
  has the numbers via 4for4 for private use, but §2 forbids republishing them.
  WR uses target share against air yards share; TE uses snap share against
  target share.
- **Tiers and the format toggle are removed** (§5.1). The workbook has neither —
  one list per position, no tier bands. Inventing them would be the opposite of
  what this site argues for. `TierBand` was deleted; it is in git history and is
  a small rebuild when tier data exists.
- **Photography and copyright restrictions lifted** (§2, §10). The operator's
  decision: this is a non-commercial, educational portfolio. Player headshots,
  stadium and coach photography are in use, with a disclaimer in the footer
  covering NFL non-affiliation, non-commercial purpose, and photo takedown on
  request. **The no-logo rule still holds** — teams are still colour-plus-
  abbreviation, and `TeamChip` computes its text colour from luminance.
- **Return timelines are reported, never estimated** (§5.3). Injury records
  carry a `timeline` only alongside an `attribution`. Reporting that a coach
  said Week 1 is journalism; asserting a return date is the medical claim the
  brief rules out.

## Open items

1. **The news cron has never run, because the repo has no git remote.**
   `.github/workflows/news.yml` is correct and committed, but GitHub Actions
   only runs on GitHub, and `git remote -v` is empty — the repo is local-only.
   So the feeds refresh exactly when someone types `npm run news` and
   `npm run beat`, and not otherwise. Both scripts were verified working on
   2026-08-14 (four of four RSS feeds, 34 of 34 beat accounts), so this is a
   plumbing gap, not a code fault. Fixing it means pushing to GitHub and
   enabling Actions; until then the section is as fresh as the last manual run.
   A local `launchd` timer is the alternative if the repo stays private.
2. **Charts.** RB is done and is the pattern to copy: `scripts/curated/
   rb_charts.py` reads the workbook and writes `src/data/rb-charts.json`,
   `ScatterChart` and `RankTable` render it, `RunningBackAnalysis` assembles
   it. WR/TE is the obvious next one — six of the workbook's eleven charts are
   on that sheet. The other positions still show the PNG slot.
   - **The scatters compute nothing.** Medians, extents, which points get a
     name, and the order they are placed in all come out of the Python (§11).
   - **Every point is named.** `ScatterChart` tries thirty positions per label
     — six directions at five distances — and draws a leader line for anything
     past the inner ring. All 170 points across the four charts are named with
     no overlap; if a future chart is denser than this one, the placement drops
     the lowest-ranked name rather than overlapping, and its dot stays.
   - **The historic block is a table, not a chart.** Thirteen measures do not
     fit on two axes, and the rank and age columns are the ones that change a
     read. Emphasis is marked in the Python against each column's own
     quartiles, with the sense flipped for the two rank columns so bold always
     means good; amber is the single best value in a column, eleven cells in
     the whole table.
   - **Kicker is built from the (3) workbook's new "Defense and Kicker Stats"
     sheet** via `scripts/curated/kicker_charts.py`: team FG attempts 2021-25
     (top 16 and bottom 5), kicker scoring 2023-25, the five situational
     advantage columns, and the operator's shortlist in his own words. Defense
     is on the same sheet and **not built yet** — see item 7.
   - **The kicker persistence analysis is computed and deliberately not
     shown.** Neither of the workbook's ranked lists survives the year: a
     top-16 drawn from 32 teams repeats 8/16 by chance, and team FG attempts
     retained 7, 9, 9, 8 while kicker top-16 retained 8 and 9. Only Aubrey,
     Dicker, McLaughlin and Myers made the kicker top 16 in all three years,
     and Aubrey did it at 10.4, 10.5, 10.4 points per game. It was raised, and
     the operator's decision was to leave it off and keep his own reasoning
     verbatim. The numbers stay in `kicker-charts.json` under
     `scoring.retention`, `fg_attempts.retention` and `scoring.persistent`, so
     rendering them later is a component away rather than a rediscovery.
   - **Kicker page** is driven by `scripts/curated/kicker_charts.py` from the
     workbook's "Defense and Kicker Stats" sheet. Seven sections in a fixed
     order: the value case, the top-half/bottom-half split, then the workbook's
     three reference blocks in full — five years of team FG attempt ranks, three
     years of kicker scoring, and all six situational advantage columns — then
     the board. **The workbook blocks are the point of the page, not supporting
     material.** A first pass rendered only the analysis and the board and left
     all three tables in the JSON unrendered; from the operator's side that read
     as his data having been deleted. `KickerData.tsx` holds them.
     The top three carry his own write-up verbatim, joined from the sheet by
     surname; the value picks have no write-up there, so a one-line case stands
     in. Games played are derived as points ÷ points-per-game, the only route to
     them in that sheet, landing within a tenth of an integer on every row.
   - **Every kicker on the kicker page carries a team chip, and the scoring
     tables use the team he kicked for *that season*.** Current teams would
     misattribute eight of the 29: Jason Sanders was in Miami rather than the
     Jets, Matt Gay in Indianapolis rather than Las Vegas, Blake Grupe in New
     Orleans, and Carlson, Koo, Zuerlein, Hopkins and McManus have since moved
     or left the league. `SEASON_TEAM` in `kicker_charts.py` holds the verified
     mapping, taken from nflverse season rosters; it is historical and fixed, so
     it is embedded rather than fetched. A kicker with no club gets an FA marker
     rather than a stale chip.
   - **The ranked tables shade red-to-green** at the operator's request, built
     from the four status tokens rather than pure red and green so the ramp
     also varies in lightness. The number is printed in every cell, so §7's
     "colour is never the sole carrier" still holds.
   - **The workbook's own conclusions are transcribed by hand** into
     `RunningBackAnalysis.tsx` rather than the JSON, because they are writing
     rather than data.
3. **Games is fetched, not authored, and nothing schedules the fetch.**
   `npm run games` fills lines, implied totals, scores, per-team leaders and
   weather; by default it does the weeks with a game between 7 days ago and 14
   days ahead, so in season it is a weekly command. Like the news feeds, it
   only runs when someone runs it — see item 1. Week 1 lines are loaded;
   everything else waits on the season. The defensive leader is ESPN's sack
   leader, falling back to tackles: neither is "who decided it", so it is worth
   overriding by hand on a game that turned on one play.
4. **Daniel Carlson is ranked K16 and unsigned.** The data now says so —
   `status: "fa"`, no team, an FA chip where the team chip goes — but whether
   an unsigned kicker belongs on a draft board at all is an editorial call, not
   a data one. Left as ranked.
5. **Re-run `npm run audit-teams` after the cutdown to 53.** Rosters move
   through the preseason; the audit below is true as of 2026-08-14 and nothing
   keeps it true.
6. **News tags only players in `players.json`, and nothing links news to the
   injury page.** `players.json` holds the 120 ranked players, so a headline
   about anyone else is stored and displayed but tagged to nobody and has no
   player page. Separately, `camp-injuries.json` is hand-authored and keyed by
   name, so even a player tracked there gets no automatic link from a matching
   headline. Jordyn Tyson is the live example: three injury headlines and four
   beat posts on 2026-08-14, zero news tags, while his camp record sat at the
   2026-08-12 wording until it was updated by hand. The gap is not that the
   news is missing — it is that a fresher headline never nudges the injury
   record, so the two can disagree on screen.
7. **Defense is not built.** The (3) workbook's "Defense and Kicker Stats"
   sheet carries far more than the kicker half that is live: 2025 defensive
   scoring, seven ranked leader columns (sacks, interceptions, forced fumbles,
   pressure rate, EPA/pass allowed, pass success rate, defensive EPA/play),
   simulated-pressure and box-rate tables, a per-team offseason departures and
   additions block for ten defenses, and three separate strength-of-schedule
   rankings that disagree with each other. `kicker_charts.py` reads the same
   sheet and is the place to extend.
8. **Nitter is fragile.** The beat feed goes through it because X has no free
   read API. X blocks it periodically. `fetch-beat.mjs` tries multiple
   instances, never wipes data on failure, and is `continue-on-error` in CI, so
   an outage makes the section stale rather than empty. If it stops updating,
   that is the first thing to check.

## Closed items

- **Team data is audited (2026-08-14).** All 100 non-DST players were checked
  against Sleeper's public roster endpoint by `scripts/audit-teams.mjs`; the 20
  defences carry their own team by construction. Every name matched on name
  plus position with no ambiguous or unmatched records, and each of the six
  disagreements was confirmed against a second source before it was changed:
  Kyler Murray ARI → MIN, Kenneth Walker SEA → KC, Travis Etienne JAX → NO,
  Isaiah Likely BAL → NYG, Chig Okonkwo TEN → WAS, and Daniel Carlson LV →
  unsigned. The previously confirmed pair (AJ Brown → NE, Jaylen Waddle → DEN)
  came back as agreements, which is what made the source credible. Bye weeks
  follow from team, so all six rankings rows changed bye as well — five to a
  different week, Carlson's to none.
- **Both contradicted injury records are corrected (2026-08-14).** Puka Nacua
  now reads psoas soreness in the hip flexor, with McVay's "back at practice
  next week" attributed to him. Jeremiyah Love has a record: ankle, hurt in the
  August 13 preseason opener, with LaFleur's hope for practice this week
  attributed to him. Neither carries a timeline this site invented (§5.3).

## Source materials (outside the repo)

| What | Where |
| --- | --- |
| Analytics workbook | `~/Downloads/2026-2027 Fantasy Football Analytics (Original) (1).xlsx` |
| Rankings source | Sheet 2 "Mock Drafts & Rankings", rows 80–99, cols B–G, labelled **"My Rankings (WIP)"** |
| Injury source | Sheet 11 "Key Injuries" — rehab block rows 3–72, camp block rows 74–91 |
| X screenshots | Sheet 10 "Offseason News" — 117 images in 32 team columns |
| Headshots | `~/Desktop/Player Photos/` — 100 transparent cutouts by position |
| Photography | `~/Desktop/Claude Code/` and `Thumbnails copy/` |

**Keep player photos and competitor logos out of the repo.** The working
directory holds ESPN/Yahoo/Sleeper/Underdog marks and 46 player thumbnails; the
site was scaffolded into `vantage/` specifically so those stay outside it.

## Decisions worth not relitigating

- **The kicker persistence analysis is published only in part, on purpose.**
  Testing the workbook's kicker lists against a chance baseline found that team
  field goal volume has no year-over-year signal (mean 8.25 of 16 retained
  against a null of 8), and that the low-red-zone-TD and low-4th-down lists do
  not predict field goal attempts. The operator read those findings and chose
  to keep them off the site. They remain computed in `kicker-charts.json`
  (`fg_attempts.retention`, `.swings`, `.null`) so the work is not lost and the
  section can be built in an afternoon if he changes his mind. What *is*
  published is the top-half/bottom-half split, which is the finding he wanted.
- **The 2021 and 2023 field goal attempt columns are corrected in the script,
  not in the workbook.** The sheet listed four teams in both the top 16 and the
  bottom 5 of the same season — Chargers in 2021, and Bears, 49ers and Bills in
  2023 — which cannot both be true. The operator supplied replacement columns
  for both years; they live in `CORRECTIONS` at the top of
  `kicker_charts.py` so they survive a re-extraction, and the script validates
  each one (16 and 5 entries, 21 distinct teams, no overlap, every name a real
  club) and exits rather than storing a correction that does not reconcile.
  All five years now reconcile and `fg_attempts.contradictions` is empty.
  **When the workbook itself is fixed, delete the entry** — the script prints
  "correction now matches the workbook" once it has become redundant.
- **Chase McLaughlin is on the kicker board but not in `players.json`.** He has
  no player page and no headshot, so his card falls back to initials. Adding
  him means adding a 21st kicker to the K rankings, which is a ranking decision
  rather than a data fix.

## Gotchas

- **Do not trust a sheet's name for where its data is.** The "Historic RB 1-3"
  table — 27 top-three finishes back to 2017, with the quartiles and both tier
  benchmarks under it — sits at **row 260 of "RB Statistics & Graphs"**, not on
  "Historical 2025 Fantasy Stats", which is an empty template of 17 blank week
  grids. Searching the named sheet and stopping there produced a confident and
  wrong "the data does not exist". Search `sharedStrings.xml` for the heading
  and then find the cell that references it.
- **`el.clear()` on every element breaks `iterparse` searches.** A scan written
  that way silently found nothing in a sheet that did contain the string. Clear
  rows, not every node, or grep the raw XML to confirm a negative.
- **A number over about a thousand in a rate or rank cell is a date serial.**
  The Value-RB "Team Rank" reads 46315, which is 2026-10-05 as an Excel date.
  `rb_charts.py` drops values that large rather than printing them.

- **This machine creates macOS `"file 2.ext"` duplicates.** They have appeared
  as orphaned headshots and as `.next/types/* 2.ts` files that broke `tsc`.
  `.gitignore` catches them; if `tsc` reports duplicate-identifier errors in
  `.next`, delete them and rebuild.
- **`sips -Z` upscales.** It once turned a 680px/32KB image into 2400px/427KB
  of interpolation. Always cap at the source width.
- **Player names collide.** The league has two Kenneth Walkers and two Josh
  Allens. Any match against an outside roster has to agree on position as well
  as name, and report what is still ambiguous rather than pick — a plausible
  wrong match is worse than a gap. `scripts/audit-teams.mjs` does this.
- **Smart punctuation breaks naive regex.** A filter written with `'` missed
  `'`. `scripts/lib/signal.mjs` normalises before matching; do the same
  anywhere else text is pattern-matched.
- **Licensed route-run data is published on the RB page, deliberately.**
  Route participation and targets per route run come from 4for4 and §2 forbids
  republishing them; they were cut for that reason and the cut is recorded
  above. The operator reinstated the third RB chart knowingly after the
  conflict was raised. The decision is his and it is scoped to that chart —
  it is not a general licence to publish licensed columns.
- **Implied totals are quarters, so they carry two decimals.** Totals and
  spreads move in halves and the implied totals are halves of those: a 49.5
  total on a 7-point spread is exactly 21.25 and 28.25. Rounded to a tenth they
  print as 21.3 and 28.3, which sum to 49.6 — a reader adding the two numbers
  catches the site out on the total shown next to them. `points()` in
  `GameCard` shows a tenth normally and a hundredth when the value is a quarter.
- **Geocoding a stadium by city name is not safe.** "Saint-Denis" resolves to
  Réunion, in the Indian Ocean, not the Paris suburb — it would have put
  tropical weather on Stade de France. Coordinates are stored in
  `stadiums.json`, resolved once and checked, rather than looked up per run.
- **nflverse marks open-air international grounds as domes.** Melbourne, the
  Maracanã, Stade de France, Munich and Estadio Banorte all come through as
  `dome`, and the Bernabéu comes through blank. `schedule.json` corrects them
  to outdoor, and the Bernabéu to retractable. This matters because weather
  short-circuits on roof (§4.3): taking the feed at face value would have
  printed "weather is not a factor" over a game at a cricket ground. Anything
  re-deriving roofs from nflverse has to redo these corrections.
- **Week 1 2026 really does open on a Wednesday.** NE at SEA is 8:20pm ET on
  Wednesday Sep 9, and SF plays LAR at the Melbourne Cricket Ground on the
  Thursday. Both looked like data errors and both were confirmed against ESPN
  and nflverse independently, which agree on all 16 matchups and every kickoff
  time. Do not "fix" them.
- **Date the data in Eastern, not UTC.** `new Date().toISOString()` gives the
  UTC date, so an evening run stamped tomorrow — the news page read "updated
  Aug 15" at 9pm on Aug 14. A freshness stamp in the future is the exact
  failure §6 exists to prevent, and CI runners being UTC would have made it
  every evening. Use `stampDate()` from `scripts/lib/today.mjs`.
- The operator is American — **use American spellings in user-facing copy.**
  Several British spellings had to be removed.

## Commands

```
npm run dev            # localhost:3000
npm run build          # also typechecks; a bad data edit fails here
npm run news           # pull RSS headlines
npm run beat           # pull X posts via Nitter
npm run draft-injury <url>   # draft injury records for review, writes nothing
npm run audit-teams          # check every team against the live roster, writes nothing
npm run games                # lines, scores, leaders, weather for the current window
npm run games -- --week=5    # one week
npm run games -- --all       # the whole season
npm run games:dry            # read and report, write nothing
```

`scripts/curated/` re-runs the workbook screenshot → OCR → JSON pipeline; see
its README.
