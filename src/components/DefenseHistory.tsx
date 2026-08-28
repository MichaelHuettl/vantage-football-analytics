import { Team } from "@/components/DefenseData";
import { DEFENSE } from "@/lib/defense";
import type { PairedRow } from "@/lib/defense";

/**
 * The historical blocks: four seasons of scoring, then the three measures the
 * sheet tracks against a fantasy finish.
 *
 * Success rate and DVOA are kept beside the finish they produced rather than
 * as standalone leaderboards, because that pairing is the only thing in the
 * sheet that shows a measure being right or wrong about a season. Reading down
 * the finish column is the point.
 */

/* ==================== four seasons of scoring ==================== */

export function HistoricFinishes() {
  const { seasons_scoring } = DEFENSE;
  const years = Object.keys(seasons_scoring).sort().reverse();
  const depth = Math.max(...years.map((y) => seasons_scoring[y].length));

  return (
    <section className="mt-16">
      <h2
        className="text-3xl uppercase tracking-wide"
        style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
      >
        Historic finishes
      </h2>
      <p className="mt-3 max-w-3xl" style={{ color: "var(--text-secondary)" }}>
        The top ten in each of the last four seasons, with total points, points
        per game and EPA per play. Read across a rank rather than down a season:
        the names change almost completely, which is the first thing worth
        knowing about the position.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm tnum" style={{ minWidth: 900 }}>
          <thead>
            <tr style={{ background: "var(--surface-sunken)" }}>
              <Th className="w-10 text-left">#</Th>
              {years.map((y) => (
                <th
                  key={y}
                  scope="col"
                  colSpan={3}
                  className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
                    color: "var(--text-muted)",
                    borderLeft: "1px solid var(--border-subtle)",
                  }}
                >
                  {y}
                </th>
              ))}
            </tr>
            <tr style={{ background: "var(--surface-sunken)" }}>
              <th />
              {years.map((y) => (
                <SubHead key={y} />
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: depth }, (_, i) => (
              <tr key={i} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td
                  className="px-3 py-1.5"
                  style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
                >
                  {i + 1}
                </td>
                {years.map((y) => {
                  const r = seasons_scoring[y][i];
                  return r ? (
                    <SeasonCells key={y} team={r.team} abbr={r.abbr} fpts={r.fpts} ppg={r.ppg} epa={r.epa} />
                  ) : (
                    <td key={y} colSpan={3} />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SubHead() {
  return (
    <>
      <th
        scope="col"
        className="px-3 py-1 text-left text-micro font-bold uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)",
          color: "var(--text-muted)",
          borderLeft: "1px solid var(--border-subtle)",
        }}
      >
        Team
      </th>
      <th
        scope="col"
        className="px-3 py-1 text-right text-micro font-bold uppercase tracking-wider"
        style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
      >
        Pts / G
      </th>
      <th
        scope="col"
        className="px-3 py-1 text-right text-micro font-bold uppercase tracking-wider"
        style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
      >
        EPA
      </th>
    </>
  );
}

function SeasonCells({
  team,
  abbr,
  fpts,
  ppg,
  epa,
}: {
  team: string;
  abbr: string | null;
  fpts: number;
  ppg: number;
  epa: string | null;
}) {
  return (
    <>
      <td className="px-3 py-1.5" style={{ borderLeft: "1px solid var(--border-subtle)" }}>
        <Team team={{ name: team, abbr }} />
      </td>
      <td className="px-3 py-1.5 text-right whitespace-nowrap">
        <span className="font-semibold">{fpts}</span>{" "}
        <span style={{ color: "var(--text-muted)" }}>/ {ppg}</span>
      </td>
      <td
        className="px-3 py-1.5 text-right whitespace-nowrap"
        style={{ color: "var(--text-secondary)" }}
      >
        {epa ?? "n/a"}
      </td>
    </>
  );
}

/* ============ a measure against the finish it produced ============ */

export function MeasureVsFinish({
  title,
  intro,
  blocks,
  valueKey,
  format,
}: {
  title: string;
  intro: string;
  blocks: Record<string, PairedRow[]>;
  valueKey: "success_rate" | "dvoa";
  format: (n: number) => string;
}) {
  const years = Object.keys(blocks).sort().reverse();

  return (
    <section className="mt-16">
      <h3
        className="text-xl uppercase tracking-wide"
        style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-display)", fontStretch: "var(--stretch-display)" }}
      >
        {title}
      </h3>
      <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
        {intro}
      </p>

      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        {years.map((y) => (
          <div key={y}>
            <p className="eyebrow mb-2">{y}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tnum" style={{ minWidth: 240 }}>
                <thead>
                  <tr style={{ background: "var(--surface-sunken)" }}>
                    <Th className="text-left">Team</Th>
                    <Th>Value</Th>
                    <Th>Finish</Th>
                  </tr>
                </thead>
                <tbody>
                  {blocks[y].map((r) => {
                    // A single-digit finish means the measure called it; a
                    // finish in the twenties means it did not.
                    const good = r.finish_rank !== null && r.finish_rank <= 10;
                    return (
                      <tr
                        key={r.team}
                        className="border-t"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        <td className="px-2 py-1.5">
                          <Team team={{ name: r.team, abbr: r.abbr }} />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {r[valueKey] !== undefined && r[valueKey] !== null
                            ? format(r[valueKey] as number)
                            : "n/a"}
                        </td>
                        <td
                          className="px-2 py-1.5 text-right font-bold"
                          style={{
                            color: good
                              ? "var(--text-primary)"
                              : "var(--color-vantage-amber)",
                          }}
                        >
                          {r.finish ?? "n/a"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
        Amber marks a season where the measure ranked a defense top ten and the
        scoring did not follow.
      </p>
    </section>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-2 py-2 text-right text-xs font-bold uppercase tracking-wider ${className}`}
      style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
