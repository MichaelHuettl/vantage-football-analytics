---
name: Vantage Football Analytics
description: Fantasy football analytics whose pitch is that rankings are a conclusion and the argument underneath them is published.
colors:
  vantage-black: "#0f1318"
  vantage-panel: "#101318"
  vantage-amber: "#ef9f27"
  vantage-white: "#ffffff"
  ink-950: "#0f1318"
  ink-900: "#171c22"
  ink-800: "#232a32"
  ink-700: "#333c46"
  ink-600: "#4a555f"
  ink-500: "#66727d"
  ink-400: "#8a959e"
  ink-300: "#b0b9c0"
  ink-200: "#d2d8dc"
  ink-100: "#e8ecef"
  ink-50: "#f5f7f8"
  pos-qb: "#ef7b85"
  pos-rb: "#f5853c"
  pos-wr: "#5bb3e4"
  pos-te: "#3fb8ae"
  pos-k: "#6b7280"
  pos-dst: "#8c5a3c"
  status-out: "#b4232a"
  status-doubtful: "#c2570f"
  status-questionable: "#8a6d1f"
  status-full: "#2f7a4f"
typography:
  display:
    fontFamily: "Anton, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 5vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "0.025em"
  condensed:
    fontFamily: "Barlow Condensed, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
  body:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  eyebrow:
    fontFamily: "Barlow Condensed, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: "1rem"
    letterSpacing: "0.12em"
  micro:
    fontFamily: "Barlow Condensed, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: "0.875rem"
    letterSpacing: "0.05em"
rounded:
  sm: "2px"
  DEFAULT: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "96px"
components:
  callout:
    backgroundColor: "{colors.ink-50}"
    textColor: "{colors.vantage-black}"
    rounded: "{rounded.md}"
    padding: "20px 24px"
  button-primary:
    backgroundColor: "{colors.vantage-amber}"
    textColor: "{colors.vantage-black}"
    typography: "{typography.condensed}"
    rounded: "{rounded.DEFAULT}"
    padding: "14px 24px"
  button-secondary:
    textColor: "{colors.vantage-white}"
    typography: "{typography.condensed}"
    rounded: "{rounded.DEFAULT}"
    padding: "14px 24px"
  status-pill:
    textColor: "{colors.vantage-white}"
    typography: "{typography.condensed}"
    rounded: "{rounded.DEFAULT}"
    height: "24px"
    padding: "0 8px"
  section-card:
    backgroundColor: "{colors.vantage-black}"
    textColor: "{colors.vantage-white}"
    rounded: "{rounded.lg}"
    height: "256px"
    padding: "24px"
---

# Vantage Football Analytics

## Overview

Vantage publishes the reasoning under a fantasy ranking. Every design decision
answers to that: a reader should be able to audit the argument, so the interface
is built to show working rather than to look confident.

The register is **editorial sports broadcast, not SaaS dashboard**. Condensed
uppercase type, heavy display headlines, photography at full bleed, and numbers
set in tabular figures wherever they line up in a column. It should read like a
broadcast graphics package that learned restraint.

This file records what is built. `docs/BRIEF.md` is the authority on *why*, and
code comments cite it constantly as §2, §5.3, §7, §11. Where the two disagree,
the brief wins and this file is stale.

## Colors

**Four brand values, fixed by the logo, and not open for adjustment.** Black
`#0f1318`, panel `#101318`, amber `#ef9f27`, white `#ffffff`.

**Amber is reserved.** It marks the single focal thing on a screen: the
highlighted data point, the current week, the player being viewed. It is not a
button colour, not a border colour and not a chart series colour, and the moment
it is all three on one screen it has stopped meaning anything. The measure that
matters is per screen, not per component: a callout device used three times on a
page spending amber twice each is six amber elements, which is the failure §11
describes as adding a second accent by accident.

**`globals.css` is the single source of truth.** No component contains a hex
value. The one sanctioned exception is `src/lib/og.tsx`, which renders through
satori rather than a browser: there is no stylesheet and no `:root`, so custom
properties cannot resolve, and the brand values are copied into named constants
at the top of that one file.

**The ink ramp is derived from the brand black's hue**, so greys never read as
neutral-cool against the warm amber. Components reference the semantic layer
(`--surface-page`, `--text-secondary`, `--border-subtle`) rather than the ramp
directly, which is what makes dark mode a matter of redefining about ten values.

**Position colours follow the ESPN Fantasy scheme** so a reader arrives already
fluent. Each is paired with its own ink token rather than assuming white,
because they are light tints and white on them fails contrast.

**Colour is never the sole carrier of meaning.** Every status pill prints its
word. Every position badge prints its abbreviation.

## Typography

Three families, each with one job.

- **Anton** for display. Used large and sparingly: page titles, section
  headings, the numbers a page is built around. Never at body size.
- **Barlow Condensed** for dense interface furniture: table headers, eyebrows,
  buttons, badges, nav. Uppercase and tracked out.
- **Barlow** for anything read in sentences.

**Tabular figures everywhere a number appears in a column.** `font-variant-numeric:
tabular-nums` is set on every `table` in base, and `.tnum` exists for figures
outside one.

**One size below the eyebrow, not four.** `--text-micro` at 0.625rem carries
every micro label: table sub-headers, chip text, the line under the wordmark.
Four values were doing that job until 2026-08-26 — 0.625rem, 10px, 0.6rem and
0.65rem, three within half a pixel of each other and one not in rem. The
detector found it by checking the codebase against this file, which is the
reason this file exists.

**The eyebrow is a device, not a style.** Barlow Condensed at 0.6875rem, 0.12em
tracking, uppercase, muted. It labels a block; it never carries the block's
meaning.

**Measure is capped at `max-w-3xl`** for running prose, used in 144 places. Long
arguments are the site's main body of work and an uncapped line length is the
fastest way to make one unreadable.

## Layout

A single container at `max-w-[1400px]` with `px-4 sm:px-6`, holding either
full-bleed photography sections or a capped reading column inside it.

**Sections breathe at `py-16 sm:py-24`.** Headers are 80px tall at every width.

**Responsive floor is 360px** and it is a hard requirement, not an aspiration.
The page itself must never scroll horizontally; a wide table scrolls inside its
own `overflow-x-auto` container instead.

**Below `xl` the primary nav is a bottom sheet** behind a Menu button, because
eight items with names like "Game Prediction Model" do not fit an inline bar.
Above it, the bar shows all eight with a hover dropdown on Positional Data.

## Elevation & Depth

**This site does not use drop shadows.** Depth is carried by surface value and
by hairline insets, which keeps the interface flat and printed rather than
floating.

- **Hairlines are `inset 0 0 0 1px`**, not `border`, so they never affect
  layout. The preferred value is mixed from the text colour at 8%
  (`color-mix(in oklab, var(--text-primary) 8%, transparent)`), which gives an
  edge without drawing a box and covers both themes with one value.
- **Surfaces separate by value**: `--surface-page`, `--surface-raised`,
  `--surface-sunken`, `--surface-inverse`. A callout is sunken; a card on a dark
  page is raised.
- **Scrims, not overlays.** Text over photography sits on a gradient scrim tuned
  per image, never on a flat black wash.

## Shapes

Radii are small and consistent: `rounded-sm` 2px for chips, `rounded` 4px for
most controls, `rounded-md` 6px for callout panels and chart frames,
`rounded-lg` 8px for cards, `rounded-full` for the drawer handle only. Nothing
on this site is a squircle.

**The signature shape is the goalpost**: an inverted U whose crossbar is a chart
axis. It appears as the logo mark and as the frame on the featured chart of a
page. §7 is explicit that it must not be used on every chart or it becomes
wallpaper — one featured figure per page, the rest get a plain hairline frame.

**The amber square** is the site's marker: an 8px filled square that precedes an
eyebrow to flag the one thing worth reading first. It appears on section cards,
on the method band, on callouts and on the share cards.

## Components

- **`Callout`** — the "conclusion before the evidence" panel. Sunken surface,
  8% hairline, amber square before the eyebrow, optional Anton title. `tone`
  chooses whether it earns the amber mark (`finding`) or not (`note`); `plain`
  drops the panel for a callout inside running text. **This replaced eleven
  copies of a `border-l-4` card.** A thick coloured rule down one side of a card
  is the most recognisable tell of a generated interface and must not come back.
- **`ChartFigure`** — the figure wrapper. `featured` draws the goalpost frame;
  everything else gets a hairline. Always carries a caption stating the single
  takeaway in one plain sentence (§5.2).
- **`StatusPill` / `CampStatusPill` / `WireStatusPill`** — designation as a
  filled pill. The word is always present.
- **`TeamChip`** — a team as a colour pair plus an abbreviation. **No NFL
  logos**, anywhere, ever (§2).
- **`Goalpost` / `Emblem`** — the mark at chrome size and at display size, both
  cropped to the same viewBox so they are interchangeable. Structure inherits
  `currentColor`.
- **`DataFreshness`** — every data-backed page states how old its data is (§10),
  and calls it out past a staleness threshold.

## Do's and Don'ts

**Do**

- Put arithmetic in the extractor, never in a component (§11).
- State the number, then what it means, in that order.
- Write empty states as directions, not apologies (§8).
- Attribute any injury timeline, or omit it (§5.3).
- Keep motion to transform and opacity, define it only inside
  `prefers-reduced-motion: no-preference`, and let visible be the default state
  so nothing is ever hidden waiting on an animation that may not run.
- Use American spellings in user-facing copy.

**Don't**

- Don't add a second accent colour (§11).
- Don't put a hex value in a component (§7).
- Don't use a thick coloured side border on a card.
- Don't put the goalpost frame on every chart.
- Don't use an em dash in user-facing copy. Three exemptions: quoted material,
  the `PracticeStatus` `"—"` data contract, and code comments.
- Don't let a React component compute a metric (§11).
- Don't run `shadcn init` here. It writes a second CSS-variable layer into
  `globals.css`, which is precisely the duplication §7 exists to prevent.
- Don't publish auto-generated written analysis unlabelled. The injury tracker's
  composed sentences are marked "Composed" for exactly this reason.
