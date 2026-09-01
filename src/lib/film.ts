import file from "@/data/film-gb-det-2025-w1.json";

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
