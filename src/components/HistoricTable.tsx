import type { HistoricTable as Data } from "@/lib/charts";

/**
 * Every top-three season since 2017, all thirteen columns, with the
 * distribution as a footer.
 *
 * A table rather than a chart because the question here is not "what shape is
 * this" — it is "what did these seasons actually look like", and thirteen
 * measures do not fit on two axes. The scatter it replaces could only ever
 * show two of them.
 *
 * Emphasis is read from the data, not decided here (§11). The pipeline marks
 * each cell against its own column's quartiles, with the sense already flipped
 * for the two rank columns so that "top" always means good.
 */
export function HistoricTable({ data }: { data: Data }) {
  const { columns, seasons, distribution } = data;
  const summaryRows: [string, string][] = [
    ["median", "Median"],
    ["p25", "25th"],
    ["p75", "75th"],
    ["min", "Min"],
    ["max", "Max"],
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tnum" style={{ minWidth: 940 }}>
        <thead>
          <tr style={{ background: "var(--surface-sunken)" }}>
            <Th className="text-left">Season</Th>
            <Th className="text-left">Back</Th>
            {columns.map((c) => (
              <Th key={c.key} className="text-right">
                {c.header}
              </Th>
            ))}
          </tr>
        </thead>

        <tbody>
          {seasons.map((s, i) => {
            const newYear = i === 0 || seasons[i - 1].season !== s.season;
            return (
              <tr
                key={`${s.season}-${s.name}`}
                style={{
                  borderTop: newYear
                    ? "1px solid var(--border-strong)"
                    : "1px solid var(--border-subtle)",
                }}
              >
                <td
                  className="px-2 py-1.5"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    color: newYear ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {newYear ? s.season : ""}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 font-semibold">
                  {s.name}
                </td>
                {columns.map((c) => {
                  const v = s[c.key] as number | undefined;
                  const mark = s[`${c.key}_mark`] as string | undefined;
                  const best = s[`${c.key}_best`] as boolean | undefined;
                  const extreme = s[`${c.key}_extreme`] as boolean | undefined;
                  return (
                    <td
                      key={c.key}
                      className="px-2 py-1.5 text-right"
                      style={{
                        // Amber is the single best value in the column across
                        // nine seasons — twelve cells in the whole table, which
                        // is what §7 reserves it for.
                        color: best
                          ? "var(--color-vantage-amber)"
                          : mark === "bottom"
                            ? "var(--text-muted)"
                            : "var(--text-primary)",
                        fontWeight: best || mark === "top" ? 700 : 400,
                        background:
                          mark === "top" && !best
                            ? "color-mix(in oklab, var(--color-ink-500) 12%, transparent)"
                            : undefined,
                        textDecoration: extreme ? "underline" : undefined,
                        textUnderlineOffset: extreme ? "3px" : undefined,
                      }}
                    >
                      {v ?? "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>

        {/* The distribution stays with the rows it describes. Reading a season
            against the median is the entire point of showing 27 of them. */}
        <tfoot>
          {summaryRows.map(([key, label], i) => (
            <tr
              key={key}
              style={{
                borderTop:
                  i === 0 ? "2px solid var(--text-primary)" : "1px solid var(--border-subtle)",
                background: "var(--surface-sunken)",
              }}
            >
              <td
                className="px-2 py-1.5 text-xs uppercase tracking-wider"
                colSpan={2}
                style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
              >
                {label}
              </td>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="px-2 py-1.5 text-right"
                  style={{
                    color:
                      key === "median" ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: key === "median" ? 700 : 400,
                  }}
                >
                  {distribution[key]?.[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tfoot>
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
      className={`whitespace-nowrap px-2 py-2 text-xs font-bold uppercase tracking-wider ${className}`}
      style={{ fontFamily: "var(--font-condensed)", color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}
