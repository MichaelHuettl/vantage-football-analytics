import { PositionBadge } from "@/components/PlayerLink";
import {
  FM_BACKTEST_EXTENT, FM_CALIBRATION, FM_CONFIG, FM_COVERAGE, FM_HIT_RATES,
  FM_METRICS, FM_POSITIONS, FM_QUALITY, FM_SPAN, FM_WINDOW, backtestFor,
  bandValue,
} from "@/lib/fantasy";
import type { Position } from "@/lib/types";

const pct = (n: number, dp = 1) => `${(Math.round(n * 100 * 10 ** dp) / 10 ** dp).toFixed(dp)}%`;

/**
 * Hit rate against margin — a bar per band, with the baseline marked on it.
 *
 * The same idiom as the season-by-season error bars further down: a track, a
 * fill, and a tick where the baseline sits, so the gap between them is the
 * thing you read rather than two numbers you have to subtract. The axis runs
 * the full 0-100% here, unlike those bars, because a percentage has a real
 * zero and a real hundred and the whole point of this chart is the shape of
 * the fall-off — which is invisible on a zoomed axis.
 */
function BandCurve({ rows }: { rows: { band: string; model: number; baseline: number }[] }) {
  return (
    <ul className="mt-4 flex max-w-3xl flex-col gap-1.5">
      {rows.map((r) => (
        <li key={r.band} className="flex items-center gap-3 text-xs">
          <span className="w-16 shrink-0 text-right tnum" style={{ color: "var(--text-muted)" }}>
            {r.band}
          </span>
          <span
            className="relative h-4 flex-1 rounded-sm"
            style={{ background: "var(--surface-sunken)" }}
            title={`${r.band}: model ${pct(r.model)}, baseline ${pct(r.baseline)}`}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{ width: `${Math.max(r.model * 100, 1)}%`, background: "var(--border-strong)" }}
            />
            <span
              className="absolute inset-y-[-2px] w-0.5"
              style={{ left: `${r.baseline * 100}%`, background: "var(--text-primary)" }}
            />
          </span>
          <span className="w-12 shrink-0 text-right tnum" style={{ fontWeight: 600 }}>
            {pct(r.model, 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}

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
  const hb = hr.headline_band;
  const st = hr.season_totals;
  const qbSeason = st.positions.find((r) => r.position === "QB");
  const teSeason = st.positions.find((r) => r.position === "TE");

  return (
    <section>
      {/* ---- the conclusion, before the evidence ---- */}
      <div className="rounded border-l-4 p-5 sm:p-6"
           style={{ borderColor: "var(--color-vantage-amber)", background: "var(--surface-sunken)" }}>
        <p className="eyebrow" style={{ color: "var(--color-vantage-amber)" }}>
          What this model is for
        </p>
        <h2 className="mt-2 text-2xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}>
          It avoids bad calls. It does not call scores.
        </h2>
        <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
          Everything below is one claim, measured {hr.season_count} different
          ways: this model beats &ldquo;assume the player keeps doing what he has
          been doing&rdquo; by a modest amount, reliably. It is a second opinion
          that is right slightly more often than the obvious assumption. The
          value is in how consistent that edge is, not how large, and a
          projection system that claimed more than this on weekly fantasy
          scoring would be describing a leak rather than a skill.
        </p>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <p className="eyebrow">What holds up</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm"
                style={{ color: "var(--text-secondary)" }}>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>
                  Start-or-sit calls.
                </strong>{" "}
                {pct(bandValue(starters, `within_${hb}`))} of startable
                player-weeks land within {hb} points of the real score, against{" "}
                {pct(bandValue(starters, `naive_within_${hb}`))} for recent form, in {hr.seasons_model_better[String(hb)]} of {hr.season_count}
                {" "}back-tested seasons, never fewer.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>
                  Not being badly wrong.
                </strong>{" "}
                The whole edge sits in the tails. The model rarely projects a
                player at fifteen who scores two, and that is worth more to a
                lineup than precision it does not have.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>
                  Kicker and defense, week to week.
                </strong>{" "}
                The largest lift of any position, because their signal is in the
                betting line for the game rather than in their own history, which is exactly what a player&rsquo;s recent form cannot see.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>
                  Ordering a position in-season.
                </strong>{" "}
                Relative ranking is far more reliable than the point estimate it
                is built from.
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">What does not</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm"
                style={{ color: "var(--text-secondary)" }}>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>
                  Precision.
                </strong>{" "}
                At a 2-point margin the model is beaten by recent form in{" "}
                {hr.season_count - hr.seasons_model_better["2"]} of{" "}
                {hr.season_count} seasons. It is not calling scores and should
                not be read as though it were.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>
                  Drafting a kicker or a defense.
                </strong>{" "}
                Draft-day rank correlation is{" "}
                {FM_QUALITY.find((q) => q.position === "K")?.draft_day_rho?.toFixed(2)}{" "}
                at kicker and{" "}
                {FM_QUALITY.find((q) => q.position === "DST")?.draft_day_rho?.toFixed(2)}{" "}
                at defense, close enough to zero that the order of those boards is not information.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>
                  A quarterback&rsquo;s season total.
                </strong>{" "}
                {pct(bandValue(qbSeason ?? {}, `within_${st.headline_band}`))}{" "}
                within {st.headline_band} points against{" "}
                {pct(bandValue(qbSeason ?? {}, `baseline_within_${st.headline_band}`))}{" "}
                for assuming he repeats himself. That gap is not worth acting on.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>
                  The floor and ceiling.
                </strong>{" "}
                The band is built to hold 80% of outcomes and holds{" "}
                {pct(Math.min(...Object.values(FM_COVERAGE)), 0)} to{" "}
                {pct(Math.max(...Object.values(FM_COVERAGE)), 0)}. Read it as
                indicative, not as a probability.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>
                  Who plays.
                </strong>{" "}
                There is no injury input. The model projects a player&rsquo;s
                rate, never his availability, and it has nothing at all to say
                about a rookie.
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-5 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>
            How much room is left.
          </strong>{" "}
          An oracle told each player&rsquo;s own season median in advance, a number no one could have, would hit{" "}
          {pct(bandValue(hr.ceiling, `within_${hb}`))} at this margin. The model
          reaches {pct(bandValue(starters, `within_${hb}`))}, or{" "}
          {pct(bandValue(hr.ceiling, `captured_${hb}`), 0)} of it. Most of what
          is knowable at this resolution has already been extracted, and the
          rest is a receiver catching a sixty-yard touchdown he was never going
          to be projected for. That is the ceiling this page is measured
          against, and it is the reason the numbers below are quoted against a
          baseline rather than against zero.
        </p>
      </div>

      <h2 className="text-3xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}>
        {FM_SPAN.from}&ndash;{FM_SPAN.to}, measured
      </h2>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        {FM_SPAN.player_weeks.toLocaleString()} player-weeks across{" "}
        {FM_SPAN.to - FM_SPAN.from + 1} seasons. The headline test is{" "}
        {FM_CONFIG.test_season}, held out entirely, but one season is an
        anecdote, so the model is also re-fitted and re-scored for each of{" "}
        {seasons.length} seasons in turn, training only on what came before it.
      </p>

      {/* ---- the benchmark ---- */}
      <div className="mt-8 rounded border-l-4 p-4 sm:p-5"
           style={{ borderColor: "var(--border-strong)", background: "var(--surface-sunken)" }}>
        <p className="eyebrow">Read this column before the others</p>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
          Weekly fantasy scoring is mostly noise. The benchmark that matters is
          not zero error, it is &ldquo;assume the player keeps doing what he has been doing&rdquo;, which is his own three-game average. Beating that by six or
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
        most because their signal is not in their own past. It is in the betting
        line for the game they are about to play.
      </p>

      {/* ---- hit rates, weekly ---- */}
      <h3 className="eyebrow mt-12">How often is it close?</h3>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Average error says how far off the model is. It does not say how often it
        is <em>about right</em>, which is the question you ask before setting a
        lineup. Across the same {hr.season_count} back-tested seasons,{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          {pct(bandValue(starters, `within_${hb}`))} of startable player-weeks
          landed within {hb} points
        </strong>{" "}
        of the real score, against{" "}
        {pct(bandValue(starters, `naive_within_${hb}`))} for recent form.
      </p>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--text-primary)" }}>Why {hb} points.</strong>{" "}
        Not because it is the band that flatters most, since that would be a wider one, but because it is where the model is furthest ahead of the
        baseline. The gap grows from four points of hit rate at a ±5 margin to
        roughly six around ±8, then stops growing: past that both are simply
        catching everything. {hb} points is also a start-or-sit tolerance rather
        than a called-the-week one, which is the decision a weekly projection is
        actually for.
      </p>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        The edge is not a sampling artifact. On the{" "}
        {hr.significance.rows.toLocaleString()} weeks scored here, the model was
        inside the band and recent form outside it{" "}
        {hr.significance.model_only.toLocaleString()} times, against{" "}
        {hr.significance.baseline_only.toLocaleString()} the other way. A split this lopsided arises by chance with probability below 1 in 10
        <sup>100</sup> (McNemar&rsquo;s test, paired on identical rows). It also
        holds in every individual season: {hr.seasons_model_better[String(hb)]} of{" "}
        {hr.season_count}. Significance was never the hard part at this sample
        size, which is why the band was chosen on the size of the edge instead.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Position</th>
              <th className="py-2 text-right">Median week</th>
              <th className="py-2 text-right">Within {hb}</th>
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
                <td className="py-2 text-right tnum" style={{ fontWeight: 600 }}>
                  {pct(bandValue(r, `within_${hb}`))}
                </td>
                <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                  {pct(bandValue(r, `naive_within_${hb}`))}
                </td>
                <td className="py-2 text-right tnum">{pct(bandValue(r, "within_10"))}</td>
                <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                  {pct(bandValue(r, "naive_within_10"))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        &ldquo;Startable&rdquo; is the top {hr.starters_per_week.QB} quarterbacks,{" "}
        {hr.starters_per_week.RB} backs, {hr.starters_per_week.WR} receivers and{" "}
        {hr.starters_per_week.TE} tight ends <em>by projection</em> that week, ranked on what the model said beforehand, never on what happened, which
        would make this a measure of hindsight. {starters.rows.toLocaleString()}{" "}
        player-weeks, every one of them out of sample. Over <em>all</em>{" "}
        {allRows.rows.toLocaleString()} player-weeks the {hb}-point figure rises
        to {pct(bandValue(allRows, `within_${hb}`))}, and that is the easier
        question rather than the better answer:{" "}
        {pct(hr.zeroes.share_of_rows)} of those rows are players who scored
        nothing and were projected near nothing.
      </p>

      {/* ---- the margin curve ---- */}
      <h3 className="eyebrow mt-12">What the margin is worth</h3>
      <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        The same startable weeks, at every margin. The bar is the model, the tick
        is recent form; the gap between them is the whole claim. It widens
        through the middle of the range and closes at both ends: at 2 points because nobody can call a week that precisely, at 10 because almost
        everybody can.
      </p>
      <BandCurve
        rows={hr.bands.map((b) => ({
          band: `±${b} pts`,
          model: bandValue(starters, `within_${b}`),
          baseline: bandValue(starters, `naive_within_${b}`),
        }))}
      />

      {/* ---- where the advantage actually is ---- */}
      <h3 className="eyebrow mt-12">The edge is in avoiding disasters, not hitting the number</h3>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Counted by season rather than pooled, the model beat recent form in{" "}
        {hr.seasons_model_better[String(hb)]} of {hr.season_count} seasons within{" "}
        {hb} points and {hr.seasons_model_better["5"]} of {hr.season_count} within
        5, but {hr.seasons_model_better["3"]} within 3, and{" "}
        {hr.seasons_model_better["2"]} within 2. Widen the band and the advantage
        is reliable; tighten it and it disappears.
      </p>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        That is a description more than a flaw. On the{" "}
        {hr.zeroes.rows.toLocaleString()} weeks a player scored nothing, a
        trailing average that has already collapsed toward zero lands within 2
        points {pct(hr.zeroes.naive_within_2)} of the time against the
        model&rsquo;s {pct(hr.zeroes.model_within_2)}, because the model regresses
        that player back up to a positive number. On the weeks a player did
        score, the two are level, at {pct(hr.zeroes.scored_model_within_2)} against{" "}
        {pct(hr.zeroes.scored_naive_within_2)}. The model earns its lift by not
        being badly wrong, which is worth more to a lineup than precision it does
        not have.
      </p>

      {/* ---- season totals ---- */}
      <h3 className="eyebrow mt-12">A season total is a different question</h3>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Everything above is one week at a time. A draft is a bet on a whole
        season, and the honest version of that question is harder than it looks, so this is measured from what the model would have said{" "}
        <em>in August</em>: its projection on each player&rsquo;s first row of the
        season, when every feature it can see comes from the year before. The
        baseline is what a drafter would otherwise assume, which is that the
        player repeats his own rate from last year.
      </p>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--text-primary)" }}>
          {pct(bandValue(st.overall, `within_${st.headline_band}`))} of seasons
          land within {st.headline_band} points
        </strong>{" "}
        of the real total, against{" "}
        {pct(bandValue(st.overall, `baseline_within_${st.headline_band}`))} for repeating last year, with an average miss of {st.overall.mae.toFixed(0)}{" "}
        points against {st.overall.baseline_mae.toFixed(0)}. Across a
        seventeen-game season that band is about two and a half points a game.
        Because season totals run an order of magnitude apart, the scale-fair
        version is worth having beside it:{" "}
        {pct(bandValue(st.overall, "within_pct_30"))} of seasons land within 30%
        of the real figure, against{" "}
        {pct(bandValue(st.overall, "baseline_within_pct_30"))}.{" "}
        {st.overall.rows.toLocaleString()} player-seasons of at least{" "}
        {st.min_games} games. The same paired test puts this gap at{" "}
        p&nbsp;&lt;&nbsp;0.0001, smaller than the weekly edge and still not chance.
      </p>
      <BandCurve
        rows={st.point_bands.map((b) => ({
          band: `±${b} pts`,
          model: bandValue(st.overall, `within_${b}`),
          baseline: bandValue(st.overall, `baseline_within_${b}`),
        }))}
      />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Position</th>
              <th className="py-2 text-right">Median season</th>
              <th className="py-2 text-right">Within {st.headline_band}</th>
              <th className="py-2 text-right">Repeat last year</th>
            </tr>
          </thead>
          <tbody>
            {st.positions.map((r) => (
              <tr key={r.position} className="border-b"
                  style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <PositionBadge position={r.position as Position} />
                  </span>
                </td>
                <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                  {r.median_total.toFixed(0)}
                </td>
                <td className="py-2 text-right tnum" style={{ fontWeight: 600 }}>
                  {pct(bandValue(r, `within_${st.headline_band}`))}
                </td>
                <td className="py-2 text-right tnum" style={{ color: "var(--text-muted)" }}>
                  {pct(bandValue(r, `baseline_within_${st.headline_band}`))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        A fixed points band is a far harder test at the positions that score
        most. {st.headline_band} points is{" "}
        {pct(st.headline_band / (qbSeason?.median_total ?? 1), 0)} of a median
        quarterback season and{" "}
        {pct(st.headline_band / (teSeason?.median_total ?? 1), 0)} of a median
        tight end&rsquo;s, which is most of why those two rows differ. The model
        is ahead of the baseline at every position here, but only just at quarterback:{" "}
        {pct(bandValue(qbSeason ?? {}, `within_${st.headline_band}`))} against{" "}
        {pct(bandValue(qbSeason ?? {}, `baseline_within_${st.headline_band}`))},
        across {qbSeason?.rows.toLocaleString()} player-seasons. Projecting a
        quarterback&rsquo;s season is close to the point where assuming he
        repeats himself is as good as anything this model knows.
      </p>
      <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--text-primary)" }}>
          Two numbers this deliberately does not quote.
        </strong>{" "}
        Summing the seventeen weekly forecasts instead gives an average miss of
        only {st.not_a_baseline.in_season_sum_mae.toFixed(0)} points, but each
        of those forecasts knew everything up to its own week, so that number
        describes a manager re-projecting all season, not a drafter in August.
        And recent form cannot be scored at this scale at all: summed over a
        year, a trailing three-game average is a lagged copy of the
        player&rsquo;s own scores and tracks his season total at r=
        {st.not_a_baseline.correlation.toFixed(2)}. It is an excellent
        description of the season and no forecast of it, which is why the
        baseline here is last year&rsquo;s rate instead.
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
                  {q.draft_day_rho === null ? "n/a" : q.draft_day_rho.toFixed(2)}
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
        August knew. At kicker and defense that figure is near zero, which is
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
        ceiling as a tighter band than advertised. Outcomes escape them nearer a third of the time than a fifth.
      </p>
    </section>
  );
}
