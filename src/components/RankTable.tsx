import { TeamChip } from "@/components/TeamChip";
import type { LeaderRow } from "@/lib/charts";

/**
 * A ranked table where the cell carries the value's position in the range.
 *
 * Modelled on the reference sheets the operator works from, and shaded
 * red-to-green at his request.
 *
 * The ramp is built from the four status tokens rather than pure red and
 * green. They already run red, orange, olive, green, and they vary in
 * lightness as well as hue — which is what keeps the scale readable for the
 * ~8% of men who cannot separate red from green, since a dark cell still reads
 * as dark. §7's floor holds regardless: the number is printed in every cell,
 * so the colour only sorts it faster and never carries the meaning alone.
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
                  style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
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
                    background: ramp(t),
                    color: "var(--color-vantage-white)",
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

/**
 * Red at the bottom of the range through to green at the top, in three steps
 * across the four status tokens. Mixing in oklab keeps the midpoints from
 * going muddy the way a straight RGB interpolation between red and green does.
 * Every stop is dark enough to carry white text, so the number stays legible
 * at any value rather than flipping colour halfway up the table.
 */
function ramp(t: number): string {
  const stops = [
    "var(--color-status-out)",
    "var(--color-status-doubtful)",
    "var(--color-status-questionable)",
    "var(--color-status-full)",
  ];
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const pct = Math.round((scaled - i) * 100);
  return `color-mix(in oklab, ${stops[i + 1]} ${pct}%, ${stops[i]})`;
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
      style={{ fontFamily: "var(--font-condensed)", fontStretch: "var(--stretch-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
