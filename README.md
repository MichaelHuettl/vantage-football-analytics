# Vantage Football Analytics

The site. It renders content you author by hand — it computes nothing.

```bash
npm run dev     # http://localhost:3000
npm run build   # also runs TypeScript; a bad edit fails here
npm run lint
```

## Where things go

| You want to change | Edit |
| --- | --- |
| A ranking, tier, or note | `src/data/rankings/{qb,rb,wr,te,k,dst}.json` |
| A player's name, team, age | `src/data/players.json` |
| A metric definition | `src/data/glossary.json` |
| A position's methodology or chart | `src/data/positions.json` |
| Team colours | `src/data/teams.json` |
| A chart image | drop the PNG in `public/charts/`, reference it as `/charts/name.png` |
| A colour or font | `src/app/globals.css` — the `@theme` block, and nowhere else |

Content lives in `src/data/` rather than `public/data/` on purpose. Files under
`src/` are typechecked and bundled, so a stray comma or a renamed field breaks
`npm run build` with a line number. The same file in `public/` would ship
broken and fail silently in the reader's browser.

## Authoring rankings

One file per position. `rank` is the PPR ordering and the default for every
format; add `format_ranks` only where a format differs:

```json
{
  "rank": 3,
  "tier": 1,
  "player_id": "saquon-barkley",
  "note": "Carried 22.1 times per game behind the league's most efficient run-blocking line.",
  "format_ranks": { "standard": 2 },
  "chart": "/charts/barkley-hvt.png"
}
```

That keeps one list per position instead of four. `player_id` must exist in
`players.json` and is also the player page URL, so it is worth keeping stable
once published.

Notes are one sentence and contain a fact, not a vibe (§8). The rankings page
enforces the parts a machine can check — missing notes, duplicate ranks,
unknown `player_id`, a tier with no label — and prints them at the top of the
page rather than rendering a wrong list quietly.

## Charts

Charts are PNGs exported from your Python work. `ChartFigure` handles them:

```tsx
<ChartFigure
  src="/charts/wr-target-share.png"
  featured                     // the goalpost frame — one per page, at most
  caption="The one thing this chart shows, in plain language."
  source="x: Target share · y: Air yards share"
/>
```

`featured` draws the inverted-U frame from §7 — two uprights and a baseline
acting as the x-axis, echoing the logo. It is what makes a Vantage chart
recognisable cropped into a screenshot, and it stops working if every chart
gets one. One per page.

A PNG can't follow the page theme, so the image always sits on an explicit
white plate. That reads as a deliberate mount rather than an accident when the
rest of the page is dark.

Omit `src` and the frame renders a labelled empty slot, so a page can ship
before its chart exists.

## What this codebase will not do

- Compute a metric in a React component. The numbers come from your Python
  work and arrive as JSON and PNG. (§11)
- Use an NFL logo, wordmark, or shield. Teams are a colour pair plus an
  abbreviation, via `TeamChip`. (§2)
- Use player photography. `PlayerAvatar` draws initials in a position-coloured
  shape, designed as the avatar rather than as a placeholder. (§2)
- Reproduce article body text. News stores headline, source, timestamp, and a
  link. (§2)
- Introduce a second accent colour, or spend amber on anything that isn't the
  focal value. (§11, §7)

## Design tokens

`src/app/globals.css` is the single source of truth. No component contains a
hex value — they reference semantic tokens (`--surface-page`, `--text-primary`,
`--accent`) which resolve to the brand ramp. A dark mode is already wired
through those tokens.

Amber is reserved. It marks the highlighted data point, the current week, the
player being viewed. `MetricValue` shades percentiles in neutral tones for
exactly this reason — if every strong metric in a table were amber, the accent
would stop meaning anything.

## Known gaps

- **TPRR and route participation are absent by design.** Both need a routes-run
  denominator, which no open source publishes — nflverse has no routes loader,
  and its participation data comes from FTN and does not update in-season. The
  WR page uses target share against air yards share instead; the TE page uses
  snap share against target share.
- **`HVT/G` in the glossary is marked draft.** The definition is ambiguous
  between "all targets + carries inside the 10" and "targets and carries both
  inside the 10". It renders with a Draft flag until confirmed.
- Sample content in `src/data/` is placeholder and labelled as such in each
  file's `note` field. Replace it wholesale.
