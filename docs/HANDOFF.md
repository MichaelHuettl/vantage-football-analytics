# Handoff — Vantage, the fantasy model, and what changed

Written to be read cold, by the session that did the work below.
Everything is committed. Nothing is in flight.

---

## 0. Where things are

Three directories matter, and they are **not** one project.

| Path | What | Owner |
| --- | --- | --- |
| `~/Desktop/Claude Code/vantage/` | The Next.js site. 28 commits this session | yours |
| `~/Desktop/Claude Code/fantasy-model/` | The fantasy projection model. 9 commits this session | yours |
| `~/Desktop/nflverse-data/nfl_predictor/` | The game-prediction pipeline | **a peer session — do not edit its Python** |

**Read `docs/BRIEF.md` and `docs/STATE.md` first.** Code comments cite the brief
constantly as §2, §5.3, §7, §11. STATE.md is current as of this handoff: the
sections table, the extractor table and all fifteen open items reflect what is
actually built.

`git log` in each repo carries the reasoning for every change. That is this
project's convention and it is worth reading before changing anything you did
not write.

---

## 1. What changed this session

**The wide receiver page was built** — the last position without one, closing
open item 2. `wr_charts.py` reads rows 2-183 of the WRTE sheet (tight ends
start at 189). Three workbook scatters, plus two charts computed from the
nflverse export, plus three fitted touchdown columns, plus three conclusion
panels.

**The injury page was rebuilt as a live season tracker**, on the news page's
architecture, at the operator's request. The hand-written camp records are now
the *floor* under a live Sleeper pull rather than a separate section.

**The accuracy tab gained hit rates** — "how often is it close" alongside
average error — at both weekly and season scale, plus a conclusion panel at the
top stating what the model can and cannot be trusted for.

**The 2026 board gained an eligibility rule** and lost its quietly-broken
Arizona join.

**Em dashes were removed from all user-facing copy**, with a grammar pass
alongside.

---

## 2. Findings that changed what the site claims

These are the ones a fresh session is most likely to undo by accident.

**Opportunity does not forecast better than scoring does.** The WR page said it
did. Across 571 paired receiver seasons since 2015, points per game repeats at
**0.59** while target share and WOPR repeat at **0.49** — so that claim is
false and was removed. What survives is narrower: *efficiency* does not repeat.
Yards per target comes back at 0.25 and touchdowns per target at **0.17**. The
page states the failed half under its own "what this does not show" heading.
**Do not reinstate the stronger claim.**

**Two season-total numbers exist and only one is a forecast.** Summing a
player's seventeen weekly forecasts gives an average miss of **22 points**; the
model's August projection for the same season misses by **38**. The gap is not
that the model sharpens — weekly accuracy is flat across the year — it is that
the in-season sum may follow a role that changed in October. **Do not quote 22
as season accuracy.**

**The weekly baseline cannot be reused at season scale.** Summed over a year, a
trailing three-game average is a lagged copy of the player's own scores:
r = 0.986 against the actual season total. Scored that way it "beats" the model
88% to 57%, which measures nothing. The season comparator is the player's own
prior-season rate instead.

**There is a measured ceiling, and it is close.** An oracle told each player's
own season median in advance hits 78.5% at the 8-point band; the model reaches
73.5%, or 94% of it. **Roughly 5 points of headroom at any band, not 30.** A
target like "80% within 5 points" is above what perfect foreknowledge achieves.
Check this before promising an accuracy gain.

**Aubrey was not promoted by hand and should not be.** Prior-season kicker
scoring predicts the next season at a Spearman of 0.11, 0.14 and 0.35 over the
last three years. He moved K10 → K8 on the eligibility rule alone.

**All history beats a shorter training window**, at all six positions, with
window-10 between window-5 and all-history. Monotonic across twelve
comparisons. The negative result is committed as
`artifacts/backtest_window10.csv` so nobody re-runs it.

---

## 3. Gotchas that cost real time this session

**Team codes**

- **nflverse disagrees with itself.** Rosters say `AZ`; schedules, stats and
  every processed parquet say `ARI`. The forecast's inner join on `team`
  silently dropped **every Arizona player** from the 2026 board. Nothing
  errored — a board is expected to be shorter than a roster. The join now
  asserts every rostered team has fixture rows. **Check a join's output against
  a name you expect to find; a plausible count is not evidence.**
- **`LA` vs `LAR`.** Both files call the Rams `LA` where the site keys on
  `LAR`, and an unresolved code never errors — `TeamChip` prints a grey
  fallback. `getTeam` aliases both pairs; `canonTeams` normalises each payload
  at its boundary.
- **The site's roster wins over the export's.** `players.json` is audited
  against a live endpoint; the export records where a player *played* in 2025.
  AJ Brown and Jaylen Waddle differ, and a scheme column is a claim about the
  offense a receiver is joining.

**Em dashes hide from a search, two ways**

- **`&mdash;`** is a different string. Sixteen survived the first pass.
- **Python escapes it.** `json.dumps` writes the six characters `—`, so a
  generated payload greps clean while still rendering a dash. **66 more** were
  hiding that way.
- **Crawl the rendered pages; do not trust a source grep.** Three exemptions
  stand: quoted material (`curated-posts.json`, `news.json` headlines —
  rewriting them is misquoting), the `PracticeStatus` `"—"` data contract
  (renders as `·`, changing the key breaks the match), and code comments.

**Scanning**

- A scanner that replaces HTML tags with a space reports a false
  "space before punctuation" for every inline tag. The first run flagged ~65
  defects; the real count was **one**. Strip `<!-- -->` too — React inserts it
  between adjacent text nodes.

**Extractors**

- **`te_charts.py`'s date-serial guard drops anything over 1,000.** The first WR
  chart's x-axis is air yards, which runs to 1,841 — left as-is it would have
  deleted most of the chart. The guard is per-axis now.
- **The name column is not always B.** WR block 1 keeps names in D.
- **The export writes `"P.Nacua"` with no space.** Passing that to `surname()`
  makes the whole string one token; it matched 1 of 88 before the initial was
  split off.

**Everything from the previous handoff still holds** — the nflverse download
traps, `_combined/snap_counts.csv` being unusable, `curl -f`, pre-rounding,
the nav breakpoints, image cache-busting by rename, macOS `"file 2.ts"`
duplicates, and the browser pane being unreliable. On the pane: `curl` plus
parsing and `javascript_tool` against the DOM are what work, and **reading a
generated PDF with the Read tool is an excellent way to check a rendered
document** — it caught two real defects in the brief.

---

## 4. Decisions the operator made — do not re-litigate

- **Everything from the previous handoff stands**: `historicalfantasyfootballstats.com`
  is off limits (robots.txt names ClaudeBot); the film room's concepts were
  deleted because an agent wrote them and the remaining sample play's **Sample**
  badge is load-bearing; two heroes carry NFL marks by his call; licensed 4for4
  columns are published on the RB and TE pages by his decision; smooth scroll /
  GSAP / Lenis and a home-page stats band remain rejected.
- **The WR grid's "High YPRR" and "High TPRR" columns are a third 4for4
  place.** What is published is his own categorisation — names under a heading —
  not the licensed figures. Flagged to him rather than assumed.
- **The notable-names block was deleted** at his request; sixteen of its
  twenty-three entries were bare surnames the sheet never spelled out.
- **The em dash is out of user-facing copy**, with the three exemptions above.
- **The headline accuracy bands are 8 points weekly and 40 season-long**, chosen
  on the size of the edge rather than on significance — with 37,000 paired weeks
  every band from 5 to 10 clears significance, so it cannot be the tie-breaker.
  30 was rejected for the season band because the model and baseline tie at
  quarterback at exactly that width.

---

## 5. Corrections I made to my own earlier claims

- The WOPR chart's paragraph claimed opportunity forecasts better than scoring.
  It does not. See §2.
- STATE.md was dated 2026-08-17 while recording work from the 21st and 22nd; the
  extractor table said "the last three" when there were four; the home row said
  seven section cards when there were eight. All fixed.
- The accuracy entry quoted "83.6% within 10 points" after the tab had moved to
  5 points and 51.5%, then to 8 points and 73.5%. Stale in the direction that
  oversells, which is the worst way for a record to be wrong.
- My first pass at a spacing scan reported ~65 grammar defects that were
  artifacts of my own tag-stripping. The real count was one.

---

## 6. Open items

`docs/STATE.md` has all fifteen with detail. Item 2 is now closed. The ones
worth knowing:

1. **The fantasy model's intervals under-cover.** The band is built to hold 80%
   and holds 66.8% at WR, 69.9% at RB, 71.8% at K, 71.9% at QB. Only TE reaches
   its advertised width. Widening the quantiles is the obvious next change.
2. **`rb_charts.py` still targets the `(2)` workbook** while everything else
   targets `(4)`. Re-running it as-is reads a two-versions-old sheet; fixing it
   is a row remap, not a path change. Untouched this session.
3. **The beat feed is Nitter-dependent and was blocked.** `npm run beat`
   returned zero from all 39 accounts.
4. **The prediction head-to-head cannot show its heaviest inputs** — eight of
   twelve ranked features have no per-team values. Changes go through Michael to
   the peer session.
5. **No rookies on the 2026 board**, by construction: a player with no prior game
   has no history to lag.
6. **Sleeper's injury notes are free text.** On the pull the tracker was built
   against, none of the 26 notes contained return-date language — they are
   single words like "Surgery". That is a property of the current data, not a
   guarantee. **Re-check if the column ever starts printing sentences**, because
   a note reading "expected back Week 3" breaches §5.3 the moment it renders.

---

## 7. Running things

```bash
cd ~/Desktop/Claude\ Code/fantasy-model
./.venv/bin/python fantasy_model.py all          # build → train → report → project
./.venv/bin/python hit_rates.py --rerun          # walk-forward, keeps per-row residuals
./.venv/bin/python export_site_payload.py        # -> artifacts/site_payload.json
cd ../vantage && python3 scripts/curated/fantasy_model.py   # -> src/data/fantasy-model.json
```

**Run the last two after any retrain.** The site reads the copy and nothing
watches the source. `export_site_payload.py` now **fails** rather than omitting
the section if `hit_rates.json` is missing.

```bash
python3 scripts/curated/wr_charts.py    # -> src/data/wr-charts.json
npm run build                            # the check that matters
```

`wr_charts.py` is the only extractor reading two sources — the workbook for
three charts, the nflverse export for the stickiness and consistency ones. It
reconciles its own correlations against a second pairing and refuses to publish
if they diverge by more than 0.12.

---

## 8. Standing rules

- `src/app/globals.css` is the only source of color and type. **No hex in a
  component** (§7).
- Amber is for the focal thing on screen, one per screen (§7).
- **No React component computes a metric** (§11).
- **Never estimate a return date** (§5.3).
- **No em dashes in user-facing copy**, three exemptions above.
- American spellings. `prose.ts` fixes the peer session's "defence" on the way in.
- Empty states are directions, not apologies (§8).
- **`npm run build` is the check that matters.**
- Commit in logical pieces, and put the reasoning in the message.

---

## 9. Not part of the site

`~/Desktop/Vantage-2026-Positional-Brief.pdf` — a 19-page tiered write-up of all
six positions, generated this session from the repo's data at the operator's
request. It is **deliberately not connected to the site**: §11 forbids
publishing auto-generated written analysis, and the document says so on its
first page. Source HTML is in this session's scratchpad, not in the repo. If it
is ever wanted on the site, that is a decision for the operator and the labelling
is the thing to preserve.
