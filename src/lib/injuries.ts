import injuriesFile from "@/data/injuries.json";
import { getPlayer } from "./content";
import { getTeam } from "./teams";
import type { GameStatus, InjuryEntry, Player, Team } from "./types";

interface InjuriesFile {
  schema_version: number;
  updated: string;
  current_week: number;
  note?: string;
  data: InjuryEntry[];
}

const file = injuriesFile as unknown as InjuriesFile;

export const INJURIES: InjuryEntry[] = file.data;
export const INJURY_UPDATED = file.updated;
export const CURRENT_WEEK = file.current_week;

export const WEEKS: number[] = [...new Set(INJURIES.map((i) => i.week))].sort(
  (a, b) => a - b,
);

export interface InjuryRow {
  entry: InjuryEntry;
  player: Player;
  team: Team;
}

/** Joins entries to players and teams, dropping rows whose ids no longer
 *  resolve rather than rendering a half-empty line. */
function join(entries: InjuryEntry[]): InjuryRow[] {
  return entries.flatMap((entry) => {
    const player = getPlayer(entry.player_id);
    const team = getTeam(entry.team);
    return player && team ? [{ entry, player, team }] : [];
  });
}

export function rowsForWeek(week: number): InjuryRow[] {
  return join(INJURIES.filter((i) => i.week === week));
}

/** Rows for one week, grouped by team and ordered by severity within each. */
export function rowsByTeam(week: number): { team: Team; rows: InjuryRow[] }[] {
  const groups = new Map<string, InjuryRow[]>();
  for (const row of rowsForWeek(week)) {
    const list = groups.get(row.team.abbr) ?? [];
    list.push(row);
    groups.set(row.team.abbr, list);
  }

  return [...groups.entries()]
    .map(([abbr, rows]) => ({
      team: getTeam(abbr)!,
      rows: rows.sort((a, b) => SEVERITY[b.entry.status] - SEVERITY[a.entry.status]),
    }))
    .sort((a, b) => a.team.abbr.localeCompare(b.team.abbr));
}

/** Every team that has appeared on a report, for the team index. */
export function teamsWithInjuries(): Team[] {
  const abbrs = [...new Set(INJURIES.map((i) => i.team))].sort();
  return abbrs.flatMap((a) => {
    const t = getTeam(a);
    return t ? [t] : [];
  });
}

export function rowsForTeam(abbr: string): InjuryRow[] {
  return join(INJURIES.filter((i) => i.team.toUpperCase() === abbr.toUpperCase()));
}

/** A player's designation history, oldest first — the input to the timeline. */
export function historyFor(playerId: string): { week: number; status: GameStatus }[] {
  return INJURIES.filter((i) => i.player_id === playerId)
    .sort((a, b) => a.week - b.week)
    .map((i) => ({ week: i.week, status: i.status }));
}

/**
 * Players carrying an injury across more than one week. §5.3 calls this the
 * backlog: the reader wants to separate a one-week knock from something that
 * has been managed all season.
 */
export function backlog(): {
  player: Player;
  team: Team;
  injury: string;
  weeks: number;
  history: { week: number; status: GameStatus }[];
}[] {
  const byPlayer = new Map<string, InjuryEntry[]>();
  for (const entry of INJURIES) {
    const list = byPlayer.get(entry.player_id) ?? [];
    list.push(entry);
    byPlayer.set(entry.player_id, list);
  }

  return [...byPlayer.entries()]
    .filter(([, entries]) => entries.length > 1)
    .flatMap(([id, entries]) => {
      const player = getPlayer(id);
      const team = getTeam(entries[0].team);
      if (!player || !team) return [];
      return [
        {
          player,
          team,
          injury: entries[0].injury,
          weeks: entries.length,
          history: historyFor(id),
        },
      ];
    })
    .sort((a, b) => b.weeks - a.weeks);
}

const SEVERITY: Record<GameStatus, number> = {
  Out: 5,
  IR: 5,
  Doubtful: 4,
  Questionable: 3,
  Active: 1,
};
