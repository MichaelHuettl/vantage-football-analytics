import { ChartFigure } from "@/components/ChartFigure";
import { ScatterChart } from "@/components/ScatterChart";
import { TeamChip } from "@/components/TeamChip";
import {
  WR_CHARTS, WR_CONSISTENCY, WR_GRID, WR_GRID_COMPUTED, WR_GROUPS, WR_SEASON,
  WR_VERDICTS,
  WR_STICKINESS,
} from "@/lib/charts";
import type {
  Agreement, BoxColumn, ConsistencyGroup, StickyMetric, TdColumn, VerdictGroup,
  WrChart,
} from "@/lib/charts";
import { teamByName } from "@/lib/teams";

/**
 * The wide receiver page, in the operator's own section order.
 *
 * Three scatters, then the receivers he tracked outside the charted pool, then
 * the check-the-box grid. Each chart is followed by what it actually says
 * (§5.2) — the caption states the takeaway, the paragraph does the arguing,
 * and the workbook's own groupings sit beside it so a reader can see which
 * names he filed where.
 *
 * Nothing here computes. Medians, extents, label order and placement priority
 * all arrive from wr_charts.py (§11). This component projects to pixels.
 */
export function WideReceiverAnalysis() {
  const { targets_airyards, airyards_share, wopr_ppg } = WR_CHARTS;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-3xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          The evidence
        </h2>
        <span className="eyebrow">{WR_SEASON} production</span>
      </div>

      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Three pairs, each followed by what it says. The first two take WOPR
        apart; the third puts it back together and asks what the usage was
        actually worth.
      </p>

      <Block n={1} chart={targets_airyards}>
        Target share counts how often the ball comes; air yards count how far it
        travels when it does. They are different jobs and the same receiver
        rarely leads both. A name far to the right with nothing above the median
        is running the deep routes without being the read, a role that scores in bursts and disappears for a month.
      </Block>

      <Block n={2} chart={airyards_share}>
        The same two ideas, both now expressed as a share of one offense, which
        is what makes them comparable across teams. A receiver on a
        pass-happy offense can post big raw air yards and still own a small
        slice of them. Below the diagonal is a possession role; above it, a
        receiver his quarterback is willing to throw past the sticks.
      </Block>

      <Block n={3} chart={wopr_ppg}>
        WOPR folds both shares into one usage number, and the vertical spread at
        any given WOPR is the part of a receiver&rsquo;s scoring his usage does
        not explain. Whether that gap is worth chasing is a question about next
        season rather than this one, and the chart below measures it directly.
      </Block>

      {/* ---- what repeats ---- */}
      {WR_STICKINESS && (
        <div className="mt-16">
          <h3 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            {WR_STICKINESS.title}
          </h3>
          <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
            {WR_STICKINESS.caption}
          </p>
          <StickyBars metrics={WR_STICKINESS.metrics} />
          <p className="mt-4 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
            Spearman rank correlation between a receiver&rsquo;s season and his
            next, across {WR_STICKINESS.pairs.toLocaleString()} paired seasons
            from {WR_STICKINESS.seasons[0]} to {WR_STICKINESS.seasons[1]}, each
            requiring eight games and forty targets in both years. Rank rather
            than value, because a handful of enormous target-share seasons would
            otherwise drag the whole coefficient around.
          </p>
          <p className="mt-4 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              The chances repeat. What a receiver did with them does not.
            </strong>{" "}
            Every measure of opportunity clusters around a half, while touchdowns per target, the thing that most inflates a season line, comes back at{" "}
            {WR_STICKINESS.metrics.find((m) => m.label === "Touchdowns per target")
              ?.rho.toFixed(2)},
            which is close enough to nothing that last year&rsquo;s touchdown
            total should not be read as a forecast. Yards per target is barely
            better. That is the case for drafting the role rather than the
            production it happened to yield.
          </p>
          <p className="mt-4 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              What this does <em>not</em> show.
            </strong>{" "}
            Points per game repeats about as well as the usage underneath it,{" "}
            {WR_STICKINESS.metrics.find((m) => m.label === "PPR points per game")
              ?.rho.toFixed(2)}{" "}
            against{" "}
            {WR_STICKINESS.metrics.find((m) => m.label === "Target share")
              ?.rho.toFixed(2)}{" "}
            for target share. So this is not evidence that usage forecasts
            better than scoring does, and the page will not claim it is. It is
            evidence about efficiency, which is a narrower and more useful thing:
            the part of a season that came from a high catch rate or a run of
            end-zone looks is the part least likely to come back.
          </p>
        </div>
      )}

      {/* ---- what a week looks like ---- */}
      {WR_CONSISTENCY && (
        <div className="mt-16">
          <h3 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            {WR_CONSISTENCY.title}
          </h3>
          <div className="mt-4">
            <ChartFigure
              caption={WR_CONSISTENCY.caption}
              source={`${WR_CONSISTENCY.x_label} against ${WR_CONSISTENCY.y_label}`}
            >
              <ScatterChart series={WR_CONSISTENCY} />
            </ChartFigure>
          </div>
          <p className="mt-4 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
            Every chart above this one is a season average, and an average cannot
            tell two very different receivers apart. Keenan Allen and Ladd
            McConkey finished {WR_SEASON} within a point of each other per game.
            Allen was under five points in{" "}
            {WR_CONSISTENCY.points.find((p) => p.name === "Keenan Allen")?.x.toFixed(0)}%
            of his weeks and over twenty in{" "}
            {WR_CONSISTENCY.points.find((p) => p.name === "Keenan Allen")?.y.toFixed(0)}%;
            McConkey was{" "}
            {WR_CONSISTENCY.points.find((p) => p.name === "Ladd McConkey")?.x.toFixed(0)}%
            and{" "}
            {WR_CONSISTENCY.points.find((p) => p.name === "Ladd McConkey")?.y.toFixed(0)}%.
            Identical on every other chart here, and not remotely the same player
            to own.
          </p>
          <p className="mt-4 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
            The gap between a receiver&rsquo;s mean and his median is the same
            point made a second way. Michael Wilson averaged{" "}
            {WR_CONSISTENCY.points.find((p) => p.name === "Michael Wilson")?.ppg.toFixed(1)}{" "}
            points a game and his median week was{" "}
            {WR_CONSISTENCY.points.find((p) => p.name === "Michael Wilson")?.median.toFixed(1)}.
            The average is real; it is just not what most of his Sundays looked
            like.
          </p>

          {WR_GROUPS && (
            <div className="mt-8 rounded border-l-4 p-5 sm:p-6"
                 style={{ borderColor: "var(--color-vantage-amber)",
                          background: "var(--surface-sunken)" }}>
              <p className="eyebrow" style={{ color: "var(--color-vantage-amber)" }}>
                Where they land
              </p>
              <h4 className="mt-2 text-2xl uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-display)" }}>
                Four corners, and the one that is worth acting on
              </h4>
              <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
                The field split on its own medians, at {WR_GROUPS.medians.bust.toFixed(1)}% bust and {WR_GROUPS.medians.boom.toFixed(1)}% boom. Read these as a
                description of {WR_SEASON} rather than a forecast: better receivers
                boom more, so the corners partly re-say who scored the most. The
                cross below is the part that adds something.
              </p>
              <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                Each receiver carries his points per game, then his bust and boom rates as a pair. 6/63 is six percent of weeks under five points
                and sixty-three percent over twenty.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {WR_GROUPS.corners.map((g) => (
                  <GroupCard key={g.key} group={g} />
                ))}
              </div>

              {WR_GROUPS.usage && (
                <>
                  <h4 className="mt-8 text-2xl uppercase tracking-wide"
                      style={{ fontFamily: "var(--font-display)" }}>
                    What the usage says about it
                  </h4>
                  <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
                    Each receiver&rsquo;s WOPR from the third chart, held against
                    his boom rate. This separates two groups the boom-and-bust
                    chart cannot see on its own, and the stickiness bars are what
                    make the split worth reading: efficiency comes back at 0.17
                    to 0.25, so a receiver whose <em>role</em> survived has the
                    better claim on next season than one whose scoring arrived
                    without it. {WR_GROUPS.usage.matched} of{" "}
                    {WR_GROUPS.usage.total} receivers carry a WOPR point; the
                    rest are not placed.
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {WR_GROUPS.usage.groups.map((g) => (
                      <GroupCard key={g.key} group={g} showWopr />
                    ))}
                  </div>
                  <p className="mt-5 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
                    Neither list is a buy or a sell. A receiver can hold a large
                    role and lose it in March, and a small role can grow. What
                    the split says is narrower: of the two ways to have finished
                    a season where you did, one of them rests on the part of the
                    game that repeats and the other does not.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- the check-the-box grid ---- */}
      <div className="mt-16">
        <h3 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          Check the box
        </h3>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          The operator&rsquo;s own shortlists, one column per factor. The columns are independent, with different names and different lengths, so a row across
          the grid means nothing and is not meant to.
        </p>
        <BoxGrid title="Players" cols={WR_GRID.players} />
        <BoxGrid title="Offenses" cols={WR_GRID.teams} teams />

        {/* ---- who the grid is good and bad news for ---- */}
        {WR_VERDICTS && (
          <div className="mt-8 rounded border-l-4 p-5 sm:p-6"
               style={{ borderColor: "var(--border-strong)",
                        background: "var(--surface-sunken)" }}>
            <p className="eyebrow">Reading the grid</p>
            <h4 className="mt-2 text-2xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}>
              Who it is good and bad news for
            </h4>
            <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
              All seven columns crossed, and every one of the{" "}
              {WR_VERDICTS.counted} names in the grid sorted by which way its
              entries point. A receiver inherits his offense&rsquo;s three
              columns, because that is what they are for: a scheme is a fact
              about the situation he is walking into, and it is the part of this
              grid most likely to survive the winter. So a regression call with
              three scheme columns behind it reads very differently from one
              with none.
            </p>
            <div className="mt-5 flex flex-col gap-4">
              {WR_VERDICTS.groups.map((g) => (
                <VerdictCard key={g.key} group={g} />
              ))}
            </div>
            <p className="mt-5 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>
                One receiver clears the whole grid.
              </strong>{" "}
              Luther Burden is in three of the four player columns and all three offense columns, the only name here with every entry pointing the same way. At the other end, Amon-Ra St. Brown and Tee Higgins carry
              a regression call and nothing anywhere else arguing back.
            </p>
            <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
              This is a reading of the grid, not of the receivers. It inherits every judgement in the columns and adds none. A name is here because the operator put it in a column, and the efficiency
              columns in particular describe {WR_SEASON} rather than forecast
              anything, since yards per target comes back the following year at{" "}
              {WR_STICKINESS?.metrics.find((m) => m.label === "Yards per target")
                ?.rho.toFixed(2)}.
            </p>
          </div>
        )}

        {WR_GRID_COMPUTED && (
          <>
            <h4 className="mt-10 text-2xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}>
              Three more columns, fitted rather than judged
            </h4>
            <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
              The grid above is the operator&rsquo;s reading of {WR_SEASON}. These
              three are the same question asked of the play-by-play, and they
              exist because of the stickiness bars further up the page:
              touchdowns per target come back year over year at 0.17, but the{" "}
              <em>looks</em> that produce them are opportunity, which comes back
              at about a half. So the forecastable version of &ldquo;who
              scored&rdquo; is &ldquo;who was thrown to inside the ten&rdquo;.
            </p>
            <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
              Expected touchdowns are fitted across all{" "}
              {WR_GRID_COMPUTED.pool} qualifying receivers by field zone rather
              than assumed: an end-zone target is worth{" "}
              {WR_GRID_COMPUTED.fit.endzone.toFixed(2)} touchdowns, a red-zone
              target outside the end zone{" "}
              {WR_GRID_COMPUTED.fit.red_zone.toFixed(2)}, and everything else{" "}
              {WR_GRID_COMPUTED.fit.elsewhere.toFixed(3)}, which is most of why
              a long touchdown is the least repeatable kind. The fit explains{" "}
              {(WR_GRID_COMPUTED.fit.r2 * 100).toFixed(0)}% of the variance in
              scoring. The residual is the rest: the part a receiver&rsquo;s
              field position does not account for.{" "}
              {WR_GRID_COMPUTED.matched} of the {WR_GRID_COMPUTED.pool} appear
              on a chart on this page and are the only ones ranked here.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {WR_GRID_COMPUTED.columns.map((c) => (
                <TdCard key={c.label} column={c} />
              ))}
            </div>

            {WR_GRID_COMPUTED.agreement && (
              <div className="mt-8 rounded border-l-4 p-5 sm:p-6"
                   style={{ borderColor: "var(--border-strong)",
                            background: "var(--surface-sunken)" }}>
                <p className="eyebrow">Where the two agree</p>
                <h4 className="mt-2 text-2xl uppercase tracking-wide"
                    style={{ fontFamily: "var(--font-display)" }}>
                  A judgement and a measurement, side by side
                </h4>
                <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
                  The operator&rsquo;s two touchdown columns are a judgement
                  about next season. The fitted ones measure one specific thing
                  about the last. Publishing both and naming the difference is
                  more useful than publishing either alone, and it is the only
                  honest way to set a computed column beside a hand-written one
                  on the same grid.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {WR_GRID_COMPUTED.agreement.map((a) => (
                    <AgreementCard key={a.key} agreement={a} />
                  ))}
                </div>
                <p className="mt-5 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>
                    The clearest case they both make.
                  </strong>{" "}
                  Justin Jefferson drew sixteen end-zone targets and scored
                  twice. That is the largest shortfall in the pool by some
                  distance, and it is a shortfall in the half of scoring that does not persist: the looks were there and the finishes were not.
                </p>
                <p className="mt-3 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>
                    And the clearest place they part.
                  </strong>{" "}
                  George Pickens is on the regression list, and the fit does not
                  put him there: nine touchdowns against eighteen end-zone
                  targets is almost exactly what that many looks are worth. His
                  scoring came with the volume behind it, which is the kind that
                  survives. Davante Adams sits on both computed lists at once for the same reason in reverse. He led every receiver in end-zone looks by ten, so even scoring above expectation he is
                  a milder regression case than a raw touchdown count suggests.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/**
 * One verdict group: the receivers whose grid entries all point the same way.
 *
 * Laid out as a row of names rather than a column, because these lists run to
 * seven and the point is the group, not the ranking inside it — the order is
 * only how many columns each name appears in.
 */
function VerdictCard({ group }: { group: VerdictGroup }) {
  return (
    <div className="rounded border p-4" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">{group.label}</p>
        <span className="eyebrow tnum" style={{ color: "var(--text-muted)" }}>
          {group.members.length}
        </span>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {group.blurb}
      </p>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5">
        {group.members.map((m) => (
          <li key={m.name} className="flex items-baseline gap-2">
            <span>{m.name}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {m.tags.join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A computed touchdown column: names, and the arithmetic that ranked them. */
function TdCard({ column }: { column: TdColumn }) {
  const showResidual = column.kind !== "opportunity";
  return (
    <div className="rounded border p-4" style={{ borderColor: "var(--border-subtle)" }}>
      <p className="eyebrow">{column.label}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {column.blurb}
      </p>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {column.members.map((m) => (
          <li key={m.name} className="flex items-baseline justify-between gap-3">
            <span>{m.name}</span>
            <span className="shrink-0 text-xs tnum" style={{ color: "var(--text-muted)" }}>
              {showResidual
                ? `${m.td} vs ${m.expected_td.toFixed(1)}`
                : `${m.endzone_targets} looks`}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        {showResidual ? "touchdowns against expected" : "end-zone targets"}
      </p>
    </div>
  );
}

/**
 * One column's overlap with its computed twin.
 *
 * Three lists, not two. A name the operator has that the fit ranked and placed
 * elsewhere is a disagreement worth reading; a name the fit never saw — a
 * receiver below the volume floor, or not charted on this page — is a gap in
 * coverage, and calling that a disagreement would manufacture a dispute.
 */
function AgreementCard({ agreement }: { agreement: Agreement }) {
  const rows: [string, string[]][] = [
    ["Both", agreement.both],
    ["His list, ranked elsewhere here", agreement.workbook_disagrees],
    ["His list, outside the fit", agreement.workbook_uncovered],
    ["Fitted only", agreement.computed_only],
  ];
  return (
    <div className="rounded border p-4" style={{ borderColor: "var(--border-subtle)" }}>
      <p className="eyebrow">{agreement.label}</p>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        against &ldquo;{agreement.computed_label}&rdquo;
      </p>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        {rows.map(([label, names]) => (
          <div key={label}>
            <dt className="text-xs" style={{ color: "var(--text-muted)" }}>
              {label} ({names.length})
            </dt>
            <dd style={{ color: "var(--text-secondary)" }}>
              {names.length ? names.join(", ") : "n/a"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * One group of receivers, with the figures that put them there.
 *
 * The numbers travel with every name on purpose. A bare list of names is a
 * verdict a reader has to take on faith; the same list with each receiver's
 * points per game and his two rates is an argument they can check against the
 * scatter directly above it (§8).
 */
function GroupCard({ group, showWopr = false }: { group: ConsistencyGroup; showWopr?: boolean }) {
  return (
    <div className="rounded border p-4" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">{group.label}</p>
        <span className="eyebrow tnum" style={{ color: "var(--text-muted)" }}>
          {group.members.length}
        </span>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {group.blurb}
      </p>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {group.members.map((m) => (
          <li key={m.name} className="flex items-baseline justify-between gap-3">
            <span>{m.name}</span>
            <span className="shrink-0 text-xs tnum" style={{ color: "var(--text-muted)" }}>
              {showWopr && m.wopr !== undefined ? `${m.wopr.toFixed(2)} WOPR · ` : ""}
              {m.ppg.toFixed(1)} ppg · {m.bust.toFixed(0)}/{m.boom.toFixed(0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Year-over-year correlation, one bar per metric.
 *
 * The axis runs the full 0 to 1 deliberately. A correlation has a real ceiling
 * and the distance to it is the finding: even the stickiest thing a receiver
 * does comes back at about six tenths, so a chart zoomed to the range would
 * hide that nothing here repeats strongly.
 */
function StickyBars({ metrics }: { metrics: StickyMetric[] }) {
  return (
    <ul className="mt-5 flex max-w-3xl flex-col gap-1.5">
      {metrics.map((m) => (
        <li key={m.label} className="flex items-center gap-3 text-xs">
          {/*
            The metric and its kind share one cell, stacked. They were side by
            side at either end of the row, which at 360px made the row wider
            than the viewport and put a horizontal scrollbar on the whole page
            — the same failure the nav bar has had three times (STATE.md).
            Stacking also keeps the kind on screen at every width, so the bar's
            shade is never the only thing separating efficiency from
            opportunity (§7).
          */}
          <span className="w-28 shrink-0 text-right sm:w-44">
            <span className="block" style={{ color: "var(--text-secondary)" }}>{m.label}</span>
            <span className="eyebrow block">{m.kind}</span>
          </span>
          <span
            className="relative h-4 flex-1 rounded-sm"
            style={{ background: "var(--surface-sunken)" }}
            title={`${m.label}: ${m.rho.toFixed(3)} across ${m.pairs} paired seasons`}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{
                width: `${Math.max(m.rho * 100, 1)}%`,
                // Efficiency is the half of the argument that fails, so it is
                // drawn back rather than forward. Colour is not the only carrier
                // — the kind is written beside every bar (§7).
                background: m.kind === "efficiency"
                  ? "var(--border-subtle)"
                  : "var(--border-strong)",
              }}
            />
          </span>
          <span className="w-10 shrink-0 text-right tnum" style={{ fontWeight: 600 }}>
            {m.rho.toFixed(2)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Block({
  n,
  chart,
  children,
}: {
  n: number;
  chart: WrChart;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-16">
      <div className="flex items-baseline gap-3">
        <span className="eyebrow">{String(n).padStart(2, "0")}</span>
        <h3 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          {chart.title}
        </h3>
      </div>
      <div className="mt-4">
        <ChartFigure caption={chart.caption} source={`${chart.x_label} against ${chart.y_label}`}>
          <ScatterChart series={chart} />
        </ChartFigure>
      </div>
      <p className="mt-4 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        {children}
      </p>
      {chart.groups && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chart.groups.map((g) => (
            <div key={g.label} className="rounded border p-3" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="eyebrow">{g.label}</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {g.names.map((nm) => (
                  <li key={nm}>{nm}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {chart.notes && chart.notes.length > 0 && (
        <div className="mt-4 rounded border-l-2 pl-4" style={{ borderColor: "var(--border-strong)" }}>
          {chart.notes_label && <p className="eyebrow">{chart.notes_label}</p>}
          <ul className="mt-2 flex flex-col gap-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {chart.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * One grid, as a table. `teams` swaps each cell for a colour chip, because a
 * league of thirty-two is read faster by colour than by name — and §2 rules
 * out the mark that would otherwise do that job.
 */
function BoxGrid({
  title,
  cols,
  teams = false,
}: {
  title: string;
  cols: BoxColumn[];
  teams?: boolean;
}) {
  const depth = Math.max(...cols.map((c) => c.names.length));
  return (
    <div className="mt-6 overflow-x-auto">
      <p className="eyebrow">{title}</p>
      <table className="mt-2 w-full min-w-[620px] text-sm">
        <thead>
          <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
            {cols.map((c) => (
              <th key={c.label} className="py-2 pr-4 text-left">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: depth }).map((_, i) => (
            <tr key={i} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
              {cols.map((c) => {
                const v = c.names[i];
                const team = teams && v ? teamByName(v) : undefined;
                return (
                  <td key={c.label} className="py-2 pr-4"
                      style={v ? undefined : { color: "var(--text-muted)" }}>
                    {v ? (
                      team ? (
                        <span className="flex items-center gap-2">
                          <TeamChip abbr={team.abbr} size="sm" />
                          <span>{team.nickname}</span>
                        </span>
                      ) : (
                        v
                      )
                    ) : ( "n/a" )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
