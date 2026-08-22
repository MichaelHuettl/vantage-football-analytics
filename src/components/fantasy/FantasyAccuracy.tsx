import { PositionBadge } from "@/components/PlayerLink";
import {
  FM_BACKTEST_EXTENT, FM_CALIBRATION, FM_CONFIG, FM_COVERAGE, FM_HIT_RATES,
  FM_METRICS, FM_POSITIONS, FM_QUALITY, FM_SPAN, FM_WINDOW, backtestFor,
} from "@/lib/fantasy";
import type { Position } from "@/lib/types";

const pct = (n: number, dp = 1) => `${(Math.round(n * 100 * 10 ** dp) / 10 ** dp).toFixed(dp)}%`;

/**
 * What the model is worth, measured twenty different ways.
 *
 * The section is ordered so the benchmark comes before the score. A projection
 * model's accuracy is meaningless as a bare number — three points of average
 * error sounds excellent until you learn that assuming a player repeats his
 * three-game average gets within three and a half. Every figure here is quoted
 * against that baseline.
 */
export function FantasyAccuracy() {
  const seasons = [...new Set(backtestFor("WR").map((r) => r.season))];
  const span = FM_BACKTEST_EXTENT;
  const hr = FM_HIT_RATES;
  const starters = hr.overall.starters;
  const allRows = hr.overall.all;

  return (
    <section>
      <h2 className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}>
        {FM_SPAN.from}&ndash;{FM_SPAN.to}, measured
      </h2>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        {FM_SPAN.player_weeks.toLocaleString()} player-weeks across{" "}
        {FM_SPAN.to - FM_SPAN.from + 1} seasons. The headline test is{" "}
        {FM_CONFIG.test_season}, held out entirely — but one season is an
        anecdote, so the model is also re-fitted and re-scored for each of{" "}
        {seasons.length} seasons in turn, training only on what came before it.
      </p>

      {/* ---- the benchmark ---- */}
      <div className="mt-8 rounded border-l-4 p-4 sm:p-5"
           style={{ borderColor: "var(--color-vantage-amber)", background: "var(--surface-sunken)" }}>
        <p className="eyebrow" style={{ color: "var(--color-vantage-amber)" }}>
          Read this column before the others
        </p>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
          Weekly fantasy scoring is mostly noise. The benchmark that matters is
          not zero error, it is &ldquo;assume the player keeps doing what he has
          been doing&rdquo; — his own three-game average. Beating that by six or
          seven percent at the skill positions is the honest result for this
          problem, and it is roughly what published projection systems manage.
          Anything dramatically better would mean a leak, not skill.
        </p>
      </div>

      {/* ---- per-position back-test ---- */}
      <h3 className="eyebrow mt-12">Average error across {seasons.length} back-tested seasons</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Position</th>
              <th className="py-2 text-right">Model error</th>
              <th className="py-2 text-right">Recent-form error</th>
              <th className="py-2 text-right">Better by</th>
              <th className="py-2 text-right">{FM_CONFIG.test_season} season totals</th>
            </tr>
          </thead>
          <tbody>
            {FM_POSITIONS.map((pos) => {
              const m = FM_METRICS[pos];
              if (!m) return null;
              return (
                <tr key={pos} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      <PositionBadge position={pos as Position} />
                    </span>
                  </td>
                  <td className="py-2 text-right tnum">{m.backtest_mae.toFixed(2)}</td>
                  <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                    {m.backtest_naive.toFixed(2)}
                  </td>
                  <td className="py-2 text-right tnum" style={{ fontWeight: 600 }}>
                    {pct(m.backtest_lift)}
                  </td>
                  <td className="py-2 text-right tnum">±{m.season_total_mae.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Errors are points per game. Season totals are far more accurate than the
        weekly figures suggest, because week-to-week errors are largely
        independent and cancel across seventeen games. Kicker and defense gain
        most because their signal is not in their own past — it is in the betting
        line for the game they are about to play.
      </p>

      {/* ---- hit rates ---- */}
      <h3 className="eyebrow mt-12">How often is it close?</h3>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Average error says how far off the model is. It does not say how often it
        is <em>about right</em>, which is the question you ask before setting a
        lineup. Across the same {hr.season_count} back-tested seasons,{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          {pct(starters.within_10)} of startable player-weeks landed within 10
          points
        </strong>{" "}
        of the real score, against {pct(starters.naive_within_10)} for recent
        form. Within 5 points it is {pct(starters.within_5)} against{" "}
        {pct(starters.naive_within_5)}.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Position</th>
              <th className="py-2 text-right">Median week</th>
              <th className="py-2 text-right">Within 5</th>
              <th className="py-2 text-right">Recent form</th>
              <th className="py-2 text-right">Within 10</th>
              <th className="py-2 text-right">Recent form</th>
            </tr>
          </thead>
          <tbody>
            {hr.positions.map((r) => (
              <tr key={r.position} className="border-b"
                  style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <PositionBadge position={r.position as Position} />
                  </span>
                </td>
                <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                  {r.median_actual.toFixed(1)}
                </td>
                <td className="py-2 text-right tnum">{pct(r.within_5)}</td>
                <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                  {pct(r.naive_within_5)}
                </td>
                <td className="py-2 text-right tnum" style={{ fontWeight: 600 }}>
                  {pct(r.within_10)}
                </td>
                <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                  {pct(r.naive_within_10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        &ldquo;Startable&rdquo; is the top {hr.starters_per_week.QB} quarterbacks,{" "}
        {hr.starters_per_week.RB} backs, {hr.starters_per_week.WR} receivers and{" "}
        {hr.starters_per_week.TE} tight ends <em>by projection</em> that week —
        ranked on what the model said beforehand, never on what happened, which
        would make this a measure of hindsight. {starters.rows.toLocaleString()}{" "}
        player-weeks. Every row is out of sample: each season is predicted by a
        model trained only on the years before it.
      </p>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Over <em>all</em> {allRows.rows.toLocaleString()} player-weeks the figure
        is {pct(allRows.within_10)} rather than {pct(starters.within_10)}, and
        that is the easier question, not the better answer.{" "}
        {pct(hr.zeroes.share_of_rows)} of those rows are players who scored
        nothing and were projected near nothing — correct calls that cost nobody
        a decision. The number above excludes them on purpose.
      </p>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        A band is also not the same test at every position. Ten points covers{" "}
        {pct(hr.positions.find((r) => r.position === "K")?.within_10 ?? 0)} of
        kicker weeks because a kicker&rsquo;s entire range is about that wide,
        which is why the median week sits next to each rate.
      </p>

      {/* ---- where the advantage actually is ---- */}
      <h3 className="eyebrow mt-12">The edge is in avoiding disasters, not hitting the number</h3>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Widen the band and the model wins every year; tighten it and the
        advantage disappears. It beat recent form in{" "}
        {hr.seasons_model_better["10"]} of {hr.season_count} seasons within 10
        points and {hr.seasons_model_better["5"]} of {hr.season_count} within 5 —
        but only {hr.seasons_model_better["3"]} within 3, and{" "}
        {hr.seasons_model_better["2"]} within 2.
      </p>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        That is not a flaw so much as a description. On the{" "}
        {hr.zeroes.rows.toLocaleString()} weeks a player scored nothing, a
        trailing average that has already collapsed toward zero lands within 2
        points {pct(hr.zeroes.naive_within_2)} of the time against the
        model&rsquo;s {pct(hr.zeroes.model_within_2)}, because the model regresses
        that player back up to a positive number. On the weeks a player did
        score, the two are level — {pct(hr.zeroes.scored_model_within_2)} against{" "}
        {pct(hr.zeroes.scored_naive_within_2)}. The model earns its lift by not
        being badly wrong, which is worth more to a lineup than precision it
        does not have.
      </p>

      {/* ---- season by season ---- */}
      <h3 className="eyebrow mt-12">Season by season</h3>
      <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Each bar is one season&rsquo;s average error for that position, with the
        recent-form baseline marked. Shorter is better; the marker sitting to the
        right of the bar is the model beating the baseline that year. The scale
        starts at {span.min.toFixed(1)} rather than zero, because every season
        lands between {span.min.toFixed(1)} and {span.max.toFixed(1)} and a full
        axis would draw twenty identical bars.
      </p>
      <div className="mt-5 flex flex-col gap-8">
        {FM_POSITIONS.map((pos) => {
          const rows = backtestFor(pos);
          if (rows.length === 0) return null;
          const range = span.max - span.min || 1;
          return (
            <div key={pos}>
              <div className="flex items-center gap-3">
                <PositionBadge position={pos as Position} />
                <span className="eyebrow">{rows.length} seasons</span>
              </div>
              <ul className="mt-3 flex flex-col gap-1">
                {rows.map((r) => {
                  const w = ((r.mae - span.min) / range) * 100;
                  const bw = ((r.naive - span.min) / range) * 100;
                  return (
                    <li key={r.season} className="flex items-center gap-3 text-xs">
                      <span className="w-10 shrink-0 tnum" style={{ color: "var(--text-muted)" }}>
                        {r.season}
                      </span>
                      <span className="relative h-3.5 flex-1 rounded-sm"
                            style={{ background: "var(--surface-sunken)" }}
                            title={`${pos} ${r.season}: model ${r.mae.toFixed(2)}, baseline ${r.naive.toFixed(2)}`}>
                        <span className="absolute inset-y-0 left-0 rounded-sm"
                              style={{ width: `${Math.max(w, 1)}%`, background: "var(--border-strong)" }} />
                        <span className="absolute inset-y-[-2px] w-0.5"
                              style={{ left: `${bw}%`, background: "var(--text-primary)" }} />
                      </span>
                      <span className="w-12 shrink-0 text-right tnum">{r.mae.toFixed(2)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ---- does old data help ---- */}
      <h3 className="eyebrow mt-12">Does the old data help?</h3>
      <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Football in {FM_SPAN.from} is not football in {FM_SPAN.to}, so training on
        all of it is a choice that has to be justified rather than assumed. Both
        were run across the same back-tested seasons:
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Position</th>
              <th className="py-2 text-right">All history</th>
              <th className="py-2 text-right">Last 5 seasons only</th>
              <th className="py-2 text-right">Difference</th>
            </tr>
          </thead>
          <tbody>
            {FM_WINDOW.map((r) => (
              <tr key={r.position} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2"><PositionBadge position={r.position as Position} /></td>
                <td className="py-2 text-right tnum" style={{ fontWeight: 600 }}>
                  {r.all_history.toFixed(3)}
                </td>
                <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                  {r.window_5.toFixed(3)}
                </td>
                <td className="py-2 text-right tnum">+{r.difference.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        All history wins at every position. The margins are small, but they are
        consistent and they point the same way, so the model trains on everything
        it has. The extra seasons buy more than the era drift costs.
      </p>

      {/* ---- ranking quality ---- */}
      <h3 className="eyebrow mt-12">Ordering, which is what a ranking is for</h3>
      <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Average error measures distance. A ranking is used to sort players, so
        the thing to measure is order. These are rank correlations against how
        the {FM_CONFIG.test_season} season actually finished.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Position</th>
              <th className="py-2 text-right">Players</th>
              <th className="py-2 text-right">Week by week</th>
              <th className="py-2 text-right">From August only</th>
              <th className="py-2 text-right">Top 12 hit</th>
            </tr>
          </thead>
          <tbody>
            {FM_QUALITY.map((q) => (
              <tr key={q.position} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2"><PositionBadge position={q.position as Position} /></td>
                <td className="py-2 text-right tnum">{q.players}</td>
                <td className="py-2 text-right tnum" style={{ fontWeight: 600 }}>
                  {q.in_season_rho.toFixed(2)}
                </td>
                <td className="py-2 text-right tnum">
                  {q.draft_day_rho === null ? "—" : q.draft_day_rho.toFixed(2)}
                </td>
                <td className="py-2 text-right tnum">{q.top12_hit}/12</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        <strong>The two middle columns answer different questions and only the
        second is a draft.</strong> The first sums seventeen weekly forecasts,
        each allowed to use everything known up to that week, so it follows a
        back who takes over a backfield in October. The second projects from a
        player&rsquo;s first week of the season, when the model knows only what
        August knew. At kicker and defense that figure is near zero — which is
        not a flaw in the model but the reason those positions are streamed
        rather than drafted, stated as a number.
      </p>

      {/* ---- calibration ---- */}
      <h3 className="eyebrow mt-12">Is a projection of twelve worth twelve?</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Projected band</th>
              <th className="py-2 text-right">Player-weeks</th>
              <th className="py-2 text-right">Mean projected</th>
              <th className="py-2 text-right">Mean actual</th>
            </tr>
          </thead>
          <tbody>
            {FM_CALIBRATION.map((c) => (
              <tr key={c.band} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2">{c.band}</td>
                <td className="py-2 text-right tnum">{c.players.toLocaleString()}</td>
                <td className="py-2 text-right tnum">{c.projected.toFixed(2)}</td>
                <td className="py-2 text-right tnum">{c.actual.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Close to honest across the range, running a quarter of a point optimistic
        in the middle. The top band is the exception, and it is the one where
        over-projection is most tempting to trust.
      </p>

      <h3 className="eyebrow mt-10">The floor and ceiling are narrower than they claim</h3>
      <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        They are tenth and ninetieth percentile fits, so they should contain 80%
        of outcomes. Measured on {FM_CONFIG.test_season}, most positions fall
        short:
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {FM_POSITIONS.map((pos) => {
          const c = FM_COVERAGE[pos];
          if (c === undefined) return null;
          return (
            <li key={pos} className="flex items-center gap-3 text-sm">
              <span className="w-14 shrink-0"><PositionBadge position={pos as Position} /></span>
              <span className="relative h-4 flex-1 rounded-sm"
                    style={{ background: "var(--surface-sunken)" }}>
                <span className="absolute inset-y-0 left-0 rounded-sm"
                      style={{ width: `${c * 100}%`, background: "var(--border-strong)" }} />
                <span className="absolute inset-y-[-3px] w-0.5"
                      style={{ left: "80%", background: "var(--text-primary)" }} />
              </span>
              <span className="w-16 shrink-0 text-right tnum">{pct(c)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        The marker sits at the 80% the range claims. Treat the published floor and
        ceiling as a tighter band than advertised — outcomes escape them nearer a
        third of the time than a fifth.
      </p>
    </section>
  );
}
