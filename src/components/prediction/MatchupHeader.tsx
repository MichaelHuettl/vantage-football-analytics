import { TeamChip } from "@/components/TeamChip";
import { MARKET, TIER_LABEL, kickoffLabel } from "@/lib/predictions";
import type { PredictedGame } from "@/lib/predictions";

const CONFIDENCE_TOKEN: Record<PredictedGame["confidence"], string> = {
  high: "var(--color-status-full)",
  medium: "var(--color-status-questionable)",
  low: "var(--color-status-out)",
  // Not a warning colour. A coin flip is not a bad prediction, it is the
  // absence of one, and colouring it red would read as "this pick is risky"
  // when the honest statement is "there is no pick here".
  coin_flip: "var(--border-strong)",
};

/**
 * The prediction, stated once and qualified immediately.
 *
 * The split bar is the model's win probability and nothing else — no edge, no
 * value, no pick. That restraint is not decoration: measured out of sample this
 * model is *worse* than the moneyline market on both log loss and accuracy, and
 * when it disagrees with the market it has been right 42% of the time. A UI
 * that framed the gap as an opportunity would be inviting the reader to act on
 * the one signal the data says is negative.
 *
 * The market line is therefore shown as a comparison, with the market labelled
 * as the better forecaster where it is.
 */
export function MatchupHeader({ game }: { game: PredictedGame }) {
  const homePct = Math.round(game.home.win_probability * 1000) / 10;
  const awayPct = Math.round(game.away.win_probability * 1000) / 10;
  const favouredHome = game.predicted_winner === game.home.team;

  return (
    <section>
      <p className="eyebrow" style={{ color: "var(--text-muted)" }}>
        Week {game.week} · {kickoffLabel(game.kickoff)}
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex items-center gap-3">
          <TeamChip abbr={game.away.team} />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>at</span>
          <TeamChip abbr={game.home.team} />
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-6 items-center rounded px-2 text-xs font-bold uppercase tracking-wider text-white"
            style={{
              fontFamily: "var(--font-condensed)",
              background: CONFIDENCE_TOKEN[game.confidence],
            }}
          >
            {TIER_LABEL[game.confidence]}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            this band has been right{" "}
            <strong className="tnum">
              {(game.confidence_historical_accuracy * 100).toFixed(1)}%
            </strong>{" "}
            of the time
          </span>
          {game.models_disagree && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              the two models pick different sides
            </span>
          )}
        </div>
      </div>

      {/* The split bar. Percentages are printed as well as drawn — colour never
          carries the meaning alone (§7). */}
      <div className="mt-6">
        <div
          className="flex h-14 w-full overflow-hidden rounded"
          role="img"
          aria-label={`Model win probability: ${game.away.team} ${awayPct}%, ${game.home.team} ${homePct}%`}
        >
          <div
            className="flex items-center justify-start px-4"
            style={{
              width: `${awayPct}%`,
              background: favouredHome ? "var(--border-strong)" : "var(--color-vantage-amber)",
            }}
          >
            <span
              className="text-lg tnum"
              style={{ fontFamily: "var(--font-condensed)", color: "var(--surface-page)" }}
            >
              {awayPct}%
            </span>
          </div>
          <div
            className="flex items-center justify-end px-4"
            style={{
              width: `${homePct}%`,
              background: favouredHome ? "var(--color-vantage-amber)" : "var(--border-strong)",
            }}
          >
            <span
              className="text-lg tnum"
              style={{ fontFamily: "var(--font-condensed)", color: "var(--surface-page)" }}
            >
              {homePct}%
            </span>
          </div>
        </div>
        <div className="mt-2 flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{game.away.team}</span>
          <span>{game.home.team}</span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <Figure
          label={game.confidence === "coin_flip" ? "Model leans" : "Model picks"}
          value={game.predicted_winner}
          note={
            game.confidence === "coin_flip"
              ? "this band is 49.8% accurate, so treat it as no call"
              : undefined
          }
        />
        <Figure label="Model spread" value={game.predicted_spread_display} />
        <Figure
          label="Market spread"
          value={game.market_spread_line === null ? "n/a" : String(game.market_spread_line)}
          note={
            MARKET.market_is_better
              ? "the market forecasts these games better than this model"
              : undefined
          }
        />
      </div>
    </section>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="eyebrow" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p
        className="mt-1 text-3xl leading-none tnum"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      {note && (
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{note}</p>
      )}
    </div>
  );
}
