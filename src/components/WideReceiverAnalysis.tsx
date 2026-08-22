import { ChartFigure } from "@/components/ChartFigure";
import { ScatterChart } from "@/components/ScatterChart";
import { TeamChip } from "@/components/TeamChip";
import { WR_CHARTS, WR_GRID, WR_NOTABLE, WR_SEASON } from "@/lib/charts";
import type { BoxColumn, WrChart } from "@/lib/charts";
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
        is running the deep routes without being the read — a role that scores
        in bursts and disappears for a month.
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
        not explain. That gap is the whole argument for buying the usage rather
        than the points: opportunity is far stickier year to year than the
        efficiency sitting on top of it.
      </Block>

      {/* ---- tracked, but outside the charted pool ---- */}
      <div className="mt-16">
        <h3 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          {WR_NOTABLE.label}
        </h3>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          Receivers tracked but outside the charted pool, so they carry no point
          on the scatters above. Several are written as the operator writes them
          — a surname where the sheet never spells the name out in full anywhere
          else. Filling those in would mean guessing which player was meant.
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {WR_NOTABLE.names.map((n) => (
            <li key={n} className="rounded border px-2 py-1"
                style={{ borderColor: "var(--border-subtle)" }}>
              {n}
            </li>
          ))}
        </ul>
      </div>

      {/* ---- the check-the-box grid ---- */}
      <div className="mt-16">
        <h3 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          Check the box
        </h3>
        <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
          The operator&rsquo;s own shortlists, one column per factor. The columns
          are independent — different names, different lengths — so a row across
          the grid means nothing and is not meant to.
        </p>
        <BoxGrid title="Players" cols={WR_GRID.players} />
        <BoxGrid title="Offenses" cols={WR_GRID.teams} teams />
      </div>
    </section>
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
                    ) : (
                      "—"
                    )}
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
