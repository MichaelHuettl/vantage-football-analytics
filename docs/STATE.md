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
| Injuries | Training camp section live (47 entries). Weekly report empty until Week 1 |
| Film | Three concepts with SVG diagrams, by-team index |
| Games | **Shell only** — no schedule data authored |
| News | **Live** — RSS headlines + 118-post beat archive, both auto-refreshing |
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

1. **Team data is only partly audited.** Teams for the 80 skill players were
   derived from the workbook's *2025* target-share sheet, so anyone who moved
   in 2026 free agency is wrong — and a wrong team also means a wrong bye week
   on the rankings page. Two are confirmed and fixed (AJ Brown → NE, Jaylen
   Waddle → DEN). **The other 78 are unverified.** FantasyPros is JS-rendered
   and could not be bulk-parsed. This is the highest-value outstanding fix.
2. **Two injury records are contradicted by the live feed.** Puka Nacua is
   reported as *psoas* soreness, not groin. Jeremiyah Love picked up an ankle
   injury on Aug 13 per HC Mike LaFleur and is not in `camp-injuries.json` at
   all.
3. **Charts.** Every `ChartFigure` is an empty slot. Drop PNGs into
   `public/charts/` and set `chart` in the relevant data file.
4. **Games section** has no `schedule.json`.
5. **Nitter is fragile.** The beat feed goes through it because X has no free
   read API. X blocks it periodically. `fetch-beat.mjs` tries multiple
   instances, never wipes data on failure, and is `continue-on-error` in CI, so
   an outage makes the section stale rather than empty. If it stops updating,
   that is the first thing to check.

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
- **Smart punctuation breaks naive regex.** A filter written with `'` missed
  `'`. `scripts/lib/signal.mjs` normalises before matching; do the same
  anywhere else text is pattern-matched.
- The operator is American — **use American spellings in user-facing copy.**
  Several British spellings had to be removed.

## Commands

```
npm run dev            # localhost:3000
npm run build          # also typechecks; a bad data edit fails here
npm run news           # pull RSS headlines
npm run beat           # pull X posts via Nitter
npm run draft-injury <url>   # draft injury records for review, writes nothing
```

`scripts/curated/` re-runs the workbook screenshot → OCR → JSON pipeline; see
its README.
