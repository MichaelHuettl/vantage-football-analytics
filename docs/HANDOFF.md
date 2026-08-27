# Handoff — Vantage, the design pass, and the injury tracker

Written to be read cold, by the session that did the work below.
Everything is committed. Nothing is in flight.

---

## 0. Where things are

Three directories matter, and they are **not** one project.

| Path | What | Owner |
| --- | --- | --- |
| `~/Desktop/Claude Code/vantage/` | The Next.js site. 27 commits this session | yours |
| `~/Desktop/Claude Code/fantasy-model/` | The fantasy projection model. Untouched this session | yours |
| `~/Desktop/nflverse-data/nfl_predictor/` | The game-prediction pipeline | **a peer session — do not edit its Python** |

**Read `docs/BRIEF.md`, then `docs/STATE.md`, then `DESIGN.md`.** The brief says
*why* and code comments cite it constantly as §2, §5.3, §7, §11. STATE.md says
what is built and what is still open. DESIGN.md is new this session: the visual
system as it actually stands, tokens and all.

`git log` carries the reasoning for every change. That is this project's
convention and it is worth reading before changing anything you did not write.
The messages are long on purpose.

**Twenty-two skills are installed globally** in `~/.claude/skills/`, up from
eight. New: `impeccable` (1 skill, 23 `/impeccable` commands, 59 detector rules)
and all thirteen `taste-skill` entries. **impeccable also installed hooks** into
`~/.claude/settings.json` — PostToolUse on Edit/Write and a Stop deep pass — so a
design check now runs on every turn in every project. `npx impeccable detect src`
runs the deterministic rules standalone with no LLM.

---

## 1. What changed this session

**The brand mark was replaced**, in three cuts the operator supplied: `Emblem`
(detailed, home lockup only), `Goalpost` (plain, header and footer), and a
favicon. A full icon set is generated from one SVG.

**The site got entrance motion and a glare hover**, both pure CSS, no
dependency. Home page and the six position cards.

**Ten routes now generate share cards.** There was no `og:image` and no
`twitter:card` on the site at all before this.

**`DESIGN.md` was written** and immediately earned its keep: it turned the
detector into a conformance check and found real type-scale drift.

**The side-tab callout was retired** — eleven copies of a `border-l-4` card
across eight components, replaced by one `Callout` component.

**The injury tracker was rebuilt substantially**: an Updated column, headlines
matched to players by name, composed written records, plain writing throughout,
two new sources, and no relevance cutoff.

**The narrow-screen nav went to a vaul drawer and came back.** Reverted the same
day at the operator's request; vaul and Radix are uninstalled.

---

## 2. Findings that changed what the site claims

These are the ones a fresh session is most likely to undo by accident.

**The favicon was the `create-next-app` default the entire time.**
`src/app/favicon.ico` had never been touched, and Next's file-based convention
emits it as the *first* `<link rel="icon">`, ahead of everything
`metadata.icons` declares. Browsers preferring `.ico` were showing the Next.js
logo while `layout.tsx` pointed confidently at the Vantage one. Nothing
references that file — its **location** is the reference — so a source grep for
the brand path finds the metadata line and misses it entirely.

**Sleeper publishes a per-player `news_updated` and the pull was discarding it.**
158 distinct values across 160 injured players, median one day old inside the
old cutoff. It is now the Updated column. Read it for what it is: the last time
*any* news about that player moved, not a timestamp on the injury.

**Sleeper says "Undisclosed" for a fifth of the players shown, and CBS can name
nearly half of them.** Measured before building anything: 61 of 67 relevant
injured players appear on CBS or Sharp, and **9 of 19 undisclosed rows get a
real body part** — Nacua groin, Kirk calf, Downs calf, Egbuka toe.

**The relevance cutoff was hiding more than half the injuries.** It sat at
Sleeper search rank 400 and dropped **90 of 158** designated skill players, 36 of
them on a serious status. It is gone. The table went 93 rows to 182 across all
32 teams. **Do not reintroduce a rank filter to shorten the page** — filter by
team, which the page already does.

**ESPN's robots.txt names `anthropic-ai` with `Disallow: /`.** Its
`User-agent: *` rules would permit `/nfl/injuries`, so **this is available to the
operator directly**; what is ruled out is an agent fetching it. CBS and Sharp
name no Anthropic agent and disallow neither path — checked, not assumed.

---

## 3. Gotchas that cost real time this session

**Scroll-driven animation, three separate traps**

- **A `view()` timeline cannot animate an element already on screen.** The range
  is positional, so an element inside the viewport at load starts part-way
  through it and never plays from the beginning. With `opacity` in the keyframe
  it sits permanently dimmed at whatever progress it loaded at, and reads as
  "that card didn't get the effect". Card grids therefore use the **load-time
  `rise` with a delay off the index**; `.reveal` animates transform only.
- **The `animation` shorthand silently kills `duration: auto`.**
  `animation: name 1ms linear both` on a view timeline looks right and does
  nothing — the animation finishes in the first sliver of the range and holds
  the end state across all of it. Write the longhands.
- **The global reduced-motion reset does not cover view timelines.** It
  collapses `animation-duration`, which is meaningless to a positional timeline.
  Motion classes are defined *inside* `prefers-reduced-motion: no-preference`
  rather than undone afterwards.

**The preview pane runs hidden, and that breaks three kinds of measurement**

`document.visibilityState` is `hidden`, so `requestAnimationFrame` never fires.
CSS animation `currentTime` stays at 0, a `ViewTimeline`'s `currentTime` stops
updating on scroll even while `getBoundingClientRect` keeps moving, images never
decode (so canvas readback returns nothing), and vaul's close sequence never
completes. **Reading opacity through `javascript_tool` reports working motion as
broken.** Three things do work: driving the animation manually
(`animation.currentTime = t`, then read computed style), disabling the
transition and checking the end state, and **screenshots, which force a real
paint**. Measure image luminance from the files with `sharp` instead.

**satori is not a browser**

A `repeating-linear-gradient` is flattened into one blended fill: it drew no
stripes *and* silently lifted the OG card's background off the brand black to
`#1e242a`. The card looked fine. Sampling its pixels is what found it. Draw
repeated elements explicitly. satori also cannot read the woff2 that
`next/font` caches, which is why `assets/fonts/` holds TTFs.

**Name matching, twice bitten**

- **Substring folding needs a length floor, and any floor big enough breaks
  real names.** Folding to bare letters requires a floor to stop `bonix`
  matching inside "turbo nixed" — and any floor that does that also discards
  `jamarrchase` at eleven characters, silently dropping half the league.
  **Compare token sequences instead.** No floor needed.
- **Apostrophes, again.** `news.json` carries 19 headlines with a curly
  apostrophe and 32 with a straight one. Delete them rather than treating them
  as separators, so "Ja'Marr"/"Ja’Marr"/"JaMarr" agree. Allow a trailing `s` on
  the last name token or possessives never match.

**Tooling**

- **`npx impeccable install --help` runs the installer.** It does not print
  help. It took the default project scope and wrote into the working directory
  before the intended global install.
- **macOS `"file 2.ts"` duplicates in `.next/types` break `tsc`** with
  duplicate-identifier errors that look like your own code. `find .next -name
  "* 2.ts" -delete`.
- **Claude in Chrome is not connected** on this machine, so there is no visible
  browser to fall back to when the pane's hidden state matters.

**Everything from the previous handoff still holds** — the nflverse download
traps, `curl -f`, pre-rounding, image cache-busting by rename, and the browser
pane being unreliable in general.

---

## 4. Decisions the operator made — do not re-litigate

- **Everything from the previous handoff stands**:
  `historicalfantasyfootballstats.com` is off limits; the film room's concepts
  were deleted and the **Sample** badge is load-bearing; two heroes carry NFL
  marks by his call; licensed 4for4 columns are published on the RB and TE pages
  by his decision; GSAP, Lenis and a home-page stats band remain rejected.
- **Motion is CSS and entrance only**, home page and position cards. The
  GSAP/Lenis rejection was reaffirmed this session.
- **No shadcn, and `shadcn init` must not run here.** It writes a second
  CSS-variable layer into `globals.css`, which is exactly the duplication §7
  exists to prevent.
- **The narrow-screen nav is the scrolling row**, right-aligned from `md`. A
  vaul drawer was tried and reverted the same day; **vaul and Radix are
  uninstalled** and `package.json` is back to three dependencies.
- **taste-skill's house styles are not applied to Vantage.** Its aesthetic
  skills prescribe their own look, which fights §7's "the brand already exists,
  do not redesign it". impeccable's audit/critique/typeset commands are the part
  that is used.
- **§11 was spent deliberately on the injury page**, twice. First to compose a
  written record where none exists; then, on 2026-08-27, to drop the "Composed"
  label and every hedge with it. The column states the injury plainly. **He
  asked for this explicitly both times.**
- **ESPN is not used** (see §2). CBS and Sharp are.
- **The injury page is the tracker.** All explanatory prose under the Season
  tracker heading is gone, as is the standalone Injury headlines section. The
  wire-failure notice stays, because §10 requires a pipeline failure to surface.

---

## 5. Corrections I made to my own earlier claims

- I told him the long position pages "run full container width". **They do
  not** — prose caps at `max-w-3xl`, used in 144 places. That was already right
  and I had not checked before saying it.
- I twice guessed wrong about why the first two cards in each grid looked
  different: first that their photographs were too bright for the glare
  (measured false — they are mid-pack at 0.410 and 0.425), then that their
  markup differed (false at both the server and DOM layers). The cause was
  viewport position. **Only measuring geometry found it.**
- Asked which *ranked* players were missing from the tracker and found none, and
  reported that as "nothing is missing". Wrong question — the cutoff was not
  dropping ranked players, it was dropping everyone else. His follow-up
  corrected it.
- A `STATE.md` entry I wrote said nothing on the injury page composes a
  diagnosis, and the next commit made that false. Corrected the same session.
- `DESIGN.md` claimed `rounded-full` was "for the drawer handle only", which was
  wrong even before the drawer was reverted.

---

## 6. Open items

`docs/STATE.md` has all of them with detail. The ones worth knowing:

1. **Four display clamps are off the type ramp.** `clamp(2.5rem, 5vw, 3.75rem)`,
   `clamp(12rem, 34vw, 26rem)` and two more — four separate fluid scales for
   headings. Consolidating changes headline sizes across several pages, so it
   was left rather than done quietly. `npx impeccable detect src` reports them.
2. **The Latest column can show a non-injury headline.** The matcher is
   deliberately not category-filtered, so "CBS Sports NFL All-Breakout Team" can
   land on an injury row. Harmless at 93 rows, more visible at 182. Filtering
   risks dropping real updates that carry no injury vocabulary.
3. **`rb_charts.py` still targets the `(2)` workbook** while everything else
   targets `(4)`. Untouched for a third session.
4. **The stacked lockup PNGs still carry the retired goalpost.** Nothing
   references them, but they are what anyone would reach for to make an avatar.
5. **The beat feed is Nitter-dependent and was blocked.**
6. **The fantasy model's intervals under-cover** — 66.8% at WR against an
   advertised 80%.
7. **`impeccable detect` reports 9 findings, 5 of them false positives that
   should stay**: four are `ChartFigure`'s goalpost frame (three-sided, §7's
   signature element) and one is the yardlines background (a football site's own
   motif).

---

## 7. Running things

```bash
cd ~/Desktop/Claude\ Code/vantage
npm run build          # the check that matters
npm run news           # refreshes news.json — was 10 days stale, now current
npx impeccable detect src
```

`news.json` feeds the injury tracker's Latest column by name matching, so a
stale one quietly costs that column coverage. It was refreshed 2026-08-27.

The injury tracker pulls Sleeper, Draft Sharks, CBS and Sharp at request time,
all inside one 300-second TTL window. None can take the page down: a failed
board contributes an empty map and rows keep the field they had.

The OG cards need `assets/fonts/*.ttf` present at build time and
`NEXT_PUBLIC_SITE_URL` set at deploy time — `metadataBase` falls back to
localhost, which no crawler can fetch.

---

## 8. Standing rules

- `src/app/globals.css` is the only source of colour and type. **No hex in a
  component** (§7). One sanctioned exception: `src/lib/og.tsx`, which renders
  through satori where no stylesheet exists.
- Amber is for the focal thing on screen, one per screen (§7).
- **No thick coloured side border on a card.** It is the single most
  recognisable tell of a generated interface and it took a commit to remove
  eleven of them.
- **No React component computes a metric** (§11).
- No em dashes in user-facing copy; three exemptions in `DESIGN.md`.
- American spellings. Empty states are directions, not apologies (§8).
- **`npm run build` is the check that matters.**
- Commit in logical pieces, and put the reasoning in the message.

---

## 9. Not part of the site

`~/Desktop/Vantage-2026-Positional-Brief.pdf` — a 19-page tiered write-up,
generated in an earlier session and **deliberately not connected to the site**.
If it is ever wanted there, that is the operator's decision and the labelling is
the thing to preserve.
