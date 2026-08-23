import { ChartFigure } from "@/components/ChartFigure";
import { ScatterChart } from "@/components/ScatterChart";
import Image from "next/image";
import { TE_BENCHMARK_IMAGE, TE_BENCHMARK_SIZE, TE_BOX, TE_CHARTS, TE_HISTORY, TE_SEASON } from "@/lib/charts";
import type { BoxColumn, TeChart } from "@/lib/charts";

/**
 * The tight end page, in the operator's own section order.
 *
 * Five scatters, then the history, then the check-the-box grid. Each chart is
 * followed by what it actually says (§5.2) — the caption states the takeaway,
 * the paragraph does the arguing, and the workbook's own groupings sit beside
 * it so the reader can see which names the operator filed where.
 *
 * Nothing here computes. Medians, extents, label order and placement priority
 * all arrive from te_charts.py (§11). This component projects to pixels.
 */
export function TightEndAnalysis() {
  const { routes_targets, routes_tprr, yards_tds, airyards_tprr, routes_yprr } = TE_CHARTS;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-3xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          The evidence
        </h2>
        <span className="eyebrow">{TE_SEASON} production</span>
      </div>

      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        Five pairs, each followed by what it says. The last of them is the one
        the history at the foot of the page actually turns on.
      </p>

      <Block n={1} chart={routes_targets}>
        Route participation is the chance and target share is the conversion.
        The tight ends in the top right are running the routes <em>and</em>{" "}
        drawing the looks; the ones adrift to the right of the median with
        nothing above it are on the field for a living, not for the ball.
      </Block>

      <Block n={2} chart={routes_tprr}>
        The same route count, divided differently. Target share rewards a tight
        end whose offense throws a lot; targets per route run does not care how
        often his team drops back, only how often the ball comes when he goes
        out. Where a name sits well below its position on the first chart, the
        volume was the offense&rsquo;s, not his.
      </Block>

      <Block n={3} chart={yards_tds}>
        Touchdowns are the noisiest thing a tight end does and the easiest to
        draft on. Yardage per game is close to a role measure; touchdowns are a
        role measure multiplied by the field position his offense happened to
        find. A season high on the vertical and ordinary on the horizontal is
        the one least likely to happen twice.
      </Block>

      <Block n={4} chart={airyards_tprr}>
        Air yards share says how far downfield the offense is willing to look
        for him; targets per route run says how often it looks at all. Together
        they separate the seam threat from the safety valve. Two tight ends can catch the same number of balls and be doing completely different jobs.
      </Block>

      <Block n={5} chart={routes_yprr}>
        The pair the history below actually turns on. Yards per route run is
        efficiency with the route count divided out, so it survives a change of
        offense better than yardage does; holding it against participation shows
        whether the rate came with a starter&rsquo;s workload or from a sample
        small enough to flatter anyone.
      </Block>

      {/* ===================== 6. History and the box ===================== */}
      <div className="mt-20">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h3 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            What has happened before
          </h3>
          <span className="eyebrow">{TE_HISTORY.era}</span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {TE_HISTORY.findings.map((f) => (
            <p key={f} className="max-w-3xl" style={{ color: "var(--text-secondary)" }}>
              {f}
            </p>
          ))}
        </div>

        {TE_HISTORY.rules.length > 0 && (
          <table className="mt-6 w-full max-w-3xl text-sm">
            <thead>
              <tr className="eyebrow border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <th className="py-2 text-left">The screen</th>
                <th className="py-2 text-left">Who it catches this year</th>
              </tr>
            </thead>
            <tbody>
              {TE_HISTORY.rules.map((r) => (
                <tr key={r.rule} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <td className="py-2 pr-6">{r.rule}</td>
                  <td className="py-2">{r.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-12 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h3 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            Checking the boxes
          </h3>
          <span className="eyebrow">{TE_BOX.era}</span>
        </div>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          One column per factor, each name carrying his own figure for it. The
          argument is not that any single column picks a TE1. It is that the
          same few names keep appearing column after column, measured against
          the fifteen-year averages above, and a player who clears five of six
          is not doing it by accident.
        </p>

        <figure className="mt-6">
          <Image
            src={TE_BENCHMARK_IMAGE}
            alt="Averages by fantasy finish, 2011-2025: points per game, route share, receiving yards per game, target share, first down share, air yards share and yards per route run, for TE1-3, TE4-6, TE7-9 and TE10-12."
            width={TE_BENCHMARK_SIZE?.width ?? 1202}
            height={TE_BENCHMARK_SIZE?.height ?? 504}
            sizes="(min-width: 1024px) 900px, 100vw"
            className="h-auto w-full max-w-3xl rounded border"
            style={{ borderColor: "var(--border-subtle)" }}
          />
          <figcaption className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            What each finish has actually averaged since 2011. These are the
            thresholds the columns below are measured against, so a name clearing a box is clearing the fifteen-year average for that finish. From the
            operator&rsquo;s workbook.
          </figcaption>
        </figure>

        <BoxGrid title="TE1-3" cols={TE_BOX.te1_3} />
        <BoxGrid title="TE4-6" cols={TE_BOX.te4_6} />

      </div>
    </section>
  );
}

function Block({ n, chart, children }: { n: number; chart: TeChart; children: React.ReactNode }) {
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
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
    </div>
  );
}

function BoxGrid({ title, cols }: { title: string; cols: BoxColumn[] }) {
  const depth = Math.max(...cols.map((c) => c.names.length));
  return (
    <div className="mt-6 overflow-x-auto">
      <p className="eyebrow">{title}</p>
      <table className="mt-2 w-full min-w-[640px] text-sm">
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
              {cols.map((c) => (
                <td key={c.label} className="py-2 pr-4" style={c.names[i] ? undefined : { color: "var(--text-muted)" }}>
                  {c.names[i] ?? "n/a"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
