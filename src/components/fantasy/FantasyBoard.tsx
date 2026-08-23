import { FilterLink } from "@/components/FilterLink";
import { PositionBadge } from "@/components/PlayerLink";
import { TeamChip } from "@/components/TeamChip";
import { EmptyState } from "@/components/PageHeader";
import {
  FM_BOARDS, FM_BOARD_LIMIT, FM_BOARD_RULE, FM_BOARD_TOTALS, FM_POSITION_NAME,
  FM_POSITIONS, excludedFor, qualityFor,
} from "@/lib/fantasy";
import type { FantasyPosition, FuturePick, PastPick } from "@/lib/fantasy";
import type { Position } from "@/lib/types";

/**
 * A projection board, one position at a time.
 *
 * **Never one descending list.** A combined board sorted by points is a
 * ranking of positions, not of players: quarterbacks occupy the top forty rows
 * because quarterbacks score more, and a reader looking for the fourth-best
 * tight end has to scroll past them. Every board here is scoped to a position,
 * chosen from the row of tabs, and the tab lives in the URL so a particular
 * board can be sent to someone.
 *
 * The two seasons show different columns on purpose. 2025 has been played, so
 * it can show what the projection was worth — the actual total and where the
 * player really finished. 2026 has not, so it shows the range instead, and how
 * many prior games the projection rests on.
 */
export function FantasyBoard({
  season,
  position,
  hrefFor,
}: {
  season: "season_2025" | "season_2026";
  position: FantasyPosition;
  hrefFor: (pos: FantasyPosition) => string;
}) {
  const past = season === "season_2025";
  const rows = FM_BOARDS[season][position] ?? [];
  const total = FM_BOARD_TOTALS[season]?.[position] ?? rows.length;

  return (
    <div>
      <nav aria-label="Position" className="mb-6">
        <ul className="flex flex-wrap items-center gap-2">
          <li className="eyebrow mr-1">Position</li>
          {FM_POSITIONS.map((p) => (
            <li key={p}>
              <FilterLink href={hrefFor(p)} active={p === position}>
                {p}
              </FilterLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h3 className="flex items-center gap-3 text-2xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}>
          <PositionBadge position={position as Position} />
          {FM_POSITION_NAME[position]}
        </h3>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {/* "Eligible" rather than "projected" on the 2026 board: the total
              there counts the players the minimum-games rule admits, and the
              model projects more than it recommends. */}
          Top {Math.min(FM_BOARD_LIMIT, rows.length)} of {total}{" "}
          {past ? "projected" : "eligible"}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={`No ${position} board for this season.`}
            direction="Re-run the model's export and the site extractor to fill it."
          />
        </div>
      ) : past ? (
        <PastTable rows={rows as PastPick[]} position={position} />
      ) : (
        <FutureTable rows={rows as FuturePick[]} position={position} />
      )}
    </div>
  );
}

function PastTable({ rows, position }: { rows: PastPick[]; position: FantasyPosition }) {
  const q = qualityFor(position);
  return (
    <>
      {q && (
        <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
          Of the twelve players this board put at the top, {q.top12_hit} finished
          in the real top twelve. The median player landed{" "}
          {q.median_rank_error} {q.median_rank_error === 1 ? "place" : "places"}{" "}
          from where he was projected.
        </p>
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">#</th>
              <th className="py-2 text-left">Player</th>
              <th className="py-2 text-left">Team</th>
              <th className="py-2 text-right">Games</th>
              <th className="py-2 text-right">Projected</th>
              <th className="py-2 text-right">Actual</th>
              <th className="py-2 text-right">Finished</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const missed = Math.abs(r.rank - r.finish) >= 6;
              return (
                <tr key={`${r.player}-${r.rank}`} className="border-b"
                    style={{ borderColor: "var(--border-subtle)" }}>
                  <td className="py-2 tnum" style={{ color: "var(--text-muted)" }}>{r.rank}</td>
                  <td className="py-2">{r.player}</td>
                  <td className="py-2"><TeamChip abbr={r.team} size="sm" /></td>
                  <td className="py-2 text-right tnum">{r.games}</td>
                  <td className="py-2 text-right tnum">{r.projected.toFixed(0)}</td>
                  <td className="py-2 text-right tnum">{r.actual.toFixed(0)}</td>
                  <td className="py-2 text-right tnum"
                      style={missed ? { color: "var(--color-status-out)", fontWeight: 600 } : undefined}>
                    {r.finish}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        A finish six or more places from the projection is marked. Projected
        totals are the sum of that player&rsquo;s weekly forecasts, each made with
        only what was known before that week.
      </p>
    </>
  );
}

function FutureTable({
  rows,
  position,
}: {
  rows: FuturePick[];
  position: FantasyPosition;
}) {
  const thin = rows.filter((r) => r.thin).length;
  const excluded = excludedFor(position);
  return (
    <>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">#</th>
              <th className="py-2 text-left">Player</th>
              <th className="py-2 text-left">Team</th>
              <th className="py-2 text-right">Season</th>
              <th className="py-2 text-right">Per game</th>
              <th className="py-2 text-right">Floor</th>
              <th className="py-2 text-right">Ceiling</th>
              <th className="py-2 text-right">Prior games</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.player}-${r.rank}`} className="border-b"
                  style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2 tnum" style={{ color: "var(--text-muted)" }}>{r.rank}</td>
                <td className="py-2">
                  {r.player}
                  {r.thin && (
                    <span className="ml-2 inline-flex h-4 items-center rounded px-1 text-[0.6rem] font-bold uppercase tracking-wider"
                          style={{
                            fontFamily: "var(--font-condensed)",
                            color: "var(--text-muted)",
                            boxShadow: "inset 0 0 0 1px var(--border-strong)",
                          }}>
                      Thin
                    </span>
                  )}
                </td>
                <td className="py-2"><TeamChip abbr={r.team} size="sm" /></td>
                <td className="py-2 text-right tnum">{r.projected.toFixed(0)}</td>
                <td className="py-2 text-right tnum">{r.ppg.toFixed(1)}</td>
                <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                  {r.floor.toFixed(1)}
                </td>
                <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                  {r.ceiling.toFixed(1)}
                </td>
                <td className="py-2 text-right tnum">{r.prior_games}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
        Floor and ceiling are per game, not per season: the tenth and ninetieth percentile of a single week. Adding a floor across seventeen weeks would
        describe a year in which the same player is unlucky every Sunday, which
        is not a floor anybody should plan around.
        {thin > 0 && (
          <> {thin} of these carry a <em>Thin</em> marker: fewer than sixteen prior
          games, so the projection rests on a short record and should be read
          with that in mind.</>
        )}
      </p>
      {excluded.length > 0 && (
        <p className="mt-3 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
          Every player on this board has at least {FM_BOARD_RULE.min_prior_games}{" "}
          prior games, a full season. Held off it for a shorter record:{" "}
          {excluded.map((e, i) => (
            <span key={`${e.player}-${e.would_have_ranked}`}>
              {i > 0 && "; "}
              {e.player} ({e.prior_games} games, would have ranked{" "}
              {e.would_have_ranked})
            </span>
          ))}.
          The projections themselves are unchanged. The model still carries every one of them, and the full board is in the model&rsquo;s own CSV.
        </p>
      )}
    </>
  );
}
