# Project state

Read `docs/BRIEF.md` first — it defines the `§` references in code comments.
This file records where the build actually is, what was decided against the
brief, and what is still open.

Last updated: 2026-09-19.

---

## Start here

If you are picking this up cold, in this order:

0. **`docs/HANDOFF.md`** — the most recent session's handoff: what changed, the
   findings that changed what the site claims, and the traps that cost that
   session real time. Shorter than this file and written to be read first.
1. **`docs/BRIEF.md`** — the brief. Every `§` in the codebase points at it.
2. **This file** — what is built, what was decided, what is still open.
3. **`git log`** — every change carries its reasoning in the commit message.
   `git log --oneline -30` is a faster history than any summary of it.

**The workbook is the source and it is versioned.** The newest is
`~/Downloads/2026-2027 Vantage Football Analytics (Original).xlsx`, the first
named "Vantage" rather than "Fantasy"; only `weekly_rankings.py` reads it so
far. The chart extractors still name
`~/Downloads/2026-2027 Fantasy Football Analytics (Original) (4).xlsx`, and
`rb_charts.py` the `(2)` before it (open item 10).
Each new version the operator sends is a new file, and **sheet numbers and row
numbers both shift between them** — the (4) sheet inserted success-rate and
DVOA blocks at rows 115-146 and pushed everything below down, and moved a
coverage column from F to G. Every extractor names the version it targets in
`DEFAULT_WB`; when a new one arrives, re-run each script and read the row map
before trusting the output.

**Thirteen extractors feed the site** and write JSON into `src/data/`. Six read
the workbook; the rest read a PDF, the nflverse export, the prediction
pipeline, hand transcriptions or the film data. `wr_charts.py` reads both the
workbook and the nflverse export:

| Script | Writes | Covers |
| --- | --- | --- |
| `scripts/curated/rb_charts.py` | `rb-charts.json` | RB scatters, historic RB 1-3, opportunity share |
| `scripts/curated/kicker_charts.py` | `kicker-charts.json` | FG attempts, kicker scoring, advantages, board |
| `scripts/curated/defense_charts.py` | `defense-charts.json` | 9 defense blocks + coordinators |
| `scripts/curated/te_charts.py` | `te-charts.json` | 5 TE scatters, history, TE1-3/4-6 grids |
| `scripts/curated/wr_charts.py` | `wr-charts.json` | 3 WR scatters, stickiness and consistency (**also reads the nflverse export**), check-the-box grid with fitted TD columns, verdicts |
| `scripts/curated/qb_charts.py` | `qb-charts.json` | 4 QB scatters + correlations (**reads a PDF**) |
| `scripts/curated/player_profiles.py` | `player-profiles.json` | 79 player profiles (**reads the nflverse export**) |
| `scripts/curated/model_misses.py` | `model-misses.json` | Case study: 292 misses, 16 season folds (**reads the pipeline's report + artifacts**) |
| `scripts/curated/fantasy_model.py` | `fantasy-model.json` | Fantasy projections, accuracy, boards (**copies a payload, computes nothing**) |
| `scripts/curated/rb_matchups.py` | `rb-matchups.json` | Run-defence matchup tables, 5 seasons (**hand transcription from screenshots, validated before it emits**) |
| `scripts/curated/game_predictions_full_season.py` | `game-predictions.json` | All 18 weeks of predictions (**runs the peer session's pipeline without editing it**) |
| `scripts/curated/weekly_rankings.py` | `rankings/week-N.json`, `players.json` | Weekly rankings from the **Rankings** sheet of the new "Vantage" workbook, found by name. `--sync-players` adds new players from the nflverse roster CSV and fetches NFL.com headshots |
| `scripts/curated/film_summary.py` | `film-summary-gb-det-2025-w1.json` | "What Green Bay ran", from the film data plus a hand transcription of the plates' grey motion lines |

**One thing is scheduled, and it is busier than it looks.** The repo reached
GitHub on 2026-09-01 (as the private `MichaelHuettl/vantage`; since 2026-09-20
the live repo is the public `MichaelHuettl/vantage-football-analytics`), and
`.github/workflows/news.yml` has run on its 30-minute cron ever since: about 480
commits to `main` by 2026-09-19, each touching only `src/data/news.json`. That
means local `main` falls behind within the hour, and a host that deploys on
push rebuilds about 26 times a day. See open item 21. Everything else runs when
someone types the command, or pulls at request time.

**Published analysis** (private artifacts, shareable from their own pages):
- Kicker: what predicts a kicker — https://claude.ai/code/artifact/659c7318-1074-4920-85ab-5fac3b13cc90
- Defense: which defensive stats carry — https://claude.ai/code/artifact/37da6d18-985e-4faf-872d-9f3056051693

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
| Home | Built. Lambeau hero with **"By Michael Huettl"** under the lockup (also in the footer and metadata, from `src/lib/site.ts`), eight section cards (the count in the copy is read off the card list, not typed beside it), Walsh "audit the argument" band |
| Rankings | **Draft and weekly.** Draft: 120 players, 6 positions, PPR, the operator's hand order. Weekly: Week 1 (updated 2026-09-08) and Week 2 (2026-09-16), up to 25 a position; "Weekly" opens on the latest week. No rest-of-season scope |
| Positional Data | Index cards carry a photo per position in a shared 2:1 frame, and head on `evaluated_on` — the family of statistics a position is judged on — Six pages, and **all six are built** — one column each: methodology, then the evidence. The two-column slot-and-pool placeholder is no longer used by any position |
| Injury Database | **Season tracker pulls live**, and since 2026-09-19 every row carries this week's **NFL injury report** (practice participation, designation, secondary injury) from nflverse's release; a record about an earlier injury leads with the current one and shows the record as "Earlier" — the camp section is now a league-wide table on the news page's pattern, pulled at request time and re-rendered on `AutoRefresh`. The 58 hand-authored records are the floor and merge *under* the wire, never overwritten; a wire status and a written record sit in adjacent columns and the row says so where they disagree. Team filter in the URL. Weekly report empty until Week 1 |
| Film | An in-production notice, then **Lions at Packers, Week 1 2025**: a "What Green Bay ran" summary (call sheet, halves, downs, passing, running, motion, coverage faced) above all 47 plays. Plates are cropped to the field and their info fields printed as text. `PlayDiagram`, `/film/[concept]` and `film-sample.json` are kept but not rendered |
| Game Tracker | **Pulls live** — scores, game state and the current line from CBS, forecasts from nflweather, merged over the 272-game schedule at request time. Opens on the current week by the calendar. See open item 3 |
| News | **Headlines pull live at request time**; 139-post beat archive still refreshed by hand. See open item 1 |
| Fantasy Football Model | **Built**, at `/fantasy-model` — a 1-point-PPR projection model over 153,026 player-weeks, 1999-2025. Four tabs: method, accuracy, the tested 2025 season and the 2026 board. The accuracy tab **opens with a conclusion panel** — what holds up, what does not, and how much room is left against a measured ceiling (an oracle knowing each player's own season median hits 78.5% at the 8-point band; the model reaches 94% of that) — then publishes **hit rates as well as average error**, at two scales. Weekly: 73.5% of startable player-weeks within **8** points against 67.7% for recent form. Season-long: 63.6% of seasons within **40** points against 61.1% for repeating last year, measured **from the model's projection on each player's first row of the season**, which is the only version of that number a drafter could have had. **Both bands were chosen on the size of the edge, not on significance** — see open item 15. `hit_rates.py` in the model repo computes both; the export **fails rather than omits** if it has not run. See open item 14. Every board is scoped to a position and the position is in the URL. The 2026 board **only recommends players with sixteen prior games** and names the 24 it excludes, with the rank each would have held (see open item 13). Payload copied from `~/Desktop/Claude Code/fantasy-model/` |
| Game Prediction Model | **Built**, at `/model` — methodology, confidence tiers, a **case study of every miss**, and a page per game for 16 week-one matchups. Named by the operator on 2026-08-21; the route is the short `/model` rather than the full name. The payload file keeps its `game-predictions.json` name — that is the prediction pipeline's export filename and this repo only copies it |
| Player pages | 168 generated. **79 carry a profile** — season line, Next Gen, year-to-year, game log. The rest say plainly that there is nothing recorded |
| Glossary | **Rebuilt 2026-08-21** — 67 terms in 9 groups, each with a definition, what a good value looks like, its source (nflverse, Next Gen, 4for4, workbook, market, model) and the pages it appears on. It had 6 entries while the home page promised full coverage |

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
  request. **The no-logo rule still holds in the interface** — teams are still
  colour-plus-abbreviation, and `TeamChip` computes its text colour from
  luminance.
  - **One exception, in hero photography only.** The game tracker hero
    (`/img/bg/game-tracker.jpg`, chosen by the operator on 2026-08-21) is a
    promotional composite with the NFL shield at its centre and team marks on
    the jerseys. Nothing in the interface changed — no chip, badge or list gained
    a logo — but CLAUDE.md states the no-logo rule flatly, and this is the one
    place the site now contradicts it. Flagged to the operator when it went in.
    If the rule is meant to cover photography as well, this is the single file to
    swap; `whiteboard.jpg` is free again and is what that page used before.
- **The game tracker's sources are not §4.3's** (§4.3, §5.5). The brief names
  nflverse schedules for lines and Open-Meteo for weather. Since 2026-09-19 the
  tracker pulls scores, state and the current line from CBS and forecasts from
  nflweather at request time, the sources the operator named. ESPN, which the
  old `npm run games` read, is not used on the page: its robots.txt names
  `anthropic-ai` with `Disallow: /`.
- **Return timelines are reported, never estimated** (§5.3). Injury records
  carry a `timeline` only alongside an `attribution`. Reporting that a coach
  said Week 1 is journalism; asserting a return date is the medical claim the
  brief rules out.

## Open items

1. **The news headlines are live; the beat feed still is not.**
   Resolved for headlines on 2026-08-17. `/news` now pulls the four publisher
   RSS feeds at request time (`src/lib/live-news.ts`) and an `AutoRefresh`
   component re-runs the server render every 60s, so an open page keeps up
   without anyone typing a command. **This required lifting §11's "no
   third-party API before the site is finished" — the operator's explicit
   decision**, on the grounds that having to ask for a refresh by hand was the
   worse failure and there was no other fix while the repo has no remote.
   The trade is bounded on purpose:
   - `src/data/news.json` is still the floor. Live items merge *over* it, so a
     feed outage makes the page stale rather than empty (§8), and the archive
     keeps history no single pull returns. `npm run news` still writes it.
   - Publishers are polled at most once per 5 minutes per process, by a TTL
     cache in `live-news.ts` that also shares the in-flight promise. Verified:
     five page loads produced one pull.
   - **The fetches are `cache: "no-store"`, and that is load-bearing.** They
     first used `next: { revalidate: 300 }`, which reads like the polite choice
     and is the wrong one: Next serves a revalidated fetch
     stale-while-revalidate, so the render gets the *previous* response while
     the refresh happens behind it. On a page nobody loads for hours that means
     always being one pull behind — on 2026-08-18 the news page showed Aug 17
     headlines under an Aug 18 date, and the injury wire was a day stale, while
     the same code path called from the script returned 74 items from that day.
     Politeness is the TTL cache's job; freshness is the fetch's. Do not put
     `revalidate` back on these.
   - `live` on the returned object says whether the reader is seeing a live
     pull or the last good archive, and the page prints the difference (§6).
   **The beat feed is unchanged** — still `npm run beat` by hand, still going
   through Nitter. `.github/workflows/news.yml` remains committed and still has
   never run; `scripts/refresh-feeds.sh` is a launchd runner for both scripts,
   written but **not installed** (see the Commands section).
1b. **The injury table itself is now the live wire.** Rebuilt 2026-08-22 on the
   news page's pattern, at the operator's request. `src/lib/injury-tracker.ts`
   pulls Sleeper at request time and `/injuries` re-renders on the same 60s
   `AutoRefresh`. The camp section is gone as a separate thing: it is the
   league-wide season tracker, and the 58 hand-authored records are its floor.
   - **Records merge *under* the wire and are never overwritten.** A wire status
     is a coarse designation; a record is reporting with a diagnosis and, only
     ever with an attribution, a timeline (§5.3). Both sit in adjacent columns
     and the row prints the disagreement where they cannot both be true.
     `WireStatusPill` is outlined where `CampStatusPill` is filled so the two
     never read as the same kind of claim.
   - **A record the wire has stopped carrying still shows** — 21 of them on the
     first run. The archive is the floor, so an outage makes the table stale
     rather than empty (§8), and `live` says which the reader is looking at.
   - **One Sleeper pull per window.** The first version ran the old
     reconciliation beside the new tracker and fetched the fourteen-megabyte
     player file twice per render. `live-injuries.ts` and `LiveWire.tsx` were
     deleted rather than left dead — the tracker reconciles inline on every row,
     so that section's conflict and "not in the report" lists were duplicating
     the table above them. Headlines kept their own light puller.
   - **There is no relevance cutoff any more (2026-08-27).** It sat at Sleeper
     search rank 400 and was hiding **90 of the 158** designated skill players,
     36 of them on a serious status — Graham Mertz on IR with an ACL, Julian
     Hill on IR, Kurtis Rourke with ribs. The operator's call is that position
     is the filter and popularity is not, so every QB, RB, WR, TE and K carrying
     a designation is listed. The table went from 93 rows to 182 across all 32
     teams. **Do not reintroduce a rank filter** to shorten the page; filter by
     team, which the page already does.
   - **CBS Sports and Sharp Football Analysis feed the tracker (2026-08-27).**
     Both are HTML scrapes in `injury-feed.ts`, pulled inside the same TTL
     window as the wire and never fatal: a board that fails contributes an empty
     map and the rows keep Sleeper's own field. **A board only ever fills a
     gap** — where Sleeper names anatomy that stands. The reason they exist is
     measured, not assumed: 61 of 67 relevant injured players appear on one of
     them, and they name a body part for 9 of the 19 rows Sleeper leaves as
     "Undisclosed" (Nacua groin, Kirk calf, Downs calf, Egbuka toe). Live, that
     took undisclosed records from 19 to 10 and empty Latest cells from 25 to 1.
     They are HTML, so a markup change breaks a selector and yields nothing;
     that is designed for rather than guarded against.
   - **ESPN was requested again on 2026-08-27 and is still not used.** Its
     robots.txt names `anthropic-ai` with `Disallow: /`. The `User-agent: *`
     rules would permit `/nfl/injuries`, so **this remains available to the
     operator directly** — what is ruled out is an agent fetching it, and
     changing the user-agent to get round a rule aimed at the agent writing the
     code is not something to do on his behalf. CBS and Sharp name no Anthropic
     agent and disallow neither path; both were checked rather than assumed.
   - **The Draft Sharks pull stays, its section does not.** The standalone
     "Injury headlines" list was removed on 2026-08-27 at the operator's
     request, along with every explanatory paragraph under the Season tracker
     heading: he wants the page to be the tracker, not commentary about it.
     `getInjuryHeadlines()` is still called, because those headlines are what
     the tracker's Latest column matches per player — deleting the fetch would
     empty that column. Only the display went.

   **ESPN and Yahoo were requested and are deliberately not used.** Both name
   `anthropic-ai` in robots.txt with `Disallow: /`; Yahoo also names
   `Claude-Web`. Their `User-agent: *` rules would permit the injury pages, so
   **this is available to the operator** — it is specifically an agent writing
   this code that is disallowed, and reaching them from here would have meant
   choosing a user-agent to get around a rule aimed at the author. Left as the
   operator's call. Sources used instead:
   - **Sleeper's player endpoint** — public, robots.txt fully permissive,
     already what `audit-teams.mjs` audits against. Carries `injury_status`,
     `injury_body_part`, `injury_notes` and `search_rank`.
   - **Draft Sharks' news sitemap** (`/news.xml`) — a Google News sitemap the
     publisher advertises in a robots.txt that allows everything. Title, link
     and date only (§2).

   **Two findings worth keeping.** First, Sleeper's "Questionable" is a camp
   catch-all — 93 of 129 injured skill players carry it in August — so a naive
   band comparison produced *thirteen* false conflicts, every one of them a page
   status against "Questionable". A disagreement is now only reported when the
   claims cannot both be true. Second, 24 of the 35 players carrying a serious
   status are deep roster, so the league-wide list is filtered by Sleeper's
   `search_rank` (`RELEVANCE_RANK`, 400) — without it the section buried
   Aiyuk under third-string tight ends.

   **Nothing overwrites a hand-authored record.** `camp-injuries.json` is
   reporting, with an attributed timeline or none (§5.3); the wire sits beside
   it. This is the standing fix for open item 7.

   **Sleeper's notes were checked before any were published.** They can carry
   free text, and a note reading "expected back Week 3" would breach §5.3 the
   moment it rendered. On the pull this was built against, 26 of 156 carried a
   note and *none* contained return or timeline language — they are single words
   like "Surgery". **Re-check that if the table ever starts printing sentences.**

2. ~~**Position pages: RB, K, DST, TE and QB are built. WR is not.**~~ **Closed 2026-08-22 — WR is built; see the WR entry below.**
   Each built page follows the same shape — a script reads the workbook, the
   JSON holds every computed value, and the components only draw (§11).
   - **WR** — built 2026-08-22, and the last position to get a page. Three
     scatters in the operator's order — target share against air yards, then
     both as a share of one offense, then WOPR against PPR points per game —
     followed by the receivers he tracks outside the charted fifty and the
     check-the-box grid. 50, 41 and 36 players, 127 points.
     - **Its rows are 2-183 of the same WRTE sheet the tight ends use**, which
       starts at 189. `te_charts.py` was the template and two of its rules had
       to change. The **date-serial guard is per-axis now**: it drops anything
       over a thousand, and the first WR chart's x-axis is air yards, which runs
       to 1,841 — left as it was it would have silently deleted most of the
       chart. And the **name column is per-block**, because the first block
       keeps names in D rather than B.
     - **The grid's "High YPRR" and "High TPRR" columns are 4for4-derived.**
       This is the third place that vendor's work reaches the site, after the RB
       chart and the whole TE page. What is published is the operator's own
       categorisation — names under a heading — not the licensed figures, which
       is a smaller step than the TE page took. **Flagged to him rather than
       assumed**, same as the other two.
     - **The notable-names block was deleted 2026-08-22**, the operator's call.
       Sixteen of its twenty-three entries were bare surnames the sheet never
       spelled out anywhere. The three team columns render as chips; all
       fourteen resolve, trailing spaces and all.
     - **The grid carries three fitted columns beside the operator's seven.**
       Expected touchdowns are least-squares by field zone across 88 qualifying
       receivers — an end-zone target is worth 0.354, a red-zone target outside
       it 0.226, a target beyond 0.012, R² 0.64 — and the residual ranks who
       scored above and below their looks. **Its agreement with his two
       touchdown columns is published in three lists, not two**: shared, ranked
       elsewhere by the fit, and never seen by it. A receiver below the volume
       floor is a coverage gap and reporting it as a disagreement would
       manufacture a dispute. Five of eight shared on regression, three on
       improvement.
     - **Two charts come from the nflverse export, not the workbook**, added
       2026-08-22 — the only extractor on the site reading two sources. Neither
       touches a licensed column. *Stickiness*: year-over-year rank correlation
       for eight measures across 571 paired WR seasons since 2015, reconciled
       against a pairing the script does itself from the season-level export
       (worst gap 0.068; over 0.12 it says not to publish). *Consistency*: boom
       weeks against bust weeks for each charted receiver in 2025.
     - **The stickiness result contradicted the page and the page changed.**
       The WOPR chart's paragraph claimed opportunity forecasts better than
       scoring does. It does not: points per game repeats at 0.59 against 0.49
       for target share and 0.49 for WOPR. What the data does support is that
       *efficiency* does not repeat — yards per target 0.25, touchdowns per
       target 0.17. The page states the failed half under its own "what this
       does not show" heading. **Do not reinstate the stronger claim.**
     - **A conclusion panel sits under the boom/bust chart**, sorting the field
       into the scatter's four corners and then crossing boom rate with WOPR.
       The corners are flagged on the page as partly circular — better receivers
       boom more, so they re-describe scoring. **The usage cross is the half
       that adds information**: five receivers with top-half usage and a
       bottom-half boom rate, seven the reverse. It reads as an argument only
       because the stickiness bars sit above it; without that, it is two lists.
       Six of 39 carry no WOPR point and are left unplaced rather than guessed.
   - **RB** — three scatters, the historic RB 1-3 table, and two ranked tables.
     `ScatterChart` names every point: thirty candidate positions per label,
     six directions at five distances, with a leader line past the inner ring.
     All 170 points are named with no overlap. Emphasis in the historic table
     is marked against each column's own quartiles, with the sense flipped for
     the two rank columns so bold always means good.
   - **K** — seven sections. The value case, the top-half/bottom-half split,
     then the workbook's three reference blocks *in full*, then the board.
     **The workbook blocks are the point of that page.** A first pass rendered
     only the analysis and left all three tables unrendered in the JSON, which
     from the operator's side was indistinguishable from deleting his data.
     The top three carry his write-up verbatim; every kicker carries a team
     chip, and the scoring tables use the team he kicked for *that season* —
     current teams would misattribute eight of twenty-nine.
   - **DST** — nine blocks in the operator's own section order: what it is
     worth, historic finishes, the measures against the finish, pass rush,
     secondary, box rates, offseason, coordinators, schedule. The 2025 columns
     are **regrouped by what they measure** rather than which sheet block they
     came from. The three findings sit at the **foot** of the page.
   - **TE** — built 2026-08-17, in the operator's own section order: route
     participation against target share, then against targets per route run,
     yards per game against touchdowns, air yards share against targets per
     route run, participation against yards per route run, then the 2011-2025
     history and check-the-box grids. Five scatters of 25 tight
     ends each, with the workbook's own groupings ("Decoys (routes but no
     targets)", "TD Inflation") beside each chart.
     - **This page publishes 4for4's licensed columns** — route participation,
       TPRR and YPRR. §2 rules them out and the note below records them as cut;
       the operator extended the RB-chart decision to this whole page on
       2026-08-17. His call, recorded rather than assumed.
     - **The sheet holds the TE1-3 grid twice and the two disagree.** One copy
       sits at row 386 under "2011-2025", the other at 417 under "PRESENT
       CONTEXT / 2023-2025", and the newer promotes Kyle Pitts into the air
       yards column and into best candidates where the older has "George Kittle
       (Injury)". The operator ruled that the fifteen-year table is the one
       that classifies a TE1, so **386 is the page's grid and the three-year
       copy is not published** — which makes the disagreement moot rather than
       something the reader is handed to arbitrate.
     - TE's placeholder copy in `positions.json` described "snap share against
       target share" — the fallback from when route data was cut. It was
       rewritten, because a page whose charts say one thing and whose
       methodology says another is worse than either.
   - **QB** — built 2026-08-18, four sections: what a carry is worth, scramble
     count against scramble rate, efficiency against scoring, and team pass
     rate. **Its source is a PDF, not the workbook** — there is no QB tab in the
     (4) workbook, so `qb_charts.py` reads the operator's "QB Statistics" export
     directly, inflating the Flate streams and undoing a CID offset of 29. No
     poppler or PIL on this machine, so both are done in ~60 lines rather than
     by adding a dependency.
     - **Six rows had rushing YARDS in the rushing ATTEMPTS column** — Rodgers,
       Goff, Burrow, Flacco, Stafford and Tagovailoa. Each printed figure equals
       that player's rushing yards exactly, checked against Sleeper's 2025 stats.
       Stafford is what exposed it: 1 "attempt" against 597 dropbacks produced
       −5.69 designed carries, which is impossible. The other five were wrong
       without being absurd. They live in `CORRECTIONS`, the script refuses to
       apply one whose "was" value no longer matches, and it prints "correction
       now matches the source" once one becomes redundant. **Herbert is
       deliberately not corrected** — 86 against Sleeper's 83 is a source
       disagreement, not a column swap.
     - The correlations are all computed in the extractor and quoted into the
       prose from the JSON, so no paragraph hard-codes a number (§11).
     - **One season, 37 passers.** The page says so at the top. Unlike TE there
       is no multi-year history to lean on.
   - **The scatters and tables compute nothing.** Medians, extents, quartiles,
     which points get a name and the order they are placed in all come out of
     the Python.
3. **The game tracker pulls live, and its in-progress state has not met a live
   game.** Rewritten 2026-09-19. `src/lib/live-games.ts` pulls CBS's week
   scoreboard and nflweather's week page at request time, and merges both over
   `schedule.json`, which stays the floor. The parsers are in
   `scoreboard-parse.ts` with no runtime imports so they can be tested with
   plain `node` against saved pages.
   - **Verified against real pages**: every Week 1 final equals the sum of its
     quarters, overtime included; line direction was read from all 15 Week 2
     pregame cards (the away cell is the total, the home cell the home side's
     spread, which is `schedule.json`'s convention); and nflweather's four dome
     markings fall on exactly the site's four retractable venues.
   - **Not verified: a live game.** It was built on a Saturday. The
     in-progress card is parsed defensively and falls back to the schedule, but
     check `/games` during a game: the card should read "Live" with CBS's clock.
   - **Known gaps.** No closing line once a game starts, because CBS drops it at
     kickoff, so Week 1 keeps its August lines. No per-game leaders, so a
     finished card lists the team's key players under "Key players".
   - **`npm run games` is redundant** and still reads ESPN. Retire it.
4. ~~**Daniel Carlson is ranked K16 and unsigned.**~~ **Closed.** The operator
   made the editorial call: an unsigned kicker does not belong on a draft
   board, so Carlson is off the K board entirely and Chase McLaughlin is in at
   7. He still appears on the kicker page's scoring tables, with an FA marker,
   because those record what he did rather than who to take.
5. **The film room has one real breakdown and the sample is still shelved.**
   Updated 2026-08-30: all 47 offensive snaps of Lions at Packers, Week 1 2025,
   are published from the operator's own deck as a "Sneak peek" under an
   in-production notice that leads the page. Rendered images, not rebuilt SVG.
   `scripts` note: there is no extractor — the plates were rasterised from
   Keynote's vector PDF export and the metadata parsed out of the slide XML, both
   one-off. Re-doing it means re-reading `docs/HANDOFF.md` §2.
   - **The deck clips itself and the original still does.** Info boxes 0.81in
     tall at 5.02in on a 5.625in slide: Time, Outcome and DEF were cut off every
     slide. The render grows the canvas to 5.875in on a copy.
   - **The page no longer shows the deck's info box** (2026-09-19). Its fixed
     text frames ran a long score into Down/Distance and a long outcome into
     DEF. Every field was already in the payload, so the plate is cropped to the
     field by CSS (`PLATE_FIELD_RATIO`, measured at row 1272 of 1504) and the
     fields print as text. The image files are untouched.
   - **A summary sits above the reel**, from `film_summary.py`: what the
     offense ran, since the deck records the defense and no formation.
   - **Three labels were normalised at his request** — bold label with plain
     value, "Outcome" replacing Result and Playcall, DEF filled from Pre-play on
     slides 2, 20 and 41. This reversed his earlier "do not change any slides".
   - The old note follows, and still holds for `concepts.json`:

   **The film room holds one sample play and no analysis.** `concepts.json` is
   an empty array. Mesh, Dagger and Sail were written by an agent — the routes,
   the prose and the claims about which teams run them — and the operator had
   them removed on 2026-08-21 rather than publish football analysis he did not
   write. The by-team grid now comes from `TEAMS` rather than from the concepts,
   so all 32 clubs show and each says "No concepts yet"; adding a real concept
   with a `teams` array makes it appear with no code change. The concept library
   grid was removed at the same time and may come back — nothing it depended on
   was deleted.

   Above that grid sits **one worked play**, from `src/data/film-sample.json`,
   because the site is going out as a portfolio and an entirely blank section
   does not show what the page is for. It is the operator's own
   `Film Template.pptx` rebuilt as SVG — every coordinate lifted from the slide,
   the slide's own field art under it at `public/img/film/field.png`. **It is
   labeled "Sample" and the copy says it is a worked example of the layout
   rather than published analysis, and that labelling is load-bearing**: it is
   the only thing separating it from the concepts that were just deleted for
   being presented as findings. If real breakdowns land, this either goes or
   keeps its badge.
6. **Re-run `npm run audit-teams` after the cutdown to 53.** Rosters move
   through the preseason; the audit below is true as of 2026-08-14 and nothing
   keeps it true.
7. **News tags only players in `players.json`. The injury link is now partly
   closed** — the live wire (item 1b) reconciles the camp report against a feed
   on every render, so the two can no longer disagree silently. What remains is
   the tagging itself. `players.json` holds the 120 ranked players, so a headline
   about anyone else is stored and displayed but tagged to nobody and has no
   player page. Separately, `camp-injuries.json` is hand-authored and keyed by
   name, so even a player tracked there gets no automatic link from a matching
   headline. Jordyn Tyson is the live example: three injury headlines and four
   beat posts on 2026-08-14, zero news tags, while his camp record sat at the
   2026-08-12 wording until it was updated by hand. The gap is not that the
   news is missing — it is that a fresher headline never nudges the injury
   record, so the two can disagree on screen.
8. **The 2025 leaderboards have no numbers.** Sacks, interceptions, pressure
   rate and the rest are team order only in the (4) sheet — the operator asked
   for "sack leaders with numbers" and the counts are not there. The only 2025
   block with values is simulated pressure. Sack counts *do* exist for 2021-24
   in `scripts/curated/data/dst-history.json`.
9. **Nitter is gone, not blocked. Closed 2026-08-30.** Ten public instances
   tested and not one returned a single item: nitter.net 410, xcancel demanding
   whitelisting, three DNS failures, three 403s, a 429 that stayed 429 after a
   backoff, and a 502. X has no free read API. **No list of accounts fixes this**
   — the transport died, so every beat writer and all 32 `Sleeper*` team accounts
   are equally unreachable. `/news` now runs a live section off the 32 official
   club feeds instead (`src/lib/live-team-feed.ts`), labelled "Around the clubs"
   and explicitly *not* called beat reporting, because a club announces an
   activation rather than telling you who looked a step slow. The beat archive is
   badged **Closed** with no freshness stamp: a permanent record wearing a
   staleness clock reads as broken rather than finished.
   **SB Nation was the obvious independent replacement and is ruled out** the
   same way ESPN and Yahoo are — all 32 of their team blogs have working feeds,
   and their robots.txt names `anthropic-ai` with `Disallow: /`. Available to the
   operator directly, closed to an agent fetching it.
   The original entry follows.

   **Nitter is fragile, and was blocked on 2026-08-17.** Five national insiders
   (`RapSheet`, `AdamSchefter`, `TomPelissero`, `MikeGarafolo`, `FieldYates`)
   were added to `fetch-beat.mjs` that day for injury news, but **could not be
   verified** — Nitter returned nothing even for `SleeperNFL`, which had
   returned 139 posts an hour earlier. They are real accounts; whether this
   pipeline reaches them is unproven. Re-run `npm run beat` when X unblocks.
   The beat feed goes through Nitter because X has no free read API. X blocks it periodically. `fetch-beat.mjs` tries multiple
   instances, never wipes data on failure, and is `continue-on-error` in CI, so
   an outage makes the section stale rather than empty. If it stops updating,
   that is the first thing to check.
10. **`rb_charts.py` still targets the `(2)` workbook.** Its `DEFAULT_WB` names
   `... (Original) (2).xlsx` while kicker, defense and TE all name `(4)`. Sheet
   and row numbers shift between versions, so re-running it as it stands reads
   a two-versions-old sheet. Nothing is wrong on the page today — `rb-charts.json`
   was generated from the version the script named at the time — but the next
   run needs either the path argument or a remap against `(4)` first.
   **Since 2026-09-19 a newer workbook exists**, the "Vantage" file, and every
   chart extractor predates it. `rb-charts.json`, `defense-charts.json` and
   `kicker-charts.json` now pass through `normalizeProse` as they load, so a
   re-run cannot bring back the spellings and names fixed there.
11. **The prediction head-to-head cannot show the model's heaviest inputs.**
   `model-features.json` publishes the full 55-feature list and
   `feature_importance` ranks twelve, but eight of those twelve have no
   per-team values anywhere in the payload — point differential (the single
   heaviest at 32.3), overall matchup, team win rate and QBR among them. So the
   comparison a reader sees is the subset that happens to carry values, not the
   subset that decides the prediction, and the page cannot say otherwise
   without inventing numbers. Fixing it means asking the prediction pipeline
   for those per-team fields; it owns its own Python and changes go through
   Michael (see the peer-session note below).
12. **`reference_games` is used only in the methodology panel.** Three finished
   games ride along in the payload to show what an injury gap looks like. A
   fuller worked example — one real game walked through the model's inputs to
   its probability — is available from what is already there.
13. **The 2026 fantasy board's sixteen-game floor is one number, and it is not
   tuned.** Added 2026-08-22 at the operator's instruction, applied to every
   position: a player needs a full season of prior games before the board will
   recommend him. It removes 24 players, all published in `board_rule.excluded`
   with the rank each would have held.
   - **What it was for.** Ben Sauls was K1 on two career games while Brandon
     Aubrey — the position's actual 2024 leader, three straight seasons at
     10.7-11.3 ppg — sat tenth. The kicker model is candid about why:
     `draft_day_rho` is 0.133 at K and 0.160 at DST against 0.55-0.79 at the
     skill positions, and its 2026 kicker projections span 1.6 points where the
     2025 season actually spanned 6.9. An order that compressed is decided by
     noise. Aubrey moved to eighth on the rule alone — **he was not promoted by
     hand, and the data would not support it**: prior-season kicker scoring
     predicts the next season at a Spearman of 0.11, 0.14 and 0.35 over the
     last three years. A future session asked to "fix" his ranking should read
     that number first.
   - **It costs real players.** Colston Loveland off TE3, Harold Fannin Jr. off
     TE6, Omarion Hampton off RB10, six quarterbacks including Jaxson Dart and
     Michael Penix Jr. At the skill positions the model *does* discriminate, so
     the floor is buying consistency at a genuine price. The operator was shown
     that list before it went in. Sixteen was chosen because it is one season
     and because it is already the `thin` threshold — not because it was tested
     against anything.
   - **The `Thin` marker is now unreachable** on the 2026 board: the floor is
     exactly the threshold the marker fires below. The branch is kept because
     it is conditional on the data and starts working again if the floor moves
     down.

14. **Two season-total numbers exist and only one of them is a forecast.**
   Recorded 2026-08-22 because the flattering one is easier to reach and reads
   better. Summing a player's seventeen weekly forecasts gives an average miss
   of **22 points**; the model's August projection for the same season misses by
   **38**. The gap is not that the model sharpens — measured weekly accuracy is
   flat across the year — it is that the in-season sum is allowed to follow a
   role that changed in October. `rankings()` in the model repo already said
   this in a comment; the site now says it on the page. **Do not quote 22 as
   season accuracy.**
   - **The weekly baseline cannot be reused at season scale.** Summed over a
     year, a trailing three-game average is a lagged copy of the player's own
     scores: r=0.986 against the actual season total, mean error 9.9 points on a
     median season of 120. Scored that way it "beats" the model 88% to 57%,
     which measures nothing but the baseline reading the answer. The season
     comparator is the player's own prior-season rate instead.
   - **Both sides are multiplied by games actually played**, which gives each
     the same hindsight and isolates whether the rate was right from whether the
     player stayed healthy. Neither predicts the second.
   - **At defense the model does not beat the baseline** — 54.0% against 54.1%
     within 25 points. That is what a draft-day rank correlation of 0.16 looks
     like measured as a hit rate, and it is on the page rather than omitted.

15. **The headline bands are 8 and 40, and both were chosen against numbers
   rather than taste.** Set 2026-08-22. A future session asked to "make the
   accuracy look better" will find that widening the band is the obvious move
   and that it was already considered and bounded.
   - **Significance does not pick a band.** With 37,044 paired player-weeks
     every margin from 5 to 10 separates the model from recent form at p below
     1e-50. What varies is the *size* of the edge: +4.1 points of hit rate at
     ±5, +5.8 at ±8, +5.9 at ±9, +5.8 at ±10. Eight is where the model is
     furthest ahead while the band still means something. Ten is rejected
     because it covers 98% of kicker weeks; at eight the kicker row is 95% and
     is still the loosest in the table.
   - **The season band is 40 because 30 lands on a fluke.** At exactly 30 the
     model and the baseline tie at quarterback to four decimals — 0.4409 each,
     508 player-seasons — while the QB edge is +4.1 at 25, +1.4 at 35 and +3.1
     at 45. At 40 the model leads at every position. Fifty would read 72.6% but
     is 41% of a median season.
   - **The test is McNemar's**, because the two are scored on identical rows and
     a two-sample test would be the wrong one. Weekly the discordant split is
     4,405 to 2,243; season, 619 to 483. Both are in the payload.
   - **The ceiling is measured and it is not far above this.** An oracle that
     knows each player's own season median in advance hits 61.5% within 5
     points and 78.5% within 8. The model is at 51.5% and 73.5%. **There is
     roughly 5-10 points of headroom at any band, not 30** — a target like "80%
     within 5 points" is above what perfect foreknowledge achieves. Recorded
     because it is the first thing to check before promising an accuracy gain.

16. **The stacked lockup PNGs still carry the old mark.**
    `brand/` and `public/brand/` hold `vantage-logo-stacked-on-black.png`,
    `vantage-logo-stacked-dark-on-light.png` and `wordmark.jpg`, all drawn
    against the pre-2026-08-26 goalpost. **Nothing in the site references any
    of them** — the lockup on the home page is composed from `Wordmark`, so the
    site itself is consistent — but they are the files anyone would reach for
    to make an OG image or an avatar, and they would ship the retired mark.
    Replacing them means rendering the new emblem over Anton type, which is a
    piece of brand art rather than a code change, so it is left for the
    operator to decide rather than assumed.

17. **The prediction payload carries all 18 weeks, and only week 1 means much.**
    Added 2026-08-30 at the operator's instruction after the trade-off was put to
    him twice. `FeatureEngineer._prepare_scoring_frame` in the peer session's
    pipeline restricts scoring to the first unplayed week *on purpose* — beyond
    it both teams' rolling state is stale by construction. Everything upstream is
    already season-wide, so that one function was the whole constraint.
    - **`scripts/curated/game_predictions_full_season.py` swaps that method on
      the class for one process.** It edits no file in their repo, verified by
      hash before and after. Running `pipeline.run()` does rewrite their
      `artifacts/` reports; the model was unchanged by it (accuracy 0.6445 to
      0.6474).
    - Weeks 2-18 are every team at identical preseason form. The payload says so
      itself: `features_current` per game, `forecast_horizon` at the top, and the
      page prints the caveat wherever the flag is false. **Do not remove that
      notice while the flag exists.**
    - `SPEC_multiweek_scoring_frame.md` is filed in `~/Desktop/nflverse-data/`
      asking for a supported `scoring_horizon` config. **When it lands, delete
      the workaround script** rather than keeping both.

18. **Weekly rankings are published for Weeks 1 and 2; rest of season is
    gone.** Rewritten 2026-09-19. Each week is one file, `rankings/week-N.json`,
    holding all six positions and the date the operator gave it, imported
    statically in `content.ts`. A week with no file is still an addressable
    empty scope. To publish Week N: fill its block in the workbook's Rankings
    sheet, add `N: "YYYY-MM-DD"` to `PUBLISHED` in `weekly_rankings.py`, run it
    with `--sync-players`, then import the file and add it to `WEEKLY_FILES`.
    A weekly list is never flagged stale: it is dated to its week by
    construction.

19. ~~**`defense.ts` does not normalise its prose at the boundary.**~~
    **Closed 2026-09-19.** `defense.ts`, `kickers.ts` and the RB payload in
    `charts.ts` now pass through `normalizeProse`, which fixes em dashes,
    British spellings and a short list of verified player-name corrections.
    Before each was wrapped, a dry run confirmed it changed only the intended
    strings and none the code looks anything up by.

20. **The site is one typeface, and the token layer is what made that cheap.**
    Anton, Barlow Condensed and Barlow became Roboto on 2026-08-30, via Archivo
    and Bricolage Grotesque in a single day. Weight and width are now tokens
    (`--weight-display`, `--stretch-display`, `--stretch-condensed`) because
    **not one of the 109 display call sites carried a `font-weight`** — Anton was
    a single intrinsically heavy weight, so a variable family would have rendered
    every hero at 400. 78% and 84% sat inside all three families' width ranges,
    so each swap was the family name and nothing else.
    **It must be `Roboto`, not `Roboto Serif`.** Six families share the name;
    only this one has wdth 75-100 with wght 100-900. Verified at the import, in
    the share-card font's own name table, and in the live computed face.

21. **The news bot commits to `main` about 26 times a day.** Added 2026-09-19.
    400 runs from 09-04 to 09-19, all green, median 1.4 minutes, each billed up
    to 2 minutes: roughly 1,500-1,600 billed minutes a month on a private repo
    against a 2,000 free allowance. Every push needs `git pull --rebase` first,
    and a host that deploys on push rebuilds each time. Its value is small now
    that `/news` pulls live on render. The operator has not decided whether to
    turn the schedule off or have the host skip `news.json`-only commits.

22. **The host needs `NEXT_PUBLIC_SITE_URL` at build time.** The only
    environment variable the site reads. It falls back to localhost, so without
    it every shared link previews a broken image. The operator is moving host;
    set it before the first build there.

23. **Stat lines still use lower-case short forms**: "15 tgt · 55 rec yds",
    "Rush att", "ppg". Model labels were capitalised on 2026-09-19 at the
    operator's request; these were not in scope.

24. **Git identity is unset**, so every commit's author is the machine-derived
    `michaelhuettl@Michaels-MacBook-Pro.local`, which GitHub cannot link to an
    account. The operator's call.

25. **Film loose ends.** `FILM_SOURCE_NOTE` in `src/lib/film.ts` is exported and
    no longer rendered. `/film`'s meta description still says "drawn from
    scratch rather than clipped from a broadcast". `film.ts`'s docstring calls
    the plays "all 47 offensive snaps", but quarter counts of 18/5/12/12 show a
    selection. And 47 `p## 2.jpg` files in `public/img/film/gb-det-2025-w1/` are
    the old 1080px export: gitignored, 4.5 MB on disk only.

26. **Two name inconsistencies outside this repo's control.** "Joe Forson"
    appeared on `/injuries` from the live wire; it is almost certainly Joe
    Fortson (KC). And the fantasy model writes "Audric Estimé" where the injury
    wire writes "Estime".

27. **The August injury records are largely stale.** Added 2026-09-19. Six
    (Stribling, Jeudy, Monangai, AJ Brown, Pacheco, McConkey) describe a
    different body region from this week's official report, and render as
    "Earlier". Refresh or retire `camp-injuries.json` now that the report covers
    every row.

28. **The project syncs to iCloud, and a busy sync hangs `next build`.** Added
    2026-09-19. `~/Desktop` is in iCloud Drive. See the gotcha below.

## Closed items

- **Teams re-audited (2026-09-19).** All 100 existing non-DST players matched
  the nflverse roster current through Week 2 on name plus position, with no
  disagreement. The same roster confirms two moves the last handoff flagged:
  Mike Evans to San Francisco and DJ Moore to Buffalo.
- **A site-wide text audit (2026-09-19)** covered 540 rendered pages with the
  macOS US English dictionary and the nflverse player register. It fixed
  Madubuike, Rashan Gary, Myles Garrett, Super Bowl, red zone, modeling and
  misjudgments; capitalised short forms in the model labels; and put real
  spaces in three labels that read as one word to a screen reader. No em dash
  appears in any rendered page.
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
| Analytics workbook | Newest: `~/Downloads/2026-2027 Vantage Football Analytics (Original).xlsx` (read by `weekly_rankings.py`). The chart extractors still name `... Fantasy Football Analytics (Original) (4).xlsx`. **Versioned; each new one is a new file and shifts rows** |
| Defense scoring history | `scripts/curated/data/dst-history.json` — 2021-24 with components, transcribed from screenshots, not in the workbook |
| Rankings source | Draft: sheet 2 "Mock Drafts & Rankings", rows 80–99, cols B–G, labelled **"My Rankings (WIP)"**. Weekly: the **"Rankings"** sheet of the Vantage workbook, one block per week under a "Week N" header, found by name |
| Injury source | Sheet 11 "Key Injuries" — rehab block rows 3–72, camp block rows 74–91 |
| X screenshots | Sheet 10 "Offseason News" — 117 images in 32 team columns |
| Headshots | `~/Desktop/Player Photos/` — the original 100 transparent cutouts. The 39 added on 2026-09-19 are **NFL.com's**, via the Cloudinary URL on the nflverse roster, resized by the CDN (`f_png,fl_png32,c_fill,w_320,h_232`) |
| nflverse mirror | `~/Desktop/nflverse/` — 860 parquet files and `nflverse.duckdb` with 36 views. Not a repo. The roster in it is an August snapshot; `weekly_rankings.py` downloads the current release CSV instead |
| Photography | `~/Desktop/Claude Code/` and `Thumbnails copy/` |
| QB statistics PDF | `2026-2027 Fantasy Football Analytics (Original) - QB Statistics.pdf` — there is no QB tab in the workbook |
| nflverse export | `~/Desktop/Claude Code/NFL Verse Data /` (**the trailing space is real**) — what `player_profiles.py` reads |
| Prediction pipeline | `~/Desktop/nflverse-data/nfl_predictor/` — **owned by a peer session, not this one** |

**Keep player photos and competitor logos out of the repo.** The working
directory holds ESPN/Yahoo/Sleeper/Underdog marks and 46 player thumbnails; the
site was scaffolded into `vantage/` specifically so those stay outside it.

**The fantasy projection model is a third repo**, at
`~/Desktop/Claude Code/fantasy-model/`, with its own virtual environment —
pandas, scikit-learn, twenty-seven seasons of nflverse player-week data. It is
this session's work rather than the peer session's, so it can be edited freely,
but the same copying contract applies: `export_site_payload.py` writes
`artifacts/site_payload.json` and `scripts/curated/fantasy_model.py` copies it
into `src/data/`. Re-run both after any retrain; the site reads the copy and
nothing watches the source. The model also builds its own technical report
(`build_report.py` -> a 10-page PDF) which is where its limitations are
documented at length.

**The prediction pipeline belongs to another session.** The model, its Python
and its artifacts live in `~/Desktop/nflverse-data/nfl_predictor/` and are
maintained by a separate session that has asked twice not to have its Python
edited from here, and for payload changes to be raised through Michael rather
than made directly. Two sessions editing one pipeline is how conflicts happen.
The contract between them is a file: that pipeline's
`export_dashboard_payload.py` produces the payload, and it is **copied** to
`src/data/game-predictions.json`. Re-copy it after any regeneration — the site
reads the copy and nothing here watches the source.

That session has since fitted the injury weights rather than assuming them, and
found offensive-line absences statistically indistinguishable from zero; only
quarterback (~2.6 points) and skill positions (~0.7) survived. **Do not write
copy claiming O-line injuries move the line.**

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
- **Headlines are joined to tracker rows by name, and the match is strict on
  purpose.** `src/lib/headline-match.ts` requires a player's **full name** as
  consecutive whole words. Surname alone is tempting and wrong: two Kenneth
  Walkers, two Josh Allens, and "Chase" is both Ja'Marr Chase and Chase Brown.
  A missed headline costs a reader a detail; a wrong one puts another man's
  injury on a player's row. Three rules do the work and each one is a bug this
  project has already met: apostrophes are **deleted** rather than treated as
  separators, so "Ja'Marr"/"Ja’Marr"/"JaMarr" agree (news.json carries 19 curly
  and 32 straight, and a filter written with one quote character misses the
  other); a trailing `s` is allowed on the final token, or "Ashton Jeanty's
  Week 1 Status" fails to match Ashton Jeanty; and generational suffixes are
  dropped from the player's name. Measured on live feeds: 21 of 67 relevant
  injured players match, zero names unmatchable, zero false positives.
  **The first version was wrong in a way that looked fine.** It folded both
  sides to bare letters and took a substring, which needs a length floor to stop
  `bonix` matching inside "turbo nixed" — and any floor that does that also
  throws out `jamarrchase` at eleven characters, which silently dropped 33 of 67
  players. Token comparison needs no floor. **Do not go back to substring
  matching.**
- **The injury page composes a written record where none exists, and that was a
  deliberate spend of §11.** The operator asked for it on 2026-08-26 after the
  rule was raised with him: the tracker runs unattended and an injury
  description has one sensible phrasing. Three conditions came with it and all
  three are load-bearing.
  **It is labelled "Composed"** wherever it renders, because a page whose pitch
  is that you can audit the argument cannot quietly mix generated sentences in
  with hand-written ones.
  **It never states a return date.** §5.3 was *not* part of what was set aside.
  `src/lib/injury-summary.ts` extracts the injury phrase from a headline and
  discards the timeline around it, and `TIMELINE` there is a hard stop that
  throws away a whole sentence rather than publish one. Timelines still reach
  the reader in the Latest column with a publisher's name on them. **Do not
  relax this to make the sentences read better.**
  **It composes from a controlled vocabulary and fixed patterns**, never free
  generation, and falls back to the wire's structured fields when no headline
  plainly contains an injury. Where a headline names a different body part from
  the wire's, the wire wins: that is nearly always a headline about a second,
  older injury. Where the wire says "Undisclosed" and nothing matches, the
  column stays "Not written up", because a sentence reporting that nothing was
  reported is worse than a blank.
  A hand-written record always wins over a composed one. If a row should say
  something better, write it into `camp-injuries.json`.
- **The tracker's "Updated" column is Sleeper's `news_updated`, and it does not
  mean what its position implies.** It is the last time *any* news about that
  player moved, not a timestamp on the injury. Measured before it was published:
  67 of 67 injured skill players inside the relevance cutoff carried the field,
  median age one day, 59 of 67 within a week, so it tracks the designation
  closely for everyone the page shows. Outside the cutoff it rots — the stalest
  was 1,837 days — which is another reason the cutoff earns its keep. The column
  is therefore called "Updated" and never "Reported", the cell names its source,
  and the section prose states the distinction. **It is not a return date and
  must never become one** (§5.3). Where the wire is silent the written record's
  own `reported` date stands in, which is why a row can read "record".
- **Four display clamps are still off the type ramp, and that is the next real
  typographic job.** `clamp(2.5rem, 5vw, 3.75rem)`, `clamp(12rem, 34vw, 26rem)`,
  `clamp(1.75rem, 3vw, 2.5rem)` and `clamp(1.75rem, 3.4vw, 2.5rem)` are four
  separate fluid scales for headings. Consolidating them changes headline sizes
  across several pages, so it was left rather than done quietly. `npx impeccable
  detect src` reports them.
- **`DESIGN.md` at the repo root is the visual system of record.** Extracted
  from the codebase on 2026-08-26 in the DESIGN.md format: token frontmatter
  plus the eight canonical sections. It records what is built; `docs/BRIEF.md`
  stays the authority on why, and where the two disagree the brief wins and
  DESIGN.md is stale. Worth updating in the same commit as any change to
  `globals.css`.
- **The side-tab callout is retired and must not come back.** Eleven copies of a
  `border-l-4` card across eight components were replaced by one `Callout`
  component on 2026-08-26. A thick coloured rule down one side of a card is the
  single most recognisable tell of a generated interface, and it was also
  spending the reserved amber twice per callout. The four detector hits that
  remain on `ChartFigure` are the goalpost frame, which is three-sided and is
  §7's signature element: **a false positive, deliberately left standing.**
- **The narrow-screen nav is the scrolling link row, and a drawer was tried and
  reverted.** On 2026-08-26 the sub-`xl` links were moved into a vaul bottom
  sheet at the operator's request and moved back the same day: he prefers the
  row, and the dependency was not worth it. **vaul is uninstalled and Radix went
  with it** — `package.json` is back to three dependencies, next/react/react-dom,
  and "this repo has no UI dependencies" is true again. The row's own comment in
  `SiteChrome.tsx` explains why it exists and records that the drawer was tried,
  so nobody re-proposes it as a fresh idea.
- **Five component libraries were evaluated on 2026-08-26; one was adopted, by
  hand.** The operator asked for React Bits, Manus.im, Animmaster Lib, Skiper UI
  and Vengeance AI. What they turned out to be:
  **Manus.im is not a design library at all** — it is an AI agent SaaS, a
  ChatGPT competitor, with nothing to install into a codebase.
  **Animmaster Lib** (animmasterlib.dev) is real but paid, $3-$8, delivered as a
  Google Drive download with no npm package, no CLI and no stated license;
  60% of it is plain HTML/CSS/JS that would need porting to React. Skipped, and
  its catalogue overlaps React Bits, which is free.
  **Skiper UI** (skiper-ui.com, one `p`) and **Vengeance UI** (vengenceui.com)
  are both real, both install through shadcn/Radix + Framer Motion.
  **React Bits** (reactbits.dev, MIT + Commons Clause — fine here, the footer
  states the site is not commercial and not for sale) is the one used.
  Four decisions framed the work and all four were the operator's:
  motion is **CSS and entrance only** — the GSAP/Lenis/smooth-scroll rejection
  stands; it lands on the **home page only**, nowhere a reader is comparing
  numbers; components are **copied and retokened by hand, not installed**, so
  `package.json` still reads next, react, react-dom and §7 keeps one colour
  source; and Animmaster waits. **Do not run `shadcn init` here** — it writes
  its own CSS-variable layer into `globals.css` alongside the `@theme` block,
  which is exactly the second colour system §7 exists to prevent.
- **The mark ships in three cuts, and which one goes where is deliberate.**
  The operator supplied all three on 2026-08-26. `Emblem` carries the plot
  furniture — a two-weight grid, ticks on three edges, the area fill, the ring
  around the endpoint — and is used once, in the home-page lockup at 96px,
  where that detail resolves. `Goalpost` drops all of it and is what the header
  and footer use at 32px, where it would be mud. `public/brand/vantage-icon.svg`
  is the third, reduced again for a browser tab. Three implementation calls sit
  on top of his files and each has a reason worth not undoing:
  **the structure is `currentColor`**, not the fixed white his source names, so
  one file works on light and dark chrome — every call site today sets white on
  a dark ground, but the default page surface is light and a hardcoded white
  mark would vanish the first time one is placed on it;
  **both components crop the viewBox to `35 15 130 170`**, the artwork's own
  bounds inside his 200x200 favicon square, so the mark fills the height it is
  given and CSS owns the spacing — no coordinate is changed, and because both
  crop identically the two are interchangeable without anything shifting;
  and **`Goalpost` drops his clip path** because measurement showed it removes
  nothing there, which also keeps a duplicate `id` out of the DOM, that
  component being rendered twice on every page. The emblem's clip is kept: its
  ticks have round caps that end on the plot edge and would bulge past the axis
  uncut.
- **Chase McLaughlin is on the kicker board but not in `players.json`.** He has
  no player page and no headshot, so his card falls back to initials. Adding
  him means adding a 21st kicker to the K rankings, which is a ranking decision
  rather than a data fix.

### Decided 2026-08-31 to 2026-09-19

- **The site is credited "By Michael Huettl"**, from `src/lib/site.ts`. "Built
  by" was suggested on §11's grounds and declined.
- **Wil Lutz is spelled Wil.** The operator believed "Will" was right; the NFL
  roster says William, football name Wil. The workbook's "Will" is corrected in
  `weekly_rankings.py`.
- **Week 1's duplicates** resolved by the operator: Bears stay at DST 8 with the
  Cowboys at 17; Will Reichard stays at K 12 with Ryan Fitzgerald at 16.
- **No rest-of-season rankings**, and the draft lists are untouched by the new
  workbook, whose Draft block differs from the operator's hand order.
- **Headshots come from NFL.com.** The operator asked for ESPN, which blocks
  this agent by name.
- **The film summary is about the offense.** The deck records the defense and
  no formation, so no formation rate is claimed. Staying-on-schedule, disguise
  and pressure sections, the lede and the footnotes were cut at the operator's
  request. Motion is the plates' grey line, 20 of 47; play 10's jet motion is
  drawn red and deliberately not counted.
- **Coming soon reads** "Enjoy a sneak peek of full film from a personal
  favorite in-person attended game." Written "peak"; shipped "peek".
- **Short forms are in capitals** in both models' labels, and Ken Walker reads
  Kenneth Walker (his chart label stays "K. Walker").
- **Injury detail is automatic only**: the NFL report on every row, no written
  "how it happened" accounts. Offered for the 22 ranked players and declined.

## Gotchas

- **nflverse does not agree with itself on two team codes, and the mismatch
  deletes players silently.** Its roster files say `AZ`; its schedules, its
  player-week stats and every processed parquet say `ARI`. The fantasy model's
  forecast skeleton inner-joins roster to schedule on `team`, so for one build
  **every Arizona player was missing from the 2026 board** — McBride, Murray,
  Harrison Jr., Conner — while the ARI defense stood alone, because it arrives
  by the team-week path. Nothing errored; a board is expected to be shorter than
  a roster, and 632 players is a plausible total with or without a club in it.
  The join now asserts that every rostered team has fixture rows. Separately,
  **both files call the Rams `LA` where this site keys on `LAR`**, and an
  unresolved code is not an error either — `TeamChip` falls back to a grey chip
  printing the raw string, so the Rams simply lost their colours. `getTeam`
  aliases both pairs and `canonTeams` normalises each payload at its boundary.
  **Check a join's output against a name you expect to find**; a count that
  looks plausible is not evidence.
- **Formatting a date needs to know whether it is an instant or a calendar
  day.** `src/lib/dates.ts` splits them on whether the string carries a `T`. A
  wire datetime is an absolute instant and is pinned to `America/New_York`,
  because a server in UTC renders Sleeper's `2026-08-24T01:25Z` as Sunday when
  it was Saturday evening in the US (§6). A date-only string carries no instant
  and `parseLocalDate` already builds it as local midnight, so pinning a zone on
  top shifts it a day the *other* way. Getting one branch right and the other
  wrong is easy and invisible from the author's own timezone; both are checked
  under UTC, Los Angeles, Tokyo and New York.
- **A `view()` timeline cannot animate an element that is already on screen,
  and that is not a bug you will see in the code.** The range is positional, so
  an element inside the viewport when the page loads starts part-way through it:
  it never plays from the beginning, and with `opacity` in the keyframe it sits
  permanently dimmed at whatever progress it loaded at. It reads as "that card
  didn't get the effect". Found on `/positions`, where at 1280x800 the QB and RB
  cards sit at y=680 against an 800px viewport while the other four are below
  the fold, and every card's markup is byte-identical. **Card grids therefore
  use the load-time `rise` with a delay off the index**, which does not care
  where an element sits, and `.reveal` now animates `vantage-rise-in-place` —
  transform only, no opacity — so the worst case anywhere else is an element a
  few pixels low rather than a faded one.
- **A scroll-driven animation needs `animation-duration: auto`, and the
  shorthand silently takes it away.** `animation: name 1ms linear both` on a
  `view()` timeline looks correct and does nothing: progress comes from scroll
  position, so a stated time duration finishes the animation in the first sliver
  of the range and holds the end state across the rest of it. The page renders
  exactly as it should throughout, which is the problem — the failure is
  invisible without measuring. Write the longhands and leave duration `auto`.
- **The global reduced-motion reset does not cover view-timeline animations.**
  It collapses `animation-duration`, which lands a time-driven animation on its
  final frame, but a view timeline ignores duration entirely — anything
  off-screen would stay at opacity 0 with no way to reach 1. Motion classes are
  therefore defined *inside* `prefers-reduced-motion: no-preference` rather than
  being undone afterwards, so under `reduce` they contribute no rule and the
  base style stands. Same reason every reveal sits inside `@supports`: visible
  is the default state, and nothing is ever hidden waiting for an animation that
  might not run.
- **The preview pane runs hidden, which freezes both animation clocks.**
  `document.visibilityState` reads `hidden`, so CSS animation `currentTime`
  stays at 0 and a `ViewTimeline`'s `currentTime` stops updating on scroll even
  though `getBoundingClientRect` keeps moving. Reading opacity through
  `javascript_tool` therefore reports motion that is working as broken. Two
  things do work: driving the animation manually through the Web Animations API
  (`animation.currentTime = t`, then read the computed style), and
  **screenshots, which force a real paint** — a scroll-driven reveal is visible
  in one as a faded card that moves down the grid between shots.
- **`src/app/favicon.ico` outranks `metadata.icons`, and it was the Next.js
  starter's from the first commit until 2026-08-26.** Next's file-based
  convention emits that file as the *first* `<link rel="icon">` in the head,
  ahead of everything `metadata.icons` declares, and `.ico` is what several
  browsers prefer. It had not been touched since `create-next-app`, so the tab
  had been showing the Next.js logo while `layout.tsx` confidently pointed at
  the Vantage one.
  Grepping the source for the brand path finds the metadata line and misses
  this completely: the file is referenced by nothing, its **location** is the
  reference. It is now packed from the same SVG as the rest.
  **Read the rendered `<head>`, not the source, when checking what a page
  actually declares.**
- **A 200-unit icon goes to mush at 16px and the fix is a second file.** At
  that size the favicon's strokes land at 1.0-1.2px: the goalpost greys out,
  the amber line breaks into dashes, and the 3-unit plate outline is pure haze.
  `brand/vantage-icon-16.svg` is the same geometry with weights up about 27%
  and the outline dropped, and it supplies only the 16px tile of the `.ico` —
  32 and 48 come from the served SVG. **Both files change together.** Inspect a
  favicon by blowing the render up with a nearest-neighbour resize; at native
  size the difference between legible and not is invisible.
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
- **Licensed route-run data is published on the RB page and the whole TE page,
  deliberately.**
  Route participation and targets per route run come from 4for4 and §2 forbids
  republishing them; they were cut for that reason and the cut is recorded
  above. The operator reinstated the third RB chart knowingly after the
  conflict was raised. The decision is his and it is scoped to that chart —
  the operator then extended it to the entire tight end page on 2026-08-17,
  which is where route participation, TPRR and YPRR all appear. Both decisions
  are his and were taken after the conflict was put to him.
- **Thresholds in the glossary are checked against the data, not remembered.**
  Five of the "what good looks like" lines were wrong on the first pass and were
  caught by computing the distribution: opportunity share said 55% was a
  workhorse when the maximum in four seasons of 150-carry backs is 51.6% and the
  median is 34%; high-value touches said 100 was a lead-back season when only
  eleven of sixty-eight clear it; TPRR called 0.20 strong when it is below the
  charted median. A plausible-sounding threshold is the easiest thing on this
  site to get wrong and the hardest for a reader to catch.
- **The inline nav bar has now outgrown two breakpoints.** It started at `md`,
  moved to `lg` when the sections were renamed in August 2026, and moved again
  to `xl` when the fantasy model made an eighth item. Each time the failure was
  the same and silent on a wide monitor: the last item runs past the viewport
  and every page gets a horizontal scrollbar. Measure at 1024 and 1280 after
  adding or lengthening any nav label. The nav also shortens where a heading
  does not — "Fantasy Model" in the bar, "Fantasy Football Model" on the page,
  the same way the positions dropdown says "Defense / ST".
- **The market has two "favourites" and they disagree.** The miss report's
  headline — the market lost 253 of the model's 292 misses — only reproduces if
  the market's side is taken from `spread_line`. Read from the moneyline it is
  251, because on two near-pick'em games in the window the price and the number
  lean opposite ways. Neither is wrong; they are different questions, and a
  figure quoted without saying which produces a two-game discrepancy nobody can
  trace. `model_misses.py` uses the spread and reconciles against the report.
- **Pre-rounding a number changes what the page prints.** The case study stores
  season accuracy to six decimals for a reason. At four, 2016's 0.6265060 became
  0.6265, which as a double is *below* 62.65 and rendered 62.6% where the source
  says 62.7%; at five, 2013 flipped the other way. Anything a component formats
  with `toFixed` needs headroom past the last digit a reader sees.
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
- **No em dashes in user-facing copy.** Removed site-wide on 2026-08-22 at the
  operator's request. Three sets are deliberately exempt and should stay that
  way: **quoted material** (`curated-posts.json` holds verbatim X posts and
  `news.json` publisher headlines — rewriting them is misquoting), the
  **`PracticeStatus` data contract** (`"—"` means no practice report; it renders
  as a middle dot and changing the key would break the match silently), and
  **code comments**, which are not on the website.
  - **Two ways an em dash hides from a search.** `&mdash;` is invisible to a
    grep for the character, and sixteen survived the first pass. Python's
    `json.dumps` escapes it, so generated payloads store it escaped and grep
    clean — 66 more were hiding that way. **Crawl the rendered pages; do not
    trust a source grep.**
  - Copied payloads are normalized at the boundary by `src/lib/prose.ts`,
    beside `canonTeams`, because their wording is not ours to edit at source.
- The operator is American — **use American spellings in user-facing copy.**
  Several British spellings had to be removed, and `prose.ts` also fixes the
  prediction pipeline's "defence" on the way in.

- **`scrollLeft` cannot see content clipped inside a box.** It passed the
  rankings table at 360px while an `overflow-hidden` wrapper cut the Bye column
  off. Compare an element's right edge with its container's.
- **`innerText` and copy-paste ignore CSS margins.** A label spaced by `ml-2`
  alone reads as one word to a screen reader. Put a real space in.
- **Measure layout in same-origin iframes at fixed widths.** The preview pane
  clears viewport emulation between turns and drifts routes; an iframe inside
  the page gives honest layout at any width, many views per call.
- **A text crawl for spelling needs inline tags as word breaks**, not stripped
  to nothing, or a chip beside a name reads `DENWil`.
- **`preview_start` reads `.claude/launch.json` once a session**, and
  `autoPort` fights Next 16's per-directory dev lock.
- **Turbopack refuses a symlinked `node_modules`**, so builds in a `git
  worktree` fail. Use `tsc --noEmit` there, and plant a deliberate error to
  prove the check runs.
- **NFL.com's image CDN needs `fl_png32`**: without it 16-bit PNGs, with
  `q_auto` a banding palette.
- **nflverse names need suffixes stripped and position checked**: Jr., Sr. and
  III miss on exact match, one name matched a DL as well as an RB, and the Rams
  are `LA`.
- **CBS's line is gone after kickoff**, and nflweather prints an outdoor
  forecast for games it marks as indoors.
- **A busy iCloud sync hangs `next build`.** The Desktop syncs to iCloud Drive;
  with `cloudd` near full CPU the build stalls after loading its config at 0%
  CPU, `fileproviderd` holding `.next/lock`. `kill -9`, remove the stale lock,
  and wait for `cloudd` to settle; the same build then takes seconds.
- **The NFL injury report's injury can sit in the practice column only.**
  Jerry Jeudy's Week 2 game-report injury is blank and his practice-report one
  is "Wrist". Read both, game report first.

## Commands

```
npm run dev            # localhost:3000
npm run build          # also typechecks; a bad data edit fails here
npm run news           # pull RSS headlines
npm run beat           # pull X posts via Nitter
npm run draft-injury <url>   # draft injury records for review, writes nothing
npm run audit-teams          # check every team against the live roster, writes nothing
npm run games                # superseded by the live pull; still reads ESPN (open item 3)
npm run games -- --week=5    # one week
npm run games -- --all       # the whole season
npm run games:dry            # read and report, write nothing
git pull --rebase            # before any push: the news bot commits to main (open item 21)
```

The extractors are Python and are run directly, not through npm:

```
python3 scripts/curated/weekly_rankings.py --sync-players  # -> rankings/week-N.json, players.json, headshots
python3 scripts/curated/film_summary.py     # -> src/data/film-summary-gb-det-2025-w1.json
python3 scripts/curated/rb_charts.py        # -> src/data/rb-charts.json
python3 scripts/curated/kicker_charts.py    # -> src/data/kicker-charts.json
python3 scripts/curated/defense_charts.py   # -> src/data/defense-charts.json
```

`scripts/refresh-feeds.sh` runs both feed scripts on a timer, for the archive
and the beat feed. It is written but **not installed** — installing it means
loading a launchd agent, which is a persistent change to the machine rather than
the repo:

```
cp scripts/com.vantage.feeds.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/com.vantage.feeds.plist
```

Each takes an optional path argument if the workbook is not the version named in
its `DEFAULT_WB`. They print a summary and warn on anything that does not
reconcile — a correction that no longer matches the sheet, a team listed in two
places at once, a name that is not a real club. **Read that output.** It is the
only thing standing between a bad cell and a published page.

`scripts/curated/` also holds the older workbook screenshot → OCR → JSON
pipeline; see its README.
