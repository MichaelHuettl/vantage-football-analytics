# Handoff — the typeface, the film room, and a lot of copy

Written to be read cold, by the session that did the work below.
Everything is committed. Nothing is in flight.

Twenty-one commits, 2026-08-27 to 2026-08-30. `git log --oneline b87e3ee..HEAD`
is the index; the messages carry the reasoning and are long on purpose.

---

## 0. Where things are

Unchanged from the last handoff. Three directories, and they are **not** one
project.

| Path | What | Owner |
| --- | --- | --- |
| `~/Desktop/Claude Code/vantage/` | The Next.js site | yours |
| `~/Desktop/Claude Code/fantasy-model/` | The fantasy projection model. Untouched this session | yours |
| `~/Desktop/nflverse-data/nfl_predictor/` | The game-prediction pipeline | **a peer session — do not edit its Python** |

**Read `docs/BRIEF.md`, then `docs/STATE.md`, then `DESIGN.md`.** DESIGN.md was
rewritten twice this session and is current.

---

## 1. What changed

**The site has one typeface now.** Anton, Barlow Condensed and Barlow became
Roboto. Three faces were tried in one day and the order matters: Archivo went in
first and was rejected as too blocky, Bricolage Grotesque replaced it for
character, then the brief was stated properly — clean, appealing, easy to read
data from — and Bricolage went too.

**Line height and vertical rhythm are on a scale for the first time.** Two
ratios instead of four-plus-patches; seven container paddings became one
standard; five section gaps became two.

**The mark gained its plot grid back and the chrome cut gained one**, plus the
amber area fill and rules either side of "Football Analytics".

**Copy was cut across eight pages**, the home page rethesised on "What actually
wins", and a full editorial audit run over all 21 routes.

**The game prediction model now carries all 18 weeks**, 272 games.

**The beat feed's dead source was replaced** with all 32 club newsrooms, live.

**The film room has real film**: 47 plays from the Lions at Packers Week 1 deck.

**Run-defence matchup tables** are block 07 on the running back page.

---

## 2. Findings that changed what the site claims

The ones a fresh session is most likely to undo by accident.

**The prediction model's one-week limit is a deliberate guard, not missing
data.** `FeatureEngineer._prepare_scoring_frame` filters to the first unplayed
week and the author wrote why: beyond it both teams' rolling state is stale by
construction. The operator asked for all 18 anyway after that was put to him
twice. **Weeks 2-18 are every team at identical preseason form**, varying only by
opponent, rest, venue and market line, and the accuracy figures on that page were
measured on next-week predictions. The payload therefore carries
`features_current` per game and a `forecast_horizon` block, and the page prints
a caveat on every week where the flag is false. **Do not remove that notice
while the flag exists.**

**Nitter is not blocked, it is gone.** Ten public instances tested, none
returning a single item: nitter.net 410, xcancel demanding whitelisting, three
DNS failures, three 403s, a 429 that stayed 429 after a backoff, and a 502. X has
no free read API. No list of accounts fixes this — the transport died. Do not
re-investigate; add an instance to the list only if you have seen it work.

**SB Nation is ruled out the same way ESPN and Yahoo are.** Their network carries
a beat blog for all 32 clubs and every feed works, but robots.txt names
`anthropic-ai` with `Disallow: /`. Available to the operator directly, closed to
an agent. The 32 official club feeds are what the live section uses instead, and
they are labelled as club sources rather than beat reporting because that is what
they are.

**The film deck clips itself.** Its three info boxes are 0.81in tall starting at
5.02in, so they end at 5.83in on a 5.625in slide. PowerPoint and Keynote both cut
the second line off **every one of the 47 slides** — Time, Outcome and DEF, the
result of every play, invisible. Rendering grows the canvas to 5.875in on a copy.
**The original in `~/Downloads` still has this and should be fixed there.**

**`monetised` was in the footer disclaimer, so on every page of the site.** Found
by crawling rendered text; a source grep for British spellings had missed it
because the word was not in the pattern.

---

## 3. Gotchas that cost real time

**`sizes` has to describe the real slot or the image is blurry and nothing
errors.** The film plates declared `900px` while rendering at 1352 CSS px in the
1400px container. On a 2x display that is 2704 real pixels against a 1080px
source — a two-and-a-half-times upscale that looks exactly like a bad export.
Measure `getBoundingClientRect().width * devicePixelRatio` before blaming the
source.

**Next 16 rejects an unlisted image `quality` with a 400, not a fallback.**
`<Image quality={85}>` returns `"q" parameter (quality) of 85 is not allowed` and
the image does not load at all. `images.qualities` in `next.config.ts` is the fix;
75 is the only value allowed by default.

**Test horizontal overflow with `scrollLeft`, not `scrollWidth`.** Comparing
`documentElement.scrollWidth` to `clientWidth` reported a page-level overflow at
360px that does not exist: the narrow-screen nav's `-mx-4` and its own 788px
internal scroller inflate the computed value. Setting `scrollLeft` and seeing
whether it moves is the real test.

**A crawler that strips inline tags to a space invents punctuation errors.**
The first copy audit produced pages of `127 ,` and `76.3% .` because
`<strong>127</strong>,` became `127 ,`. Strip block tags to a newline and inline
tags to nothing.

**Python's `json.dumps` escapes the em dash**, so a generated payload greps clean
for `—` while containing `—`. Known before, met again.

**Re-running an extractor reverts hand-cleanups.** `defense_charts.py` restored a
workbook em dash and two whitespace slips that had been fixed by hand in the
payload. The durable answer is boundary normalisation like `prose.ts` does for the
prediction payloads; `normalizeDashes` exists and `defense.ts` does not call it.

**Two `next dev` servers cannot share a directory.** Next 16's lock is
per-directory, not per-port, so `autoPort: true` in `.claude/launch.json` starts a
second server on a free port and it exits 1 anyway.

**The browser pane got worse, not better.** On top of the known hidden-pane
problems: it reported `naturalWidth` of 901 on an image curl confirms is
2560x1504, it drifted to other routes mid-check twice, and scroll-then-screenshot
returns blank almost every time. **curl plus parsing, and reading the built HTML
in `.next/server/app/`, are what actually worked.**

---

## 4. Decisions the operator made — do not re-litigate

- **Everything from the previous two handoffs stands**:
  `historicalfantasyfootballstats.com` off limits, the film room's deleted
  concepts, the **Sample** badge being load-bearing, licensed 4for4 columns on
  the RB and TE pages, GSAP/Lenis/smooth-scroll rejected, no shadcn, the
  narrow-screen nav being the scrolling row.
- **Roboto, the sans.** Verified three ways because six families share the name.
  Archivo (too blocky) and Bricolage (too irregular for data) were both tried and
  rejected the same day.
- **The full-season prediction payload**, with the staleness caveat, after the
  trade-off was put to him twice.
- **The club newsroom feed is labelled as club sources**, not beat reporting.
- **The film is a "Sneak peek"** under an in-production notice that now leads the
  page. He wrote "peak"; it ships as "peek".
- **The film deck was normalised at his request** — bold labels with plain
  values, "Outcome" replacing Result and Playcall, empty DEF filled from
  Pre-play. This reverses his earlier "do not change any of the slides", which
  applied to the first pass only.
- **The RB source footers were deleted**, including the licensed-source
  disclosure. Publishing those columns is still his decision; the page just no
  longer says where the route data came from.
- **The "if a number is not in the glossary that is a bug" line was dropped**
  from the method band.

---

## 5. Corrections I made to my own claims

- Told him Sleeper trending was "the Sleeper accounts still working". Wrong
  framing: the Sleeper *API* works, the Sleeper *X accounts* are as unreachable
  as everyone else's. The transport is the blocker, not the account list.
- Called a horizontal-overflow regression at 360px. There was none; my test was
  wrong.
- Recommended Bricolage on a brief of "not blocky", then changed the
  recommendation once the brief turned out to be clarity. The width axis I had
  called a hard filter partly inverts under that brief, because condensed
  uppercase at 10px is harder to read, not easier.
- Put the film reel above the Coming soon panel when he had asked for the notice
  to lead, and left the section he had pointed at reading "12 days ago".
- Put an em dash in new RB copy and caught it before commit.
- Shipped `quality={85}`, which 400s on every plate, and caught it by curl.

---

## 6. Open items

`docs/STATE.md` has the full list. New or changed this session:

1. **`SPEC_multiweek_scoring_frame.md`** is filed in `~/Desktop/nflverse-data/`
   asking the backend session for a supported `scoring_horizon` parameter. When
   it lands, delete `scripts/curated/game_predictions_full_season.py` rather than
   keeping it.
2. **The prediction payload is 2.9 MB**, up from 188 KB, and `public/` is 39 MB
   with the film. Worth watching, not yet a problem.
3. **The weekly and rest-of-season ranking scopes are empty locations.** Each
   empty state names the file to create *and* the `content.ts` import it needs,
   because that module imports statically on purpose.
4. **`defense.ts` does not call `normalizeDashes`**, so a re-extraction puts a
   workbook em dash back into the payload.
5. **The film deck's original still clips**, Pre-play is blank on slide 16, and a
   long score runs into Down/Distance. All the deck's own layout.
6. **The game tracker's key players are worth confirming** — Mike Evans on San
   Francisco, Myles Garrett on the Rams, DJ Moore on Buffalo. From
   `key-players.json`, plausibly real 2026 movement, not touched on a hunch.
7. **`rb_charts.py` still targets the `(2)` workbook.** Fourth session running.
   `rb_matchups.py` was written as a separate extractor specifically to avoid it.
8. **The injury tracker's `Updated` column** was justified on a measurement
   scoped to players inside a relevance cutoff that no longer exists. Half the
   182 rows are now from the population where that field was measured to rot.
   Never chased.

---

## 7. Running things

```bash
cd ~/Desktop/Claude\ Code/vantage
npm run build          # the check that matters
npm run news           # refreshes news.json
npx impeccable detect src
python3 scripts/curated/rb_matchups.py
```

`detect` reports **9 findings and has all session**: five are known false
positives (four on `ChartFigure`'s goalpost frame, one on the yardlines), four
are the display clamps that are still open.

The full-season prediction payload is regenerated with:

```bash
~/Desktop/nflverse-data/.venv/bin/python scripts/curated/game_predictions_full_season.py
```

That imports the peer session's package and swaps one method on the class for the
life of the process. **It edits no file in their repo** — verified by hash before
and after — but `pipeline.run()` does rewrite their `artifacts/` reports.

---

## 8. Standing rules

Unchanged, and all of them earned:

- `src/app/globals.css` is the only source of colour and type. **No hex in a
  component** (§7). Weight and width are tokens too now.
- Amber is for the focal thing on screen, one per screen (§7).
- **No thick coloured side border on a card.**
- **No React component computes a metric** (§11).
- No em dashes in user-facing copy. Comments and quoted material are exempt.
- American spellings. Empty states are directions, not apologies (§8).
- **`npm run build` is the check that matters.**
- Commit in logical pieces, and put the reasoning in the message.
