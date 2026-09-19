import scheduleFile from "@/data/schedule.json";
import keyPlayersFile from "@/data/key-players.json";
import { getPlayer } from "./content";
import type { Game, TeamKeyPlayers } from "./types";

interface ScheduleFile {
  schema_version: number;
  season: number;
  week: number;
  updated: string;
  source?: string;
  note?: string;
  data: Game[];
}

const file = scheduleFile as unknown as ScheduleFile;

export const GAMES: Game[] = file.data;
export const SCHEDULE_UPDATED = file.updated;
export const SEASON = file.season;
export const SCHEDULE_WEEK = file.week;

export const WEEKS: number[] = [...new Set(GAMES.map((g) => g.week))].sort(
  (a, b) => a - b,
);

/**
 * The week a reader most likely wants: the one holding the next game that has
 * not finished, allowing twelve hours after a kickoff for it to be read.
 *
 * `schedule.json` carries a fixed `week` of 1, which was right in August and
 * wrong from the first Thursday of the season. This moves with the calendar:
 * Saturday shows the coming Sunday's week, Monday night still shows the week
 * being finished, and Tuesday rolls on to the next. Past the last game it
 * holds on the final week.
 */
export function currentWeek(now = Date.now()): number {
  const cutoff = now - 12 * 3_600_000;
  const next = GAMES.filter((g) => new Date(g.kickoff).getTime() >= cutoff).sort((a, b) =>
    a.kickoff.localeCompare(b.kickoff),
  )[0];
  return next ? next.week : WEEKS[WEEKS.length - 1];
}

export function gamesForWeek(week: number): Game[] {
  return GAMES.filter((g) => g.week === week).sort((a, b) =>
    a.kickoff.localeCompare(b.kickoff),
  );
}

/**
 * Games bundled by kickoff time.
 *
 * A week is read slot by slot — the Sunday early window is a single decision,
 * not ten unrelated ones — so the page groups by kickoff rather than listing
 * sixteen equal cards. Ordering is by the timestamp, so a slot label never has
 * to be parsed back into a time.
 */
export function gamesBySlot(games: Game[]): { label: string; games: Game[] }[] {
  const slots = new Map<string, Game[]>();
  for (const game of [...games].sort((a, b) => a.kickoff.localeCompare(b.kickoff))) {
    slots.set(game.kickoff, [...(slots.get(game.kickoff) ?? []), game]);
  }
  return [...slots.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kickoff, games]) => ({ label: slotLabel(kickoff), games }));
}

/** "Sunday, Sep 13 · 1:00 PM ET". Eastern because that is how a slate is
 *  discussed, whatever timezone the reader is in. */
export function slotLabel(kickoff: string): string {
  const d = new Date(kickoff);
  const date = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  return `${date} · ${time} ET`;
}

export function kickoffTime(kickoff: string): string {
  return new Date(kickoff).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

/** Weather is only a factor where the game is open to it. §4.3 short-circuits
 *  on roof rather than fetching a forecast nobody will read. A retractable
 *  roof the weather source expects closed counts as closed. */
export function weatherApplies(game: Game): boolean {
  if (game.roof_closed) return false;
  return game.roof === "outdoor" || game.roof === "retractable";
}

/** Resolves a leader's name to a player page when the name is one of the
 *  ranked 120, and leaves it as plain text when it is not. */
export function leaderHref(playerId?: string): string | undefined {
  if (!playerId) return undefined;
  return getPlayer(playerId) ? `/players/${playerId}` : undefined;
}

interface KeyPlayersFile {
  schema_version: number;
  updated: string;
  source?: string;
  note?: string;
  data: Record<string, TeamKeyPlayers>;
}

const keyFile = keyPlayersFile as unknown as KeyPlayersFile;

export const KEY_PLAYERS_UPDATED = keyFile.updated;

export function keyPlayersFor(abbr: string): TeamKeyPlayers | undefined {
  return keyFile.data[abbr];
}
