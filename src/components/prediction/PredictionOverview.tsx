import { GAME_MARGINS as M, PRED_OVERVIEW as O } from "@/lib/predictions";

/**
 * What the model is, in numbers, before any prediction is made.
 *
 * A reader arriving at a page of forecasts has one reasonable first question —
 * how much should I trust this — and the answer is a record, not a paragraph.
 * The two comparison figures are given signed and in full: clearing the
 * home-team baseline by eleven points is the achievement, trailing the market
 * by one is the limitation, and showing only the first would be a brochure.
 */
export function PredictionOverview() {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const pp = (n: number) =>
    `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toFixed(1)} pts`;

  const items: { value: string; label: string; note?: string }[] = [
    {
      value: String(O.seasons_covered),
      label: "seasons of data",
      note: `${O.first_season}–${O.last_season}`,
    },
    {
      value: O.training_games.toLocaleString(),
      label: "games trained on",
      note: `${O.tested_games.toLocaleString()} more held back for testing`,
    },
    {
      value: pct(O.accuracy),
      label: "called correctly",
      note: "on games the model never saw",
    },
    {
      value: `±${O.calibration_drift_pts.toFixed(1)}`,
      label: "points of calibration drift",
      note: "when it says 70%, it happens about 70% of the time",
    },
  ];

  return (
    <section aria-label="Model record">
      <ul className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: "var(--border-subtle)" }}>
        {items.map((it) => (
          <li key={it.label} className="p-5 sm:p-6" style={{ background: "var(--surface-page)" }}>
            <span
              className="block leading-[0.9] tnum"
              style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)", fontSize: "clamp(2.5rem, 5vw, 3.75rem)" }}
            >
              {it.value}
            </span>
            <span className="eyebrow mt-2 block">{it.label}</span>
            {it.note && (
              <span className="mt-1 block text-xs" style={{ color: "var(--text-muted)" }}>
                {it.note}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Calibration is the number that actually improved when the training
          window widened, and it is the one a reader can use: a well-calibrated
          70% is worth more than an accurate-sounding headline. */}
      {/* Why 65% is a harder number than it sounds. Without this, a reader has
          no yardstick for the accuracy above and will judge it against 100. */}
      <div
        className="mt-px grid gap-px sm:grid-cols-3"
        style={{ background: "var(--border-subtle)" }}
      >
        {[
          { v: pct(M.within_3), l: "decided by 3 points or fewer" },
          { v: pct(M.within_7), l: "decided by 7 points or fewer" },
          { v: String(M.median_margin), l: "points, the median margin" },
        ].map((x) => (
          <div key={x.l} className="p-5 sm:p-6" style={{ background: "var(--surface-page)" }}>
            <span
              className="block leading-none tnum"
              style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}
            >
              {x.v}
            </span>
            <span className="mt-2 block text-xs" style={{ color: "var(--text-muted)" }}>
              {x.l}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-px p-5 text-sm sm:p-6" style={{ background: "var(--surface-page)", color: "var(--text-secondary)" }}>
        A quarter of NFL games come down to a field goal, which is the ceiling every
        forecaster runs into. Predicting <em>every</em> game decided by more than a
        touchdown perfectly, and coin-flipping the rest, would still only reach{" "}
        <strong className="tnum">{pct(M.perfect_above_7_ceiling)}</strong>. Across{" "}
        {M.games.toLocaleString()} games, {M.seasons[0]}–{M.seasons[1]}.
      </p>

      {/* Both comparisons, in the same breath. */}
      <div
        className="mt-px grid gap-px sm:grid-cols-2"
        style={{ background: "var(--border-subtle)" }}
      >
        <p className="p-5 text-sm sm:p-6" style={{ background: "var(--surface-page)" }}>
          <strong className="tnum">{pp(O.over_home_baseline)}</strong> better than always
          picking the home team ({pct(O.home_baseline)}), the baseline it was built to beat.
        </p>
        <p className="p-5 text-sm sm:p-6" style={{ background: "var(--surface-page)" }}>
          <strong className="tnum">{pp(O.vs_market)}</strong> against the betting market
          ({pct(O.market_baseline)}). The market is the better forecaster, and this page
          does not pretend otherwise.
        </p>
      </div>
    </section>
  );
}
