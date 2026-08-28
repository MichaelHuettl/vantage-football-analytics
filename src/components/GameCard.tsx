import Link from "next/link";
import { TeamChip } from "@/components/TeamChip";
import { WeatherBadge } from "@/components/WeatherBadge";
import { keyPlayersFor, kickoffTime } from "@/lib/games";
import { getTeam } from "@/lib/teams";
import type {
  Game,
  GameLeader,
  GameLeaders,
  TeamKeyPlayers,
} from "@/lib/types";

const ROOF_LABEL: Record<Game["roof"], string> = {
  outdoor: "Outdoor",
  dome: "Dome",
  retractable: "Retractable",
  closed: "Roof closed",
};

/**
 * One game.
 *
 * The card is built to be readable before kickoff and after it without
 * changing shape: the score and the four named players are slots that fill in,
 * not sections that appear. A card that grows a new region once the game ends
 * moves everything below it on the page, and a reader who checked at 1pm has
 * to re-find their place at 4pm.
 */
export function GameCard({ game }: { game: Game }) {
  const away = getTeam(game.away);
  const home = getTeam(game.home);
  const played = game.score !== undefined;

  return (
    <article
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <header
        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5"
        style={{ background: "var(--surface-sunken)" }}
      >
        <span className="flex items-baseline gap-3">
          <time dateTime={game.kickoff} className="text-sm font-bold tnum">
            {kickoffTime(game.kickoff)}
          </time>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {game.venue}
            {game.city ? `, ${game.city}` : ""}
          </span>
        </span>
        <span
          className="flex items-baseline gap-3 text-xs font-bold uppercase tracking-wider"
          style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
        >
          {game.neutral && <span>Neutral site</span>}
          <span>{ROOF_LABEL[game.roof]}</span>
        </span>
      </header>

      {/* Away then home, left to right, the order a matchup is spoken in.
          Each side is labelled in words as well as placed — §7 does not allow
          position or colour to be the only thing carrying the distinction,
          which is also what lets the two stack on a phone without ambiguity.
          They do stack: side by side at 360px leaves a leader cell 83px wide,
          and "Christian McCaffrey, 18/24, 246 yds" wraps to three lines in it. */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <TeamSide
          side="Away"
          abbr={game.away}
          name={away ? away.nickname : game.away}
          score={game.score?.away}
          leaders={game.leaders?.away}
          key_players={keyPlayersFor(game.away)}
          played={played}
        />
        <TeamSide
          side="Home"
          abbr={game.home}
          name={home ? home.nickname : game.home}
          score={game.score?.home}
          leaders={game.leaders?.home}
          key_players={keyPlayersFor(game.home)}
          played={played}
          emphasis
        />
      </div>

      {/* ============================ Market ============================ */}
      <div
        className="border-t px-4 py-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <span className="eyebrow">Line</span>
          <Figure label="Spread" value={formatSpread(game)} />
          <Figure label="Total" value={game.total_line?.toFixed(1)} />
          <Figure label="Moneyline" value={formatMoneyline(game)} />
          {/* Implied totals are read off the data, never computed here (§11). */}
          <Figure
            label="Implied"
            value={
              game.implied
                ? `${points(game.implied.away)} / ${points(game.implied.home)}`
                : undefined
            }
          />
        </div>
      </div>

      {/* =========================== Weather =========================== */}
      <div
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t px-4 py-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <span className="eyebrow">Weather</span>
        <WeatherBadge game={game} />
      </div>
    </article>
  );
}

/**
 * One team's column: who they are, what they scored, and the four players
 * worth naming afterwards.
 */
function TeamSide({
  side,
  abbr,
  name,
  score,
  leaders,
  key_players,
  played,
  emphasis = false,
}: {
  side: "Away" | "Home";
  abbr: string;
  name: string;
  score?: number;
  leaders?: GameLeaders;
  key_players?: TeamKeyPlayers;
  played: boolean;
  emphasis?: boolean;
}) {
  /*
   * Before kickoff the four rows are the team's key players; afterwards they
   * are who actually led the game. They are labelled differently because they
   * answer different questions — "watch this man" and "this man decided it" —
   * and showing one under the other's heading would be a quiet lie.
   */
  const showLeaders = leaders !== undefined;
  const rows: [string, GameLeader | undefined][] = showLeaders
    ? [
        ["QB", leaders?.qb],
        ["Rush", leaders?.rusher],
        ["Rec", leaders?.receiver],
        ["Def", leaders?.defense],
      ]
    : [
        ["QB", key_players?.qb],
        ["Rush", key_players?.rb],
        ["Rec", key_players?.wr],
        ["Def", key_players?.def],
      ];
  return (
    <div
      className={`px-4 py-4 ${emphasis ? "border-t sm:border-l sm:border-t-0" : ""}`}
      style={{
        background: emphasis ? "var(--surface-sunken)" : undefined,
        borderColor: emphasis ? "var(--border-subtle)" : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{side}</span>
        {/* The score sits where it will sit all season, blank until there is
            one. An em dash is the absence; a zero would be a result. */}
        <span
          className="text-2xl tnum"
          style={{
            fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)",
            color: played ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          {score ?? "n/a"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <TeamChip abbr={abbr} size="sm" />
        <span className="font-semibold">{name}</span>
      </div>

      <p className="mt-4 eyebrow">{showLeaders ? "Led the game" : "Watch"}</p>
      <dl className="mt-2 flex flex-col gap-1.5">
        {rows.map(([label, entry]) => (
          <LeaderRow key={label} label={label} leader={entry} />
        ))}
      </dl>
    </div>
  );
}

/**
 * A named player, or the space one will occupy. The label column is fixed so
 * the four rows line up across both teams and down the whole slate.
 */
function LeaderRow({ label, leader }: { label: string; leader?: GameLeader }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <dt
        className="w-9 shrink-0 text-xs font-bold uppercase tracking-wider"
        style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
      >
        {label}
      </dt>
      <dd className="min-w-0 flex-1">
        {leader ? (
          <>
            {leader.player_id ? (
              <Link
                href={`/players/${leader.player_id}`}
                className="font-semibold hover:underline"
              >
                {leader.name}
              </Link>
            ) : (
              <span className="font-semibold">{leader.name}</span>
            )}
            {leader.stat && (
              <span
                className="ml-2 tnum"
                style={{ color: "var(--text-secondary)" }}
              >
                {leader.stat}
              </span>
            )}
          </>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>n/a</span>
        )}
      </dd>
    </div>
  );
}

function Figure({ label, value }: { label: string; value?: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span
        className="text-xs font-bold uppercase tracking-wider"
        style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className="font-semibold tnum"
        style={{ color: value ? "var(--text-primary)" : "var(--text-muted)" }}
      >
        {value ?? "n/a"}
      </span>
    </span>
  );
}

/**
 * A points figure at its true precision: a tenth normally, a hundredth when
 * the number really is a quarter. Implied totals land on quarters whenever the
 * spread is an odd half, and printing 21.25 as 21.3 makes the pair stop adding
 * up to the game total shown beside them.
 */
function points(n: number): string {
  return Number.isInteger(n * 10) ? n.toFixed(1) : n.toFixed(2);
}

/** A spread is published against one side; showing it without saying which
 *  side makes it unreadable. */
function formatSpread(game: Game): string | undefined {
  if (game.spread_line === undefined) return undefined;
  const line = game.spread_line;
  return line === 0
    ? "Pick'em"
    : line < 0
      ? `${game.home} ${line.toFixed(1)}`
      : `${game.away} ${(-line).toFixed(1)}`;
}

function formatMoneyline(game: Game): string | undefined {
  if (!game.moneyline) return undefined;
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  return `${game.away} ${fmt(game.moneyline.away)} / ${game.home} ${fmt(game.moneyline.home)}`;
}
