import file from "@/data/film-gb-det-2025-w1.json";
import summaryFile from "@/data/film-summary-gb-det-2025-w1.json";

/**
 * The one published film breakdown, typed.
 *
 * A separate payload from `film-sample.json`, which is still the worked example
 * of the layout and keeps its "Sample" badge. This is a real game: all 47
 * offensive snaps of Lions at Packers, Week 1 2025, rendered from the
 * operator's own deck.
 *
 * The deck names its outcome field three different ways across the game —
 * "Result" on the first slides, "Outcome" from slide 3, "Playcall" from slide 6
 * — so the extraction normalises all three onto `outcome`. Every one of the 47
 * resolves.
 */
export interface FilmPlay {
  n: number;
  image: string;
  score: string | null;
  time: string | null;
  downDistance: string | null;
  outcome: string | null;
  prePlay: string | null;
  defense: string | null;
}

interface FilmFile {
  updated: string;
  source: string;
  note: string;
  game: {
    label: string;
    date: string;
    week: number;
    season: number;
    side: string;
  };
  plays: FilmPlay[];
}

const film = file as unknown as FilmFile;

export const FILM_GAME = film.game;
export const FILM_PLAYS = film.plays;
export const FILM_UPDATED = film.updated;
export const FILM_SOURCE_NOTE = film.note;

/**
 * What Green Bay's offense did, from `scripts/curated/film_summary.py`.
 *
 * Every number here is settled in the extractor (§11). The component renders
 * values and nothing else, which is why counts and their percentages both
 * appear in the payload rather than one being derived from the other at render
 * time.
 *
 * **The deck charts the defense, and that is the constraint this shape works
 * around.** No slide carries offensive personnel or a formation name, so there
 * is no formation rate to publish. What the offense ran is recovered from the
 * outcome and the down and distance instead: the run-pass balance, how it moved
 * between halves, the shape of the passing game, and whether the running game
 * earned its carries. The coverage block stays as context for the offense, not
 * as a study of Detroit.
 */
export interface FilmSummary {
  charted: number;
  yards: {
    total: number;
    perPlay: number;
    explosive: number;
    explosiveThreshold: number;
    touchdowns: number;
  };
  playType: { rush: Split; pass: Split; scrambleCountedAs: string };
  byHalf: {
    label: string;
    plays: number;
    rush: number;
    rushPct: number;
    pass: number;
    passPct: number;
    yards: number;
  }[];
  byDown: {
    down: number;
    label: string;
    plays: number;
    rush: number;
    rushPct: number;
    pass: number;
    passPct: number;
  }[];
  passing: {
    dropbacks: number;
    attempts: number;
    completions: number;
    incompletions: number;
    completionPct: number;
    yards: number;
    perAttempt: number;
    perCompletion: number;
    longest: number;
    scrambles: number;
    short: number;
    shortThreshold: number;
    explosive: number;
  };
  rushing: {
    carries: number;
    yards: number;
    perCarry: number;
    longest: number;
    stuffed: number;
    stuffedPct: number;
    explosive: number;
  };
  motion: {
    plays: number;
    of: number;
    pct: number;
    onRuns: MotionRate;
    onPasses: MotionRate;
    byHalf: (MotionRate & { label: string })[];
    yardsWith: number;
    yardsWithout: number;
    drawnRed: number;
    playNumbers: number[];
  };
  coverage: {
    charted: number;
    unreadable: number;
    families: { label: string; plays: number; pct: number }[];
    man: { plays: number; pct: number };
    zone: { plays: number; pct: number };
    robber: number;
  };
  quarters: { q: number; plays: number }[];
}

interface MotionRate {
  plays: number;
  motion: number;
  pct: number;
}

interface Split {
  plays: number;
  pct: number;
  yards: number;
  perPlay: number;
  yardShare: number;
}

export const FILM_SUMMARY = summaryFile as unknown as FilmSummary;
