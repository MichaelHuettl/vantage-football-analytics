# Project state

Read `docs/BRIEF.md` first — it defines the `§` references in code comments.
This file records where the build actually is, what was decided against the
brief, and what is still open.

Last updated: 2026-08-14.

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
| Positions | Six pages, typographic heroes, methodology text. **Charts are empty slots** |
| Injuries | Training camp section live (49 entries), team filter in the URL. Weekly report empty until Week 1 |
| Film | Three concepts with SVG diagrams, by-team index |
| Games | **Shell only** — no schedule data authored |
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
2. **Charts.** Every `ChartFigure` is an empty slot. Drop PNGs into
   `public/charts/` and set `chart` in the relevant data file.
3. **Games section** has no `schedule.json`.
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
7. **Nitter is fragile.** The beat feed goes through it because X has no free
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

## Gotchas

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
```

`scripts/curated/` re-runs the workbook screenshot → OCR → JSON pipeline; see
its README.
