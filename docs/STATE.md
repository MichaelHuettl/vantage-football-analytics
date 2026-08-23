# Project state

Read `docs/BRIEF.md` first — it defines the `§` references in code comments.
This file records where the build actually is, what was decided against the
brief, and what is still open.

Last updated: 2026-08-22.

---

## Start here

If you are picking this up cold, in this order:

1. **`docs/BRIEF.md`** — the brief. Every `§` in the codebase points at it.
2. **This file** — what is built, what was decided, what is still open.
3. **`git log`** — every change carries its reasoning in the commit message.
   `git log --oneline -30` is a faster history than any summary of it.

**The workbook is the source and it is versioned.** The current one is
`~/Downloads/2026-2027 Fantasy Football Analytics (Original) (4).xlsx`.
Each new version the operator sends is a new file, and **sheet numbers and row
numbers both shift between them** — the (4) sheet inserted success-rate and
DVOA blocks at rows 115-146 and pushed everything below down, and moved a
coverage column from F to G. Every extractor names the version it targets in
`DEFAULT_WB`; when a new one arrives, re-run each script and read the row map
before trusting the output.

**Nine extractors feed the site** and write JSON into `src/data/`. The first
five are the only things that touch the workbook; the last four read a PDF, the
nflverse export and the prediction pipeline's artifacts instead:

| Script | Writes | Covers |
| --- | --- | --- |
| `scripts/curated/rb_charts.py` | `rb-charts.json` | RB scatters, historic RB 1-3, opportunity share |
| `scripts/curated/kicker_charts.py` | `kicker-charts.json` | FG attempts, kicker scoring, advantages, board |
| `scripts/curated/defense_charts.py` | `defense-charts.json` | 9 defense blocks + coordinators |
| `scripts/curated/te_charts.py` | `te-charts.json` | 5 TE scatters, history, TE1-3/4-6 grids |
| `scripts/curated/wr_charts.py` | `wr-charts.json` | 3 WR scatters, notable names, check-the-box grid |
| `scripts/curated/qb_charts.py` | `qb-charts.json` | 4 QB scatters + correlations (**reads a PDF**) |
| `scripts/curated/player_profiles.py` | `player-profiles.json` | 79 player profiles (**reads the nflverse export**) |
| `scripts/curated/model_misses.py` | `model-misses.json` | Case study: 292 misses, 16 season folds (**reads the pipeline's report + artifacts**) |
| `scripts/curated/fantasy_model.py` | `fantasy-model.json` | Fantasy projections, accuracy, boards (**copies a payload, computes nothing**) |

**Nothing is scheduled.** There is no git remote, so no GitHub Action has ever
run. Every feed and fetch happens when someone types the command (see open
item 1 and the Commands section).

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
| Home | Built. Lambeau hero, eight section cards (the count in the copy is read off the card list, not typed beside it), Walsh "audit the argument" band |
| Rankings | **Live with real data** — 120 players, 6 positions, PPR draft ranks |
| Positional Data | Index cards carry a photo per position in a shared 2:1 frame, and head on `evaluated_on` — the family of statistics a position is judged on — Six pages, and **all six are built** — one column each: methodology, then the evidence. The two-column slot-and-pool placeholder is no longer used by any position |
| Injury Database | **Season tracker pulls live** — the camp section is now a league-wide table on the news page's pattern, pulled at request time and re-rendered on `AutoRefresh`. The 58 hand-authored records are the floor and merge *under* the wire, never overwritten; a wire status and a written record sit in adjacent columns and the row says so where they disagree. Team filter in the URL. Weekly report empty until Week 1 |
| Film | **One sample breakdown**, rebuilt from the operator's own PowerPoint template, above a by-team index over all 32 clubs whose cards are all empty. `PlayDiagram`, `/film/[concept]` and the `PlayConcept` shape are all kept |
| Game Tracker | **All 18 weeks navigable** — 272 matchups, week selector, key players per team. Lines/scores/weather come from `npm run games` |
| News | **Headlines pull live at request time**; 139-post beat archive still refreshed by hand. See open item 1 |
| Fantasy Football Model | **Built**, at `/fantasy-model` — a 1-point-PPR projection model over 153,026 player-weeks, 1999-2025. Four tabs: method, accuracy, the tested 2025 season and the 2026 board. The accuracy tab **opens with a conclusion panel** — what holds up, what does not, and how much room is left against a measured ceiling (an oracle knowing each player's own season median hits 78.5% at the 8-point band; the model reaches 94% of that) — then publishes **hit rates as well as average error**, at two scales. Weekly: 73.5% of startable player-weeks within **8** points against 67.7% for recent form. Season-long: 63.6% of seasons within **40** points against 61.1% for repeating last year, measured **from the model's projection on each player's first row of the season**, which is the only version of that number a drafter could have had. **Both bands were chosen on the size of the edge, not on significance** — see open item 15. `hit_rates.py` in the model repo computes both; the export **fails rather than omits** if it has not run. See open item 14. Every board is scoped to a position and the position is in the URL. The 2026 board **only recommends players with sixteen prior games** and names the 24 it excludes, with the rank each would have held (see open item 13). Payload copied from `~/Desktop/Claude Code/fantasy-model/` |
| Game Prediction Model | **Built**, at `/model` — methodology, confidence tiers, a **case study of every miss**, and a page per game for 16 week-one matchups. Named by the operator on 2026-08-21; the route is the short `/model` rather than the full name. The payload file keeps its `game-predictions.json` name — that is the prediction pipeline's export filename and this repo only copies it |
| Player pages | 120 generated. **79 carry a profile** — season line, Next Gen, year-to-year, game log. The rest say plainly that there is nothing recorded |
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
   - **Injury headlines** from Draft Sharks, headline and link only (§2).

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
3. **Games is fetched, not authored, and nothing schedules the fetch.**
   `npm run games` fills lines, implied totals, scores, per-team leaders and
   weather; by default it does the weeks with a game between 7 days ago and 14
   days ahead, so in season it is a weekly command. Like the news feeds, it
   only runs when someone runs it — see item 1. Week 1 lines are loaded;
   everything else waits on the season. The defensive leader is ESPN's sack
   leader, falling back to tackles: neither is "who decided it", so it is worth
   overriding by hand on a game that turned on one play.
4. ~~**Daniel Carlson is ranked K16 and unsigned.**~~ **Closed.** The operator
   made the editorial call: an unsigned kicker does not belong on a draft
   board, so Carlson is off the K board entirely and Chase McLaughlin is in at
   7. He still appears on the kicker page's scoring tables, with an FA marker,
   because those record what he did rather than who to take.
5. **The film room holds one sample play and no analysis.** `concepts.json` is
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
9. **Nitter is fragile, and was blocked on 2026-08-17.** Five national insiders
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
| Analytics workbook | `~/Downloads/2026-2027 Fantasy Football Analytics (Original) (4).xlsx` — **versioned; each new one is a new file and shifts rows** |
| Defense scoring history | `scripts/curated/data/dst-history.json` — 2021-24 with components, transcribed from screenshots, not in the workbook |
| Rankings source | Sheet 2 "Mock Drafts & Rankings", rows 80–99, cols B–G, labelled **"My Rankings (WIP)"** |
| Injury source | Sheet 11 "Key Injuries" — rehab block rows 3–72, camp block rows 74–91 |
| X screenshots | Sheet 10 "Offseason News" — 117 images in 32 team columns |
| Headshots | `~/Desktop/Player Photos/` — 100 transparent cutouts by position |
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
- **Chase McLaughlin is on the kicker board but not in `players.json`.** He has
  no player page and no headshot, so his card falls back to initials. Adding
  him means adding a 21st kicker to the K rankings, which is a ranking decision
  rather than a data fix.

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

The three workbook extractors are Python and are run directly, not through npm:

```
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
