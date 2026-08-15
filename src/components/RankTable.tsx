import { TeamChip } from "@/components/TeamChip";
import type { LeaderRow } from "@/lib/charts";

/**
 * A ranked table where the cell carries the value's position in the range.
 *
 * Modelled on the reference sheets the operator works from, with two
 * departures that the brief requires.
 *
 * The shading is a single-hue ramp, not the red-to-green those sheets use.
 * Red-green is the one pairing about eight percent of men cannot separate, and
 * §7's floor is that colour is never the sole carrier of meaning — so the
 * number is always printed, and the ramp only sorts it faster. A second accent
 * hue is also explicitly out (§11); this ramp is built from the neutral scale,
 * which keeps amber meaning "the thing being looked at" rather than "high".
 *
 * `intensity` arrives already normalised to 0-1 by the caller from values the
 * pipeline computed. Nothing here is a metric.
 */
export function RankTable({
  rows,
  valueLabel,
  format,
  intensity,
  teamAbbr,
  highlight,
}: {
  rows: LeaderRow[];
  valueLabel: string;
  format: (row: LeaderRow) => string;
  /** 0 = bottom of the range, 1 = top. */
  intensity: (row: LeaderRow) => number;
  teamAbbr: (team: string) => string | undefined;
  /** Player to mark as the focal row. */
  highlight?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: 460 }}>
        <thead>
          <tr style={{ background: "var(--surface-sunken)" }}>
            <Th className="w-12 text-right">#</Th>
            <Th className="w-16">Team</Th>
            <Th>Back</Th>
            <Th className="w-32 text-right">{valueLabel}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const t = intensity(row);
            const on = row.name === highlight;
            return (
              <tr
                key={row.team}
                className="border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <td
                  className="px-3 py-2 text-right tnum"
                  style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
                >
                  {i + 1}
                </td>
                <td className="px-3 py-2">
                  {teamAbbr(row.team) ? (
                    <TeamChip abbr={teamAbbr(row.team)!} size="sm" />
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>{row.team}</span>
                  )}
                </td>
                <td
                  className="px-3 py-2 font-semibold"
                  style={on ? { color: "var(--color-vantage-amber)" } : undefined}
                >
                  {row.name}
                </td>
                <td
                  className="px-3 py-2 text-right font-bold tnum"
                  style={{
                    // Single-hue ramp off the ink scale. The number is always
                    // legible because the text colour flips with the fill.
                    background: `color-mix(in oklab, var(--color-ink-700) ${Math.round(t * 82)}%, transparent)`,
                    color: t > 0.55 ? "var(--color-vantage-white)" : "var(--text-primary)",
                  }}
                >
                  {format(row)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
      className={`px-3 py-2 text-left text-xs font-bold uppercase tracking-wider ${className}`}
      style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
