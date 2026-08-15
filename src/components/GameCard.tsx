import Link from "next/link";
import { TeamChip } from "@/components/TeamChip";
import { WeatherBadge } from "@/components/WeatherBadge";
import { kickoffTime } from "@/lib/games";
import { getTeam } from "@/lib/teams";
import type { Game, GameLeader, GameLeaders } from "@/lib/types";

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
          className="text-xs font-bold uppercase tracking-wider"
          style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
        >
          {ROOF_LABEL[game.roof]}
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
          played={played}
        />
        <TeamSide
          side="Home"
          abbr={game.home}
          name={home ? home.nickname : game.home}
          score={game.score?.home}
          leaders={game.leaders?.home}
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
                ? `${game.implied.away.toFixed(1)} / ${game.implied.home.toFixed(1)}`
                : undefined
            }
          />
        </div>
        {!game.spread_line && !game.total_line && (
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Lines go in <code>spread_line</code>, <code>total_line</code> and{" "}
            <code>moneyline</code> in <code>schedule.json</code>, with{" "}
            <code>implied</code> alongside them.
          </p>
        )}
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
  played,
  emphasis = false,
}: {
  side: "Away" | "Home";
  abbr: string;
  name: string;
  score?: number;
  leaders?: GameLeaders;
  played: boolean;
  emphasis?: boolean;
}) {
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
            fontFamily: "var(--font-display)",
            color: played ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          {score ?? "—"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <TeamChip abbr={abbr} size="sm" />
        <span className="font-semibold">{name}</span>
      </div>

      <dl className="mt-4 flex flex-col gap-1.5">
        <LeaderRow label="QB" leader={leaders?.qb} />
        <LeaderRow label="Rush" leader={leaders?.rusher} />
        <LeaderRow label="Rec" leader={leaders?.receiver} />
        <LeaderRow label="Def" leader={leaders?.defense} />
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
        style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
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
          <span style={{ color: "var(--text-muted)" }}>—</span>
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
        style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className="font-semibold tnum"
        style={{ color: value ? "var(--text-primary)" : "var(--text-muted)" }}
      >
        {value ?? "—"}
      </span>
    </span>
  );
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
