import { ChartFigure } from "@/components/ChartFigure";
import { ScatterChart } from "@/components/ScatterChart";
import {
  QB_CHARTS, QB_CORR, QB_COUNTS, QB_PER_ATTEMPT, QB_RUSHING_TABLE, QB_SEASON,
} from "@/lib/charts";
import type { QbScatter } from "@/lib/charts";

/**
 * The quarterback page.
 *
 * Four arguments, each with the chart it rests on. Every number quoted in the
 * prose comes from the JSON — the correlations, the counts, the per-attempt
 * coefficients — because a paragraph that hard-codes "+0.56" is a metric living
 * in a component (§11) and will be wrong the first time the source changes.
 *
 * The page states its own limits at the top. This is one season of 37 passers,
 * not a fifteen-year study like the tight end page, and a correlation from a
 * single year describes what happened rather than what holds.
 */
export function QuarterbackAnalysis() {
  const { rushing, scrambles, efficiency, environment } = QB_CHARTS;
  const r = (k: string) => fmt(QB_CORR[k]);
  const n = (k: string) => QB_COUNTS[k] ?? 0;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-3xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          The evidence
        </h2>
        <span className="eyebrow">{QB_SEASON} production</span>
      </div>

      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Four charts, each followed by what it says. One caution first, because it
        governs all of them: this is a single season of {n("ypa")} passers. The
        tight end page can lean on fifteen years; this cannot. Everything below
        describes what happened in {QB_SEASON}, which is evidence, not a law.
      </p>

      <Block
        n={1}
        title="A carry is worth more than a completion"
        chart={rushing}
        stat={`r = ${r("rush")} across ${n("rush")} quarterbacks`}
      >
        Rushing attempts track scoring at {r("rush")}, and the per-attempt
        arithmetic is the striking part: holding passing volume constant, a rush
        attempt is worth{" "}
        <strong>{QB_PER_ATTEMPT?.ratio ?? "several"} times</strong> a pass
        attempt ({QB_PER_ATTEMPT?.rush} points per carry against{" "}
        {QB_PER_ATTEMPT?.pass} per throw, {QB_PER_ATTEMPT?.n} quarterbacks). That
        is the whole case for drafting the runners: they collect the same points
        as everyone else and are handed a second, denser source of them.
      </Block>

      <RushingTable />

      <Block
        n={2}
        title="It is the number of scrambles, not the rate"
        chart={scrambles}
        stat={`scrambles r = ${r("scrambles")} · scramble rate r = ${r("scramble_pct")}`}
      >
        The workbook charts scramble <em>rate</em>, and it is close to useless at{" "}
        {r("scramble_pct")}. The count of scrambles is a different matter at{" "}
        {r("scrambles")}. A rate says how often a quarterback takes off when he drops back, and says nothing about how often he drops back. Designed
        carries land in between at {r("designed")}. The lesson is not that one
        kind of run is better; it is that a percentage discards the volume that
        makes the runs worth having.
      </Block>

      <Block
        n={3}
        title="The best quarterback and the best fantasy quarterback are different players"
        chart={efficiency}
        stat={`r = ${r("epa")} · points per dropback r = ${r("fpts_per_db")}`}
      >
        Efficiency per dropback is the strongest single passing signal here at{" "}
        {r("epa")}, and it still leaves the position badly split. Jordan Love
        posted the second-best EPA per dropback in the set and finished outside
        the top twelve in scoring; Justin Herbert and Bo Nix were near the bottom
        of it and both cleared 17.9 points a game. Efficiency describes how well
        a man plays. Fantasy scoring is efficiency multiplied by how much he is
        asked to do, and the multiplication is where drafts are won.
      </Block>

      <Block
        n={4}
        title="A pass-happy offense is a weaker signal than it sounds"
        chart={environment}
        stat={`r = ${fmt(environment.r)} across 30 teams`}
      >
        Team pass rate over expected explains far less of quarterback scoring
        than its prominence suggests. The reason sits in the bottom-left of the
        chart: Buffalo, Philadelphia and Chicago all throw less than expected and
        all produced top-eight scoring, because their quarterbacks ran. A
        run-heavy team is not a quarterback-proof team when the quarterback is
        the run.
      </Block>

    </section>
  );
}

/**
 * The 2025 rushing lines behind chart 1.
 *
 * The scatter shows the relationship; this shows the rows it is drawn from, so
 * a reader can check a name rather than take the trend on faith. Ordered by
 * yards, because that is the column the eye goes to first.
 */
function RushingTable() {
  if (QB_RUSHING_TABLE.length === 0) return null;
  return (
    <div className="mt-8 max-w-3xl">
      <h4 className="eyebrow">2025 quarterback rushing</h4>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[440px] text-sm">
          <thead>
            <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="py-2 text-left">Quarterback</th>
              <th className="py-2 text-right">Attempts</th>
              <th className="py-2 text-right">Yards</th>
              <th className="py-2 text-right">TDs</th>
            </tr>
          </thead>
          <tbody>
            {QB_RUSHING_TABLE.map((row) => (
              <tr key={row.name} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2">{row.name}</td>
                <td className="py-2 text-right tnum">{row.att}</td>
                <td className="py-2 text-right tnum">{row.yards}</td>
                <td className="py-2 text-right tnum">{row.tds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(v: number | null | undefined) {
  return v === null || v === undefined ? "n/a" : (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
}

function Block({
  n, title, chart, stat, children,
}: {
  n: number;
  title: string;
  chart: QbScatter;
  stat: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-16">
      <div className="flex items-baseline gap-3">
        <span className="eyebrow">{String(n).padStart(2, "0")}</span>
        <h3 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h3>
      </div>
      <p className="mt-1 eyebrow" style={{ color: "var(--text-muted)" }}>{stat}</p>
      <div className="mt-4">
        <ChartFigure caption={chart.caption} source={`${chart.x_label} against ${chart.y_label}`}>
          <ScatterChart series={chart} />
        </ChartFigure>
      </div>
      <p className="mt-4 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        {children}
      </p>
    </div>
  );
}
