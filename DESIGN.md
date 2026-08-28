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
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 5vw, 6rem)"
    fontWeight: 800
    fontStretch: "78%"
    lineHeight: 0.9
    letterSpacing: "0.025em"
  condensed:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    fontStretch: "84%"
    lineHeight: 1.45
    letterSpacing: "0.05em"
  body:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    fontStretch: "100%"
    lineHeight: 1.6
    letterSpacing: "normal"
  eyebrow:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    fontStretch: "84%"
    lineHeight: "1rem"
    letterSpacing: "0.12em"
  og-display:
    fontFamily: "Bricolage Display"
    fontWeight: 800
    note: "satori only; static instance of Bricolage at wght 800 / wdth 78 / opsz 96"
  og-condensed:
    fontFamily: "Bricolage Condensed"
    fontWeight: 600
    note: "satori only; static instance of Bricolage at wght 600 / wdth 84 / opsz 14"
  micro:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    fontStretch: "84%"
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

The same file is the one exception on type. satori renders a variable font at
its default instance and ignores the weight it is handed, so `assets/fonts/`
holds two static instances cut from Bricolage's variable file at the coordinates
the pages use — wght 800 / wdth 78 / opsz 96 and wght 600 / wdth 84 / opsz 14.
`opsz` has to be pinned there for the same reason the weight does: the browser
applies that axis automatically from font-size and satori does not, so an
unpinned card would set its headline in the text cut. They are registered with
satori as "Bricolage Display" and "Bricolage Condensed", which is why those two
names appear in the table above and nowhere else.

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

**One family, three roles.** Bricolage Grotesque, loaded once as a variable
font with its `wdth` (75-100) and `opsz` (12-96) axes alongside weight 200-800. Until 2026-08-27 this was three
faces — Anton for display, Barlow Condensed for interface furniture, Barlow for
reading. The operator collapsed them to a single typeface, so what separates the
roles now is weight and width rather than three family names.

- **Display** is weight 800 at 78% width. That reproduces the register Anton
  held: heavy, narrow, uppercase, used large and sparingly. Never at body size.
- **Interface furniture** is weight 600 at 84% width, uppercase and tracked
  out, for table headers, eyebrows, buttons, badges and nav.
- **Reading text** is weight 400 at normal width.

Bricolage was chosen over five other candidates for three reasons. It has a real
width axis, and collapsing to a family without one would have lost the condensed
character the whole broadcast look rests on. It reaches weight 800, where the
nearest runner-up (Instrument Sans) stops at 700 and would have cost every hero
its heft. And it carries an `opsz` axis that browsers apply automatically from
font-size, which is what makes a deliberately irregular face safe here: the
character concentrates at display sizes and the letterforms open up at 16px,
where the site's long arguments live.

**Archivo was tried first, on 2026-08-27, and rejected the same day** as too
blocky — an even signage grotesque, which is what that genus is for. The values
in use did not change when it was replaced, because 78% and 84% sit inside both
families' width ranges. That is the token layer doing its job.

**Weight and width are tokens, not literals.** `--weight-display`,
`--stretch-display` and `--stretch-condensed` live in `globals.css` beside the
family tokens. This matters because Anton was a single weight and intrinsically
heavy, so not one of the 109 display call sites carried a `font-weight` — under
a variable family they would all have rendered at 400. Keeping the three role
tokens named means the next typeface change is one block in `globals.css`
rather than 218 components.

**Two line-height ratios, set on the scale itself.** `body` declared 1.6 while
Tailwind's own `text-sm` (1.43) and `text-xs` (1.33) silently overrode it at 347
call sites, with 18 `leading-relaxed` patches papering over the result. The
scale now carries the values: **1.6** for reading sizes (base, lg, xl) and
**1.45** for the two dense sizes used in table cells and labels. Seventeen of
the `leading-relaxed` overrides were redundant against that and were removed;
the one that remains sits on `text-xs`, where the looser setting is a decision.

**Display leading is 0.9**, down from six competing values — 0.85, 0.88, 0.9,
0.95, `none` and `tight`. Nine sites use 0.9 now; `leading-none` stays for
mid-size headings and `leading-tight` for callout titles that wrap.

**Tabular figures everywhere a number appears in a column.** `font-variant-numeric:
tabular-nums` is set on every `table` in base, and `.tnum` exists for figures
outside one.

**One size below the eyebrow, not four.** `--text-micro` at 0.625rem carries
every micro label: table sub-headers, chip text, the line under the wordmark.

**The eyebrow is a device, not a style.** Bricolage at 0.6875rem, weight 600, 84%
width, 0.12em tracking, uppercase, muted. It labels a block; it never carries
the block's meaning.

**Measure is capped at `max-w-3xl`** for running prose. Long arguments are the
site's main body of work and an uncapped line length is the fastest way to make
one unreadable.

## Layout

A single container at `max-w-[1400px]` with `px-4 sm:px-6`, holding either
full-bleed photography sections or a capped reading column inside it.

**Sections breathe at `py-16 sm:py-24`, and as of 2026-08-27 they actually do.**
That value was documented here and used in exactly one place; the content
containers carried seven different paddings between them (`py-10` thirteen
times, plus `py-6`, `py-12`, `py-14`, `pt-28 pb-12`, `py-24 sm:py-32`). Seventeen
containers share the standard now. Two exceptions are deliberate: the `py-6`
control strips (the rankings position tabs, the game tracker week selector),
which are a row of controls rather than a section, and `pt-28` on hero-less
pages, where the top padding is clearing the fixed header rather than setting
rhythm.

**Section gaps are `mt-16`**, with `mt-8` as the nested-subsection step. That
replaced five values (`mt-10`, `mt-12`, `mt-14`, `mt-16`, `mt-20`); `mt-16` was
already 22 of the 34 and is simply now all of them.

Headers are 80px tall at every width.

**Responsive floor is 360px** and it is a hard requirement, not an aspiration.
The page itself must never scroll horizontally; a wide table scrolls inside its
own `overflow-x-auto` container instead.

**Below `xl` the primary nav is a sideways-scrolling row of the same links**,
rather than a menu behind a tap: a visible link is one tap and a hidden one is
two. It takes its own line under the wordmark below `md`, and from `md` up it
shares the line and right-aligns, ending flush with the container's padding edge
so it lines up with the wide bar above it. Above `xl` that wide bar shows all
eight inline with a hover dropdown on Positional Data. The `xl` breakpoint has
moved twice as section names grew and follows the labels, not a device width.

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
`rounded-lg` 8px for cards. `rounded-full` is reserved for two things and is not
a general shape: circular player thumbnails, and the small status dots that
carry a state beside a label. Nothing on this site is a squircle.

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
  `currentColor`. **Neither was touched by the 2026-08-27 typeface change** and
  neither should be: the inverted-U, the crossbar, the amber plot line and the
  baseline rule are artwork, not type. The `Wordmark` lockup sets its name in
  the site face, so that text follows the family, but its own `leading-[0.85]`
  is a brand proportion and is deliberately exempt from the display leading
  scale.
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
- Don't publish auto-generated written analysis under the operator's name (§11).
  The injury tracker's composed sentences were labelled "Composed" until
  2026-08-27, when the operator dropped the label so the column states the
  injury plainly. What still holds is the constraint underneath it: the
  sentences come from a controlled vocabulary and fixed patterns, never free
  generation, and they never state a return date (§5.3).
