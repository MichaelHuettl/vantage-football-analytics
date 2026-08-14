@AGENTS.md

# Vantage Football Analytics

Fantasy football analytics site. Solo operator. The pitch: rankings are a
conclusion, and the site publishes the argument underneath them.

**Read these two files before changing anything.**

- **`docs/BRIEF.md`** — the project brief. Code comments cite it constantly as
  `§2`, `§7`, `§5.3` and so on. Without it those references mean nothing.
- **`docs/STATE.md`** — what is actually built, where the build departs from the
  brief and why, what is still open, and where the source materials live.

## The rules that matter most

- **`src/app/globals.css` is the single source of truth for colour and type.**
  No component may contain a hex value (§7).
- **Amber is reserved** for the focal thing on screen — the highlighted data
  point, the current week, the player being viewed. Not for buttons, borders and
  chart series at the same time (§7, §11).
- **No NFL logos.** Teams are a colour pair plus an abbreviation via `TeamChip`
  (§2). This still holds even though the photography restriction was lifted.
- **Never estimate a return date.** Injury timelines are reported with an
  attribution or not at all (§5.3).
- **No React component computes a metric** (§11).
- **Empty states are directions, not apologies** (§8).
- American spellings in user-facing copy.

## Content

Hand-authored JSON in `src/data/`, deliberately not `public/data/` — files under
`src/` are typechecked, so a bad edit fails `npm run build` with a line number
rather than shipping broken. `npm run build` is the check that matters.
