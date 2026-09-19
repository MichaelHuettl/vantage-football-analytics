# Handoff — live tracker, weekly rankings, a spelling audit, and a move of host

Written to be read cold, by the session that did the work below.
Everything is committed. **The operator is moving the site to a new host**, so
§2 is the section to read before anything else.

Eight commits of work, 2026-08-31 to 2026-09-19, with about 480 `Feeds:`
commits from the news bot interleaved. The index:

```
git log --oneline --no-merges 738301a..HEAD | grep -v "Feeds:"
```

The messages carry the reasoning and are long on purpose.

---

## 0. Where things are

| Path | What | Owner |
| --- | --- | --- |
| `~/Desktop/Claude Code/vantage/` | The Next.js site. **On GitHub now**: `MichaelHuettl/vantage`, private | yours |
| `~/Desktop/Claude Code/fantasy-model/` | The fantasy projection model. Untouched this session | yours |
| `~/Desktop/nflverse-data/nfl_predictor/` | The game-prediction pipeline | **a peer session — do not edit its Python** |
| `~/Desktop/nflverse/` | Parquet mirror of nflverse + `nflverse.duckdb` | yours; not a repo |

Read `docs/BRIEF.md`, then `docs/STATE.md`, then `DESIGN.md`. STATE.md was
brought current in the same commit as this file.

**The workbook changed name.** The operator's newest is
`~/Downloads/2026-2027 Vantage Football Analytics (Original).xlsx` —
"Vantage", not "Fantasy". Only `weekly_rankings.py` reads it. Every other
extractor still names an older file in `DEFAULT_WB` (see §7).

---

## 1. What changed

- **Game tracker pulls live** from CBS (scores, state, current line) and
  nflweather (forecast) at request time, merged over `schedule.json`. Week 1's
  results reached the site for the first time. `b3bf4ea`.
- **Weekly rankings.** Week 1 (updated 2026-09-08) and Week 2 (2026-09-16) from
  the workbook's Rankings sheet; rest-of-season scope removed. 48 players added,
  39 headshots. `759703f`.
- **Rankings table fits a phone.** The Bye column was clipped at 360px on every
  list, draft included. `c43e19d`.
- **Site-wide text audit**: nine corrections, short forms capitalised, three
  labels given real spaces. `7fe838d`.
- **"By Michael Huettl"** under the home lockup, in the footer, and in
  metadata. `9bec624`.
- **Film room**: a "What Green Bay ran" summary above the reel (`d0b47c7`), and
  the plates cropped to the field with their info fields printed as text
  (`f84a135`).
- `.claude/launch.json` lost `autoPort` (`461a5f8`) — see §4.

---

## 2. Deploying: what any host needs

The operator is changing host. Nothing here is host-specific; it is what the
site requires wherever it runs.

1. **A server, not static hosting.** Six routes render per request —
   `/news`, `/injuries`, `/games`, `/rankings`, `/model`, `/fantasy-model` —
   and three of them call outside sources on render. **GitHub Pages or any
   static export cannot run this site**; it would serve a broken half of it.
   Vercel runs Next.js natively. Netlify, Cloudflare and others go through an
   adapter, and whether their adapters support **Next 16.3** was not verified.
   A plain Node host runs `npm run build` then `npm start`.
2. **`NEXT_PUBLIC_SITE_URL`, set at build time.** It is the only environment
   variable the site reads (`src/app/layout.tsx`). It builds the absolute URL
   of every share-card image, and it falls back to `http://localhost:3000`, so
   without it **every shared link previews a broken image**. `NEXT_PUBLIC_`
   values are inlined when the site builds, so set it before the first build,
   and rebuild if the domain changes.
3. **Node 22.** `.github/workflows/news.yml` uses 22; this machine runs 26.
   Pin it on the host rather than trusting its default.
4. **Outbound HTTP from server functions, with room to wait.** Request-time
   pulls hit CBS, nflweather, four publisher RSS feeds, 32 club newsrooms,
   Sleeper, CBS injuries, DraftSharks and Sharp, with timeouts of 15 to 30
   seconds. Check the host's default function timeout; a short one fails these
   on a cold cache. The pulls are cached in-process, so on serverless each cold
   instance pulls afresh, which is more upstream traffic than one server.
5. **Next image optimisation.** `next.config.ts` allows `qualities: [75, 85]`
   and Next 16 **400s any other value** rather than falling back. The film
   plates request 85.
6. **Access to a private repo.** Whatever host is connected needs to be granted
   `MichaelHuettl/vantage` explicitly.

**The news bot pushes to `main` about 26 times a day** (§3). A host that
deploys on every push will rebuild that often. Either switch the workflow's
schedule off or tell the host to skip builds whose only change is
`src/data/news.json`.

---

## 3. Findings that changed what the site claims

**The news workflow has been running since the repo reached GitHub.** STATE.md
said "no GitHub Action has ever run"; it was true until 2026-09-01. Since then
`news.yml` has committed about 480 times, every one touching only
`src/data/news.json`. Measured on 2026-09-19: 400 runs since 09-04, all green,
about 26 a day at a median 1.4 minutes. GitHub bills each run up to whole
minutes, so roughly 1,500-1,600 billed minutes a month on a private repo,
against a 2,000-minute free allowance. The operator was told and has not
decided. Its value is now small: `/news` pulls live on every render, and this
only refreshes the outage floor.

**Every push needs a rebase first.** The bot keeps committing, so local `main`
falls behind within the hour. `git pull --rebase` before pushing. The bot's
commits touch nothing but `news.json`, so rebasing over them has not
conflicted.

**ESPN is closed to this agent, and the tracker no longer uses it.** ESPN's
robots.txt names `anthropic-ai` with `Disallow: /`. `site.api.espn.com`, which
the old tracker read, refuses to serve a robots.txt at all. CBS disallows
nothing under `/nfl/scoreboard/` except to GPTBot; nflweather has no rules.
`npm run games` still reads ESPN and is now redundant.

**Headshots come from NFL.com, not ESPN.** The operator asked for ESPN. nflverse
carries each player's NFL.com Cloudinary URL, and that CDN has no robots.txt.
Same league photo shoots, same framing, and it resizes server-side.

**Wil Lutz is spelled correctly.** The operator believed "Will" was right. The
NFL roster has his first name as William and his football name as Wil; the site
has said Wil since the 2026-08-14 audit. It stays. The workbook's "Will" is the
typo, and `weekly_rankings.py` corrects it.

**CBS publishes a line only before kickoff.** Finished games show no closing
line: Week 1 keeps the August lines from `schedule.json`, and later weeks show
none once they start.

---

## 4. Gotchas that cost real time

**`scrollLeft` cannot see content clipped inside a box.** The handoff before
this one recommended moving `scrollLeft` to test overflow, and it is right for
the page. It passed the rankings table at 360px while an `overflow-hidden`
wrapper cut the Bye column off. Compare an element's right edge with its
container's.

**`innerText` ignores CSS margins.** Three labels looked spaced on screen
through `ml-2` and read "marketbest" and "Allowedread" to a screen reader.
Separation that matters has to be a character.

**Measure layout in iframes, not the pane's viewport.** Viewport emulation is
cleared between turns and the pane drifts to other routes mid-check. A
same-origin `<iframe>` at a fixed width inside the page gives honest layout at
any width, many views in one call. That is how the 18 rankings views were
measured.

**Stripping inline tags to nothing glues words.** The previous handoff's rule
avoids fake punctuation, but a chip beside a name becomes `DENWil`. For
spelling, turn inline boundaries into a zero-width break instead. The first
pass flagged 266 words; that change took it to 67.

**`preview_start` reads `.claude/launch.json` once per session.** And
`autoPort` fights Next 16's per-directory dev lock: it picks a free port, then
exits 1 because another server holds the directory. The fix is removing
`autoPort`, but it only takes effect next session; within one, stop the old
server.

**Turbopack will not build through a symlinked `node_modules`** ("points out of
the filesystem root"), so `git worktree` builds fail. To check a commit in
isolation, run `tsc --noEmit` in the worktree with the main repo's binary, and
plant a deliberate error first to prove the check is not vacuous.

**Node 26 runs TypeScript directly.** A module with no aliased imports can be
tested with `node file.mts` against saved HTML. `scoreboard-parse.ts` is built
that way on purpose.

**NFL.com's Cloudinary needs `fl_png32`.** Without it, 16 bits a channel at
157 KB. With `q_auto`, a 256-colour palette that bands on skin.
`f_png,fl_png32,c_fill,w_320,h_232` matches the existing set exactly.

**A headshot file already on disk may be stale.** Daniel Carlson's was from
2026-08-12, when he was a Raider. The weekly script now always fetches for a
player it is adding. And **overwriting an image in place needs the optimiser
cache cleared** (`.next/dev/cache/images`) before the dev server shows it.

**nflverse name matching needs suffixes stripped and position checked.** Chris
Godwin **Jr.**, Deebo Samuel **Sr.** and Luther Burden **III** missed on exact
match. Quinshon Judkins matched twice, once as a DL. The Rams are `LA`, and an
older snapshot had Arizona as `AZ`.

**The August nflverse roster was too old.** It placed Daniel Carlson nowhere;
the release current through Week 2 has him in New Orleans. Download the
current CSV rather than trusting the mirror.

**A re-run can reproduce a generated file with only its date changed.**
`film_summary.py` stamps `generated_at`. When nothing computed changed, restore
the file rather than commit a date.

---

## 5. Decisions the operator made — do not re-litigate

- Everything in the previous two handoffs stands.
- **"By Michael Huettl".** "Built by" was suggested on §11's grounds and
  declined. One constant in `src/lib/site.ts`.
- **Wil Lutz stays Wil** (§3).
- **Week 1 duplicates**: Bears stay at DST 8 with the Cowboys at 17; Will
  Reichard stays at K 12 with Ryan Fitzgerald at 16. In `CORRECTIONS`.
- **No rest-of-season rankings.** Draft and weekly only.
- **Draft lists untouched.** The workbook's Draft block differs from the site's,
  and the site's order is the operator's own hand re-rank.
- **Film summary is about the offense.** Staying-on-schedule, disguise and
  pressure sections were cut, as were the lede and footnotes. Motion is counted
  from the plates' grey line, 20 of 47; play 10's jet motion is drawn red and
  deliberately not counted.
- **Coming soon copy**: "Enjoy a sneak peek of full film from a personal
  favorite in-person attended game." He wrote "peak"; it ships "peek".
- **The film provenance note is off the page.** It stays in the JSON.
- **Short forms in capitals** in both models' labels.
- **Ken Walker reads Kenneth Walker.** The chart label stays "K. Walker".

---

## 6. Corrections I made to my own claims

- Told the operator Netlify needed **no environment variables**. Wrong:
  `NEXT_PUBLIC_SITE_URL` (§2). Corrected to him.
- Said the `p## 2.jpg` film duplicates were "shipping in `public/`". They are
  gitignored and exist only locally.
- Counted eight, then nine uncommitted files when there were seven.
- Wrote "the second-half carries were not being earned" over a whole-game
  stuffed rate. Caught before commit.
- Told the operator the motion line on the first plate I opened was red, not
  the grey he described. That plate was the jet play, the one exception; the
  deck's convention is grey, which he had right.
- A re-crawl ran with the dev server down and "resolved" words that were never
  checked. It was discarded and re-run in full.

---

## 7. Open items

`docs/STATE.md` has the full list. The ones worth knowing:

1. **Set `NEXT_PUBLIC_SITE_URL` on the new host** before its first build.
2. **Decide on the news bot** (§3): off, or excluded from triggering builds.
3. **The live tracker has not met a live game.** Built on Saturday
   2026-09-19. Finals and pregame are verified against real pages;
   the in-progress card is parsed defensively and falls back to the schedule if
   it fails. **Check `/games` during a game** — the card should read "Live" with
   CBS's clock.
4. **Retire `npm run games`.** It still reads ESPN and the live pull replaces it.
5. **Extractors point at old workbooks.** `rb_charts.py` names `(2)`;
   kicker, defense, TE, WR and QB name `(4)`. Only `weekly_rankings.py` reads
   the new "Vantage" file. Re-map before re-running any of them.
6. **Publishing Week 3**: fill the Week 3 block, add `3: "YYYY-MM-DD"` to
   `PUBLISHED` in `scripts/curated/weekly_rankings.py`, run it with
   `--sync-players`, then import `week-3.json` in `src/lib/content.ts` and add
   it to `WEEKLY_FILES`.
7. **Stat lines still use lower-case short forms** — "15 tgt · 55 rec yds",
   "Rush att", "ppg". The operator asked only about model labels.
8. **Git identity is unset.** Every commit's author is the machine-derived
   `michaelhuettl@Michaels-MacBook-Pro.local`, which GitHub cannot link to his
   account. His call.
9. **Offered and not taken up yet**: his name on the share-card images, and an
   About page. The About page needs a bio and links from him.

Closed this session: STATE.md item 19 (`defense.ts` now normalises its prose,
as do the kicker and RB payloads), and the previous handoff's item 6. Mike
Evans (SF) and DJ Moore (BUF) are confirmed by the current nflverse roster.

---

## 8. Running things

```bash
cd ~/Desktop/Claude\ Code/vantage
git pull --rebase                  # the news bot will have committed
npm run build                      # the check that matters
python3 scripts/curated/weekly_rankings.py --sync-players
python3 scripts/curated/film_summary.py
npx impeccable detect src          # 4 anti-patterns + 5 advisory, all known
```

`detect` reports the same nine findings as before, now split into four
"anti-patterns" (ChartFigure's goalpost frame) and five "advisory" (the
yardlines and the four display clamps). None is in anything touched this
session.

---

## 9. Standing rules

Unchanged, and all of them earned:

- `src/app/globals.css` is the only source of colour and type. **No hex in a
  component** (§7).
- Amber is for the focal thing on screen, one per screen (§7).
- **No React component computes a metric** (§11). Server-side data modules may;
  `live-games.ts` derives implied totals for that reason.
- No em dashes in user-facing copy; none in any of 540 rendered pages as of
  2026-09-19. American spellings; `prose.ts` fixes copied text at the boundary.
- **Never estimate a return date** (§5.3). Empty states are directions (§8).
- **`npm run build` is the check that matters.**
- Commit in logical pieces, reasoning in the message. **Push only when the
  operator says**: a push can redeploy the live site.
